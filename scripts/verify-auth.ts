/**
 * Manual RBAC verification — exercises permission helpers for each seeded role
 * against representative resources from the seed data. Prints a pass/fail table.
 *
 * Run: npm run verify:auth
 */

import "dotenv/config";
import { db } from "../src/lib/db";
import { loadScopes } from "../src/lib/auth/scopes";
import type { SessionUser } from "../src/lib/rbac";
import {
  canCreateSeason,
  canEditSeason,
  canAccessSeason,
  canAccessGroup,
  canMarkAttendance,
  canViewSubmission,
  getVisibleStudents,
  getStudentSeasonAccess,
} from "../src/lib/auth/permissions";

interface Row {
  role: string;
  check: string;
  expected: boolean | string | number;
  actual: boolean | string | number;
  pass: boolean;
}

const rows: Row[] = [];

function rec(role: string, check: string, expected: boolean | string | number, actual: boolean | string | number) {
  rows.push({ role, check, expected, actual, pass: expected === actual });
}

async function sessionUserFor(email: string): Promise<SessionUser> {
  const u = await db.user.findUnique({ where: { email } });
  if (!u) throw new Error(`Seed user missing: ${email}`);
  const scopes = await loadScopes(u.id);
  return {
    userId: u.id,
    role: u.role,
    seasonAdminIds: scopes.seasonAdminIds,
    groupLeaderIds: scopes.groupLeaderIds,
    activeSeasonId: scopes.activeSeasonId,
    graduationYear: scopes.graduationYear,
  };
}

