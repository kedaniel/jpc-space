import type { NextRequest } from "next/server";
import { z } from "zod";

import { rotateRefreshToken } from "@/lib/auth/tokens";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";

export const runtime = "nodejs";

const schema = z.object({ refreshToken: z.string().min(1) });

export function OPTIONS() {
  return apiPreflight();
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("bad_request", "Invalid JSON body.", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("bad_request", "refreshToken is required.", 400);

  const session = await rotateRefreshToken(parsed.data.refreshToken, request.headers.get("user-agent"));
  if (!session) return apiError("invalid_token", "Refresh token is invalid or expired.", 401);

  return apiOk(session);
}
