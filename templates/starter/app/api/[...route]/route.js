import { matchRoute } from "@premast/site-core";
import { siteConfig } from "@/site.config";

export const runtime = "nodejs";

export async function GET(request) {
  return matchRoute(siteConfig, "GET", request);
}

export async function POST(request) {
  return matchRoute(siteConfig, "POST", request);
}

export async function PATCH(request) {
  return matchRoute(siteConfig, "PATCH", request);
}

export async function DELETE(request) {
  return matchRoute(siteConfig, "DELETE", request);
}
