import { NextResponse } from "next/server";

/**
 * CORS headers for the mobile client. Set MOBILE_APP_ORIGIN in production to the
 * app's origin; defaults to "*" for local development.
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": process.env.MOBILE_APP_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status, headers: CORS_HEADERS });
}

export function apiError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status, headers: CORS_HEADERS });
}

export function apiPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