async function main() {
  const gbv = await db.season.findUnique({ where: { code: "gbv-2026" } });
  const tw = await db.season.findUnique({ where: { code: "tw-2025" } });
  if (!gbv || !tw) throw new Error("Seed seasons missing — run npm run db:seed");

  const gbvGroups = await db.group.findMany({
    where: { seasonId: gbv.id },
    orderBy: { id: "asc" },
  });
  const alphaGroup = gbvGroups[0];
  const betaGroup = gbvGroups[1];

  const firstSession = await db.session.findFirst({
    where: { seasonId: gbv.id },
    orderBy: { startsAt: "asc" },
  });
  if (!firstSession) throw new Error("Seed sessions missing");

  // Pick a submission from an Alpha student (student id mod 8 = 0..7 = alpha)
  const submission = await db.submission.findFirst({
    where: {
      assignment: { seasonId: gbv.id },
      studentUser: { groupStudentMembership: { groupId: alphaGroup.id } },
    },
  });
  if (!submission) throw new Error("No GBV submission from Alpha student found");

  // Build session users
  const superU = await sessionUserFor("super@jpc.test");
  // admin1 is assigned to GBV (per seed adminUsers[0])
  const adminU = await sessionUserFor("admin1@jpc.test");
  // leader1 leads gbvGroups[0] (Alpha)
  const leader1 = await sessionUserFor("leader1@jpc.test");
  // leader3 leads gbvGroups[1] (Beta) — used for cross-group denial check
  const leader3 = await sessionUserFor("leader3@jpc.test");
  const mentorU = await sessionUserFor("mentor1@jpc.test");
  // Pick a current Alpha student (the one whose submission we grabbed)
  const studentU: SessionUser = await (async () => {
    const u = await db.user.findUnique({
      where: { id: submission.studentUserId },
    });
    if (!u) throw new Error("Student not found");
    const scopes = await loadScopes(u.id);
    return {
      userId: u.id,
      role: u.role,
      seasonAdminIds: scopes.seasonAdminIds,
      groupLeaderIds: scopes.groupLeaderIds,
      activeSeasonId: scopes.activeSeasonId,
      graduationYear: scopes.graduationYear,
    };
  })();
  // A student NOT in Alpha — pick one whose group != alphaGroup
  const otherStudentUser = await db.user.findFirst({
    where: {
      role: "STUDENT",
      groupStudentMembership: { groupId: betaGroup.id },
    },
  });
  if (!otherStudentUser) throw new Error("No beta student found");
  const otherStudent = await sessionUserFor(otherStudentUser.email);

  // ---- canCreateSeason
  rec("SUPER", "canCreateSeason", true, canCreateSeason(superU));
  rec("ADMIN", "canCreateSeason", false, canCreateSeason(adminU));
  rec("LEADER", "canCreateSeason", false, canCreateSeason(leader1));
  rec("MENTOR", "canCreateSeason", false, canCreateSeason(mentorU));
  rec("STUDENT", "canCreateSeason", false, canCreateSeason(studentU));

  // ---- canEditSeason(gbv)
  rec("SUPER", "canEditSeason(gbv)", true, canEditSeason(superU, gbv.id));
  rec("ADMIN(gbv)", "canEditSeason(gbv)", true, canEditSeason(adminU, gbv.id));
  rec("LEADER1", "canEditSeason(gbv)", false, canEditSeason(leader1, gbv.id));
  rec("MENTOR", "canEditSeason(gbv)", false, canEditSeason(mentorU, gbv.id));
  rec("STUDENT", "canEditSeason(gbv)", false, canEditSeason(studentU, gbv.id));

  // ---- canAccessSeason(gbv)
  rec("SUPER", "canAccessSeason(gbv)", true, await canAccessSeason(superU, gbv.id));
  rec("ADMIN(gbv)", "canAccessSeason(gbv)", true, await canAccessSeason(adminU, gbv.id));
  rec("LEADER1", "canAccessSeason(gbv)", true, await canAccessSeason(leader1, gbv.id));
  rec("MENTOR", "canAccessSeason(gbv)", true, await canAccessSeason(mentorU, gbv.id));
  rec("STUDENT(gbv)", "canAccessSeason(gbv)", true, await canAccessSeason(studentU, gbv.id));

  // ---- canAccessSeason(tw) — STUDENT enrolled in tw historically? Some are, but our
  // chosen alpha student is gbvStudents[i] where i < 12 → also enrolled in TW.
  // Just check leader1 (not in TW) and studentU.
  // leader1 was reused as a TW group leader in seed, so they DO retain TW access.
  rec("LEADER1", "canAccessSeason(tw)", true, await canAccessSeason(leader1, tw.id));
  // leader5 was NOT reused for TW.
  const leader5 = await sessionUserFor("leader5@jpc.test");
  rec("LEADER5", "canAccessSeason(tw)", false, await canAccessSeason(leader5, tw.id));

  // ---- canAccessGroup(alpha)
  rec("SUPER", "canAccessGroup(alpha)", true, await canAccessGroup(superU, alphaGroup.id));
  rec("ADMIN(gbv)", "canAccessGroup(alpha)", true, await canAccessGroup(adminU, alphaGroup.id));
  rec("LEADER1(alpha)", "canAccessGroup(alpha)", true, await canAccessGroup(leader1, alphaGroup.id));
  rec("LEADER3(beta)", "canAccessGroup(alpha)", false, await canAccessGroup(leader3, alphaGroup.id));
  rec("MENTOR", "canAccessGroup(alpha)", true, await canAccessGroup(mentorU, alphaGroup.id));
  rec("STUDENT(alpha)", "canAccessGroup(alpha)", true, await canAccessGroup(studentU, alphaGroup.id));
  rec("STUDENT(beta)", "canAccessGroup(alpha)", false, await canAccessGroup(otherStudent, alphaGroup.id));

  // ---- canMarkAttendance(session1) — session1 belongs to gbv (whole season)
  rec("SUPER", "canMarkAttendance(s1)", true, await canMarkAttendance(superU, firstSession.id));
  rec("ADMIN(gbv)", "canMarkAttendance(s1)", true, await canMarkAttendance(adminU, firstSession.id));
  rec("LEADER1(alpha)", "canMarkAttendance(s1)", true, await canMarkAttendance(leader1, firstSession.id));
  rec("MENTOR", "canMarkAttendance(s1)", false, await canMarkAttendance(mentorU, firstSession.id));
  rec("STUDENT", "canMarkAttendance(s1)", false, await canMarkAttendance(studentU, firstSession.id));

  // ---- canViewSubmission(sub) — submission is by an Alpha student in GBV
  rec("SUPER", "canViewSubmission(alphaSub)", true, await canViewSubmission(superU, submission.id));
  rec("ADMIN(gbv)", "canViewSubmission(alphaSub)", true, await canViewSubmission(adminU, submission.id));
  rec("LEADER1(alpha)", "canViewSubmission(alphaSub)", true, await canViewSubmission(leader1, submission.id));
  rec("LEADER3(beta)", "canViewSubmission(alphaSub)", false, await canViewSubmission(leader3, submission.id));
  rec("MENTOR", "canViewSubmission(alphaSub)", true, await canViewSubmission(mentorU, submission.id));
  rec("STUDENT(owner)", "canViewSubmission(alphaSub)", true, await canViewSubmission(studentU, submission.id));
  rec("STUDENT(other)", "canViewSubmission(alphaSub)", false, await canViewSubmission(otherStudent, submission.id));

  // ---- getVisibleStudents — counts only
  const totalStudents = await db.user.count({ where: { role: "STUDENT", deletedAt: null } });
  const superVisible = await getVisibleStudents(superU);
  rec("SUPER", "getVisibleStudents.count", totalStudents, superVisible.length);
  const mentorVisible = await getVisibleStudents(mentorU);
  rec("MENTOR", "getVisibleStudents.count", totalStudents, mentorVisible.length);
  const adminVisible = await getVisibleStudents(adminU);
  // admin1 admins GBV → 24 enrolled students
  rec("ADMIN(gbv)", "getVisibleStudents.count", 24, adminVisible.length);
  const leader1Visible = await getVisibleStudents(leader1);
  rec("LEADER1(alpha)", "getVisibleStudents.count", 8, leader1Visible.length);
  const studentVisible = await getVisibleStudents(studentU);
  rec("STUDENT", "getVisibleStudents.count", 1, studentVisible.length);

  // ---- getStudentSeasonAccess — current vs past
  const currentAccess = await getStudentSeasonAccess(studentU.userId, gbv.id);
  rec("STUDENT", "getStudentSeasonAccess(currentGBV).canView", true, currentAccess.canViewSubmissions);
  rec("STUDENT", "getStudentSeasonAccess(currentGBV).readOnly", false, currentAccess.isReadOnly);
  const pastAccess = await getStudentSeasonAccess(studentU.userId, tw.id);
  rec("STUDENT", "getStudentSeasonAccess(pastTW).canView", false, pastAccess.canViewSubmissions);
  rec("STUDENT", "getStudentSeasonAccess(pastTW).readOnly", true, pastAccess.isReadOnly);

  // Render
  const colRole = Math.max(8, ...rows.map((r) => r.role.length));
  const colCheck = Math.max(8, ...rows.map((r) => r.check.length));
  const colExpected = Math.max(8, ...rows.map((r) => String(r.expected).length));
  const colActual = Math.max(6, ...rows.map((r) => String(r.actual).length));

  const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - s.length));
  console.log("");
  console.log(
    pad("ROLE", colRole) + "  " +
    pad("CHECK", colCheck) + "  " +
    pad("EXPECTED", colExpected) + "  " +
    pad("ACTUAL", colActual) + "  RESULT",
  );
  console.log("-".repeat(colRole + colCheck + colExpected + colActual + 16));
  for (const r of rows) {
    console.log(
      pad(r.role, colRole) + "  " +
      pad(r.check, colCheck) + "  " +
      pad(String(r.expected), colExpected) + "  " +
      pad(String(r.actual), colActual) + "  " +
      (r.pass ? "PASS" : "FAIL"),
    );
  }
  const failed = rows.filter((r) => !r.pass);
  console.log("");
  console.log(`${rows.length - failed.length}/${rows.length} checks passed`);
  if (failed.length > 0) {
    console.log("FAILURES:");
    for (const f of failed) {
      console.log(`  ${f.role} ${f.check}: expected=${f.expected} actual=${f.actual}`);
    }
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
