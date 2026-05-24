import { NextResponse } from "next/server";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { isSuper, isMentor } from "@/lib/rbac";
import { loadReportsData, toCsv } from "@/lib/reports-query";

export async function GET(request: Request) {
  const user = await getCurrentUserOrRedirect();
  const url = new URL(request.url);
  const seasonIdParam = url.searchParams.get("season");

  // Resolve scope from role.
  let seasonIds: number[] = [];
  if (seasonIdParam) {
    const id = Number(seasonIdParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid season." }, { status: 400 });
    }
    if (!isSuper(user) && !isMentor(user) && !user.seasonAdminIds.includes(id)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    seasonIds = [id];
  } else if (isSuper(user) || isMentor(user)) {
    seasonIds = [];
  } else if (user.role === "ADMIN") {
    seasonIds = user.seasonAdminIds;
  } else {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const data = await loadReportsData({ seasonIds });
  const csv = toCsv(data.rawStudents);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="engagement-${Date.now()}.csv"`,
    },
  });
}
