import { hashPassword, verifyPassword } from "../../auth/password.js";
import { createSessionCookie, getSessionFromRequest, clearSessionCookie } from "../../auth/session.js";

function sanitizeUser(user) {
  const { passwordHash, ...rest } = user.toObject ? user.toObject() : user;
  return rest;
}

export async function login(request, _params, { connectDB }) {
  await connectDB();
  const { User } = await import("../../db/models/User.js");
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return Response.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const cookie = await createSessionCookie({
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return new Response(JSON.stringify({ data: sanitizeUser(user) }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
    },
  });
}

export async function logout(_request, _params) {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearSessionCookie(),
    },
  });
}

export async function me(request, _params, { connectDB }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  await connectDB();
  const { User } = await import("../../db/models/User.js");
  const user = await User.findById(session.sub).lean();
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Set-Cookie": clearSessionCookie() },
    });
  }

  const { passwordHash, ...safe } = user;
  return Response.json({ data: safe });
}

export async function status(_request, _params, { connectDB }) {
  await connectDB();
  const { User } = await import("../../db/models/User.js");
  const count = await User.countDocuments();
  return Response.json({ data: { setupComplete: count > 0, userCount: count } });
}

export async function setup(request, _params, { connectDB }) {
  await connectDB();
  const { User } = await import("../../db/models/User.js");

  const count = await User.countDocuments();
  if (count > 0) {
    return Response.json({ error: "Setup already complete" }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, name } = body;

  if (!email || !password || !name) {
    return Response.json({ error: "name, email, and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, name, role: "super_admin" });

  const cookie = await createSessionCookie({
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return new Response(JSON.stringify({ data: sanitizeUser(user) }), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
    },
  });
}

export async function changePassword(request, _params, { connectDB, session }) {
  await connectDB();
  const { User } = await import("../../db/models/User.js");
  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return Response.json({ error: "currentPassword and newPassword are required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return Response.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const user = await User.findById(session.sub);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return Response.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  return Response.json({ data: { ok: true } });
}

export async function listUsers(_request, _params, { connectDB }) {
  await connectDB();
  const { User } = await import("../../db/models/User.js");
  const users = await User.find({}, "-passwordHash").sort({ createdAt: -1 }).lean();
  return Response.json({ data: users });
}

export async function createUser(request, _params, { connectDB }) {
  await connectDB();
  const { User } = await import("../../db/models/User.js");
  const body = await request.json();
  const { email, name, role, password } = body;

  if (!email || !name || !password) {
    return Response.json({ error: "email, name, and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const validRoles = ["super_admin", "editor"];
  if (role && !validRoles.includes(role)) {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash, name, role: role || "editor" });
    return Response.json({ data: sanitizeUser(user) }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "Email already exists" }, { status: 409 });
    }
    throw err;
  }
}

export async function updateUser(request, params, { connectDB, session }) {
  await connectDB();
  const { User } = await import("../../db/models/User.js");
  const body = await request.json();
  const { name, role } = body;

  if (params.id === session.sub) {
    return Response.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const update = {};
  if (name) update.name = name;
  if (role) {
    const validRoles = ["super_admin", "editor"];
    if (!validRoles.includes(role)) {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }
    update.role = role;
  }

  const user = await User.findByIdAndUpdate(params.id, update, { returnDocument: "after" }).lean();
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { passwordHash, ...safe } = user;
  return Response.json({ data: safe });
}

export async function deleteUser(_request, params, { connectDB, session }) {
  await connectDB();
  const { User } = await import("../../db/models/User.js");

  if (params.id === session.sub) {
    return Response.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const user = await User.findByIdAndDelete(params.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  return Response.json({ data: { ok: true } });
}
