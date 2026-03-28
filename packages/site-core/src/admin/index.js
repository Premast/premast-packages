// Layout & sidebar
export { AdminAppLayout } from "./components/AdminAppLayout.jsx";
export { AdminSidebar } from "./components/AdminSidebar.jsx";

// Puck config context (client-safe)
export { PuckConfigProvider, usePuckConfig } from "./PuckConfigContext.jsx";

// Auth components
export { AuthWrapper } from "./components/auth/AuthWrapper.jsx";
export { LoginPage } from "./components/auth/LoginPage.jsx";
export { SetupPage } from "./components/auth/SetupPage.jsx";

// Admin page resolver (used by the catch-all route)
export { resolveAdminPage } from "./resolve-page.js";

// Theme
export { defaultAdminTokens, mergeAdminTokens } from "./admin-theme.js";
