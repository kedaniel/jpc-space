import { type NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";

import { getCurrentUser } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";

interface Params {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { path } = await params;
  const storagePath = path.join("/");

  const storage = getStorage();
  const stream = await storage.get(storagePath).catch(() => null);
  if (!stream) return new NextResponse("Not found", { status: 404 });

  const ext = storagePath.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  const contentType = mimeMap[ext] ?? "application/octet-stream";

  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
  });
}
