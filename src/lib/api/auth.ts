import type { NextRequest } from "next/server";

import { verifyAccessToken } from "@/lib/auth/tokens";
import { apiError } from "@/lib/api/response";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import type { SessionUser } from "@/lib/rbac";

/** Resolve the SessionUser from a Bearer access token, or null. */
export async function getApiUser(request: NextRequest): Promise<SessionUser | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  return verifyAccessToken(token);
}

type AuthedHandler = (request: NextRequest, user: SessionUser) => Promise<Response> | Response;

/** Wrap an API route so it only runs for an authenticated user, mapping known errors to JSON. */
export function withApiAuth(handler: AuthedHandler) {
  return async (request: NextRequest): Promise<Response> => {
    const user = await getApiUser(request);
    if (!user) return apiError("unauthorized", "Missing or invalid access token.", 401);
    try {
      return await handler(request, user);
    } catch (err) {
      if (err instanceof ForbiddenError) return apiError("forbidden", "You don't have access to this.", 403);
      if (err instanceof UnauthorizedError) return apiError("unauthorized", "Not authenticated.", 401);
      console.error("[api] handler error:", err);
      return apiError("server_error", "Something went wrong.", 500);
    }
  };
}
