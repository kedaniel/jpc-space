/**
 * Seed script — JPC Space.
 *
 * Creates realistic deterministic test data:
 *   - 1 Super, 3 Admins, 6 Leaders, 30 Students, 2 Mentors
 *   - Active season "GBV 2026" with 3 groups of 8 students + 8 weekly sessions
 *   - Completed season "TW 2025" with 2 groups + historical enrollments
 *   - Assignments + mixed-status submissions, attendance for past sessions,
 *     a handful of engagement notes
 *
 * Idempotent: wipes domain tables in FK-safe order before re-inserting.
 * Guard: refuses to run when NODE_ENV === "production".
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";
import { randomUUID } from "node:crypto";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — ensure .env is present.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const PUBLIC_ID_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const newPublicId = customAlphabet(PUBLIC_ID_ALPHABET, 10);

const DEFAULT_PASSWORD = "password123";

const FIRST_NAMES = [
  "Sara", "Mark", "John", "Mary", "Peter", "Lydia", "Andrew", "Hannah",
  "Paul", "Esther", "Joseph", "Ruth", "Daniel", "Rebecca", "Stephen", "Anna",
  "Thomas", "Priscilla", "Philip", "Tabitha", "Samuel", "Naomi", "David",
  "Eunice", "Timothy", "Lois", "Barnabas", "Mary-Kate", "Luke", "Phoebe",
  "Caleb", "Damaris", "Silas", "Junia",
];

const LAST_NAMES = [
  "Adel", "Bishara", "Costa", "Doss", "Eskander", "Fawzy", "Gabra", "Halim",
  "Iskander", "Jirjis", "Kamel", "Latif", "Makary", "Naguib", "Onsi", "Pavlos",
  "Qaldas", "Rizk", "Saad", "Tadros", "Wahba", "Youssef", "Zaki",
];

function* nameGen() {
  let i = 0;
  while (true) {
    const f = FIRST_NAMES[i % FIRST_NAMES.length];
    const l = LAST_NAMES[(i * 7) % LAST_NAMES.length];
    yield { first: f, last: l, full: `${f} ${l}` };
    i++;
  }
}

function emailOf(first: string, last: string, suffix?: number) {
  const base = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
  return suffix === undefined ? `${base}@jpc.test` : `${base}${suffix}@jpc.test`;
}

async function wipe() {
  // Order matters: children before parents.
  await db.submissionFile.deleteMany();
  await db.submission.deleteMany();
  await db.assignmentTarget.deleteMany();
  await db.assignment.deleteMany();
  await db.attendance.deleteMany();
  await db.session.deleteMany();
  await db.engagementNote.deleteMany();
  await db.groupStudent.deleteMany();
  await db.groupLeader.deleteMany();
  await db.seasonEnrollment.deleteMany();
  // Clear activeSeasonId so StudentProfile no longer references Season.
  await db.studentProfile.updateMany({ data: { activeSeasonId: null } });
  await db.group.deleteMany();
  await db.seasonAdmin.deleteMany();
  await db.season.deleteMany();
  await db.studentProfile.deleteMany();
  await db.inviteToken.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.user.deleteMany();
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed in production.");
  }

  console.log("→ Wiping existing data…");
  await wipe();

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const names = nameGen();

  console.log("→ Creating Super, Admins, Mentors…");
  const superUser = await db.user.create({
    data: {
      email: "super@jpc.test",
      name: "Super Admin",
      role: "SUPER",
      passwordHash,
    },
  });

  const adminUsers = await Promise.all(
    ["Anna Admin", "Boutros Admin", "Cyril Admin"].map((n, i) =>
      db.user.create({
        data: {
          email: `admin${i + 1}@jpc.test`,
          name: n,
          role: "ADMIN",
          passwordHash,
        },
      }),
    ),
  );

  const mentorUsers = await Promise.all(
    ["Father Mentor", "Mother Mentor"].map((n, i) =>
      db.user.create({
        data: {
          email: `mentor${i + 1}@jpc.test`,
          name: n,
          role: "MENTOR",
          passwordHash,
        },
      }),
    ),
  );

  console.log("→ Creating Leaders…");
  const leaderUsers = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const n = names.next().value!;
      return db.user.create({
        data: {
          email: `leader${i + 1}@jpc.test`,
          name: `${n.first} ${n.last}`,
          role: "LEADER",
          passwordHash,
        },
      });
    }),
  );

  console.log("→ Creating Students…");
  const studentUsers = await Promise.all(
    Array.from({ length: 30 }, (_, i) => {
      const n = names.next().value!;
      return db.user.create({
        data: {
          email: emailOf(n.first, n.last, i),
          name: `${n.first} ${n.last}`,
          role: "STUDENT",
          passwordHash,
          studentProfile: {
            create: {
              university: ["Cairo Uni", "Ain Shams", "AUC", "GUC", "Helwan"][i % 5],
              year: ["1st year", "2nd year", "3rd year", "4th year", "Postgrad"][i % 5],
              phone: `+20100${String(1000000 + i).padStart(7, "0")}`,
              spiritualBackground: i % 3 === 0 ? "New to community" : "Active in church",
              gifts: ["Music", "Teaching", "Hospitality", "Service", "Encouragement"][i % 5],
            },
          },
        },
      });
    }),
  );

  console.log("→ Creating Seasons…");
  const gbv = await db.season.create({
    data: {
      code: "gbv-2026",
      title: "GBV 2026",
      description: "Growing By the Vine — discipleship course for Spring 2026.",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-05-31"),
      status: "ACTIVE",
      createdById: superUser.id,
    },
  });

  const tw = await db.season.create({
    data: {
      code: "tw-2025",
      title: "TW 2025",
      description: "The Word — completed retreat-style course.",
      startDate: new Date("2025-06-01"),
      endDate: new Date("2025-09-15"),
      status: "COMPLETED",
      createdById: superUser.id,
    },
  });

  console.log("→ Assigning SeasonAdmins…");
  // 2 admins on GBV, 1 admin on TW, 1 admin spans both.
  await db.seasonAdmin.createMany({
    data: [
      { seasonId: gbv.id, userId: adminUsers[0].id, assignedById: superUser.id },
      { seasonId: gbv.id, userId: adminUsers[2].id, assignedById: superUser.id },
      { seasonId: tw.id, userId: adminUsers[1].id, assignedById: superUser.id },
      { seasonId: tw.id, userId: adminUsers[2].id, assignedById: superUser.id },
    ],
  });

  console.log("→ Creating Groups (GBV: 3 groups, TW: 2 groups)…");
  const gbvGroups = await Promise.all(
    ["Alpha", "Beta", "Gamma"].map((name) =>
      db.group.create({
        data: { seasonId: gbv.id, name, description: `Group ${name} — GBV 2026` },
      }),
    ),
  );
  const twGroups = await Promise.all(
    ["Delta", "Epsilon"].map((name) =>
      db.group.create({
        data: { seasonId: tw.id, name, description: `Group ${name} — TW 2025` },
      }),
    ),
  );

  console.log("→ Assigning Leaders to groups…");
  // 2 leaders per GBV group (6 leaders, 3 groups). Reuse 2 for TW groups too.
  const gbvLeaderPairs = [
    [leaderUsers[0], leaderUsers[1]],
    [leaderUsers[2], leaderUsers[3]],
    [leaderUsers[4], leaderUsers[5]],
  ];
  for (let i = 0; i < gbvGroups.length; i++) {
    for (const leader of gbvLeaderPairs[i]) {
      await db.groupLeader.create({
        data: { groupId: gbvGroups[i].id, userId: leader.id },
      });
    }
  }
  // TW historical: reuse 2 leaders.
  for (let i = 0; i < twGroups.length; i++) {
    await db.groupLeader.create({
      data: { groupId: twGroups[i].id, userId: leaderUsers[i].id },
    });
  }

  console.log("→ Enrolling students…");
  // First 24 students → GBV (3 groups × 8 students). Last 6 → alumni from TW only.
  const gbvStudents = studentUsers.slice(0, 24);
  const alumniStudents = studentUsers.slice(24);

  for (let i = 0; i < gbvStudents.length; i++) {
    const student = gbvStudents[i];
    const groupIdx = Math.floor(i / 8);
    const group = gbvGroups[groupIdx];

    await db.groupStudent.create({
      data: { groupId: group.id, studentUserId: student.id },
    });
    await db.studentProfile.update({
      where: { userId: student.id },
      data: { activeSeasonId: gbv.id },
    });
    await db.seasonEnrollment.create({
      data: {
        studentUserId: student.id,
        seasonId: gbv.id,
        groupId: group.id,
        status: "ACTIVE",
      },
    });
  }

  // First 12 GBV students also have a completed enrollment in TW (alumni continuing).
  for (let i = 0; i < 12; i++) {
    const student = gbvStudents[i];
    const twGroup = twGroups[i % 2];
    await db.seasonEnrollment.create({
      data: {
        studentUserId: student.id,
        seasonId: tw.id,
        groupId: twGroup.id,
        status: "COMPLETED",
        completedAt: new Date("2025-09-15"),
      },
    });
  }

  // Alumni: 6 students with TW history only.
  for (let i = 0; i < alumniStudents.length; i++) {
    const student = alumniStudents[i];
    const twGroup = twGroups[i % 2];
    await db.seasonEnrollment.create({
      data: {
        studentUserId: student.id,
        seasonId: tw.id,
        groupId: twGroup.id,
        status: "COMPLETED",
        completedAt: new Date("2025-09-15"),
      },
    });
  }

  console.log("→ Creating Sessions (GBV + TW)…");
  // GBV: 8 weekly Wednesdays starting 2026-02-04. First 2 are in the past
  // relative to seed-time-as-app-clock (2026-05-23), next 6 are in the past too —
  // adjust: 2 already happened (early Feb), 6 are "current/future-ish" but for
  // a 2026 app today we'll spread them.
  // Simpler: anchor "now" at the season midpoint and put 2 past + 6 future.
  const NOW = new Date("2026-03-15T18:00:00.000Z");
  const gbvRecurrenceId = randomUUID();
  const gbvSessions = [];
  for (let i = 0; i < 8; i++) {
    const offsetWeeks = i - 2; // -2, -1 → past; 0..5 → upcoming
    const startsAt = new Date(NOW);
    startsAt.setUTCDate(startsAt.getUTCDate() + offsetWeeks * 7);
    const s = await db.session.create({
      data: {
        seasonId: gbv.id,
        title: `GBV Week ${i + 1}: ${["Vine", "Branches", "Pruning", "Fruit", "Abiding", "Love", "Joy", "Sending"][i]}`,
        startsAt,
        durationMinutes: 90,
        location: "Main Hall",
        description: `Week ${i + 1} of GBV 2026.`,
        recurrenceGroupId: gbvRecurrenceId,
      },
    });
    gbvSessions.push(s);
  }

  // TW retrospective calendar (8 weekly sessions in June–Aug 2025).
  const twRecurrenceId = randomUUID();
  for (let i = 0; i < 8; i++) {
    const startsAt = new Date("2025-06-04T17:00:00.000Z");
    startsAt.setUTCDate(startsAt.getUTCDate() + i * 7);
    await db.session.create({
      data: {
        seasonId: tw.id,
        title: `TW Week ${i + 1}`,
        startsAt,
        durationMinutes: 120,
        location: "Retreat Center",
        recurrenceGroupId: twRecurrenceId,
      },
    });
  }

  console.log("→ Marking attendance for past GBV sessions…");
  // First 2 sessions are past (offsetWeeks -2, -1).
  const pastSessions = gbvSessions.slice(0, 2);
  const ATTENDANCE_MIX: ("PRESENT" | "ABSENT" | "EXCUSED" | "LATE")[] = [
    "PRESENT", "PRESENT", "PRESENT", "PRESENT", "PRESENT", "PRESENT",
    "LATE", "EXCUSED", "ABSENT",
  ];
  for (const session of pastSessions) {
    for (let i = 0; i < gbvStudents.length; i++) {
      const student = gbvStudents[i];
      const status = ATTENDANCE_MIX[(i + session.id) % ATTENDANCE_MIX.length];
      await db.attendance.create({
        data: {
          sessionId: session.id,
          studentUserId: student.id,
          status,
          markedById: leaderUsers[i % leaderUsers.length].id,
        },
      });
    }
  }

  console.log("→ Creating Assignments…");
  // 3 in GBV.
  const a1 = await db.assignment.create({
    data: {
      seasonId: gbv.id,
      sessionId: gbvSessions[1].id,
      title: "Reflection on Week 2: Branches",
      description: "Write 200+ words on what 'abiding in the vine' means to you.",
      dueAt: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      isAllGroups: true,
      createdById: adminUsers[0].id,
    },
  });

  const a2 = await db.assignment.create({
    data: {
      seasonId: gbv.id,
      title: "Group Alpha — Memory Verse",
      description: "Memorize John 15:5 and submit a short video link.",
      dueAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000),
      isAllGroups: false,
      createdById: adminUsers[0].id,
    },
  });
  await db.assignmentTarget.create({
    data: { assignmentId: a2.id, groupId: gbvGroups[0].id },
  });

  const a3 = await db.assignment.create({
    data: {
      seasonId: gbv.id,
      title: "Final Reflection",
      description: "Final 500-word reflection on the whole season.",
      dueAt: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
      isAllGroups: true,
      createdById: adminUsers[2].id,
    },
  });

  // 1 in TW (closed historical).
  const a4 = await db.assignment.create({
    data: {
      seasonId: tw.id,
      title: "TW Final Essay",
      description: "Closed assignment from TW 2025.",
      dueAt: new Date("2025-09-01"),
      isAllGroups: true,
      createdById: adminUsers[1].id,
    },
  });

  console.log("→ Creating Submissions (mixed states)…");
  // a1 (all GBV groups): every student. Status mix.
  for (let i = 0; i < gbvStudents.length; i++) {
    const student = gbvStudents[i];
    const bucket = i % 5;
    if (bucket === 0) continue; // ~5 students haven't submitted at all
    const data = {
      publicId: newPublicId(),
      assignmentId: a1.id,
      studentUserId: student.id,
      text: `My reflection on abiding... (student ${student.name})`,
      status:
        bucket === 1 ? "DRAFT"
        : bucket === 2 ? "SUBMITTED"
        : bucket === 3 ? "REVIEWED"
        : "RETURNED",
      submittedAt: bucket >= 2 ? new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000) : null,
      reviewedAt: bucket >= 3 ? new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000) : null,
      reviewedById: bucket >= 3 ? leaderUsers[i % leaderUsers.length].id : null,
      feedback: bucket >= 3 ? "Good engagement — keep going." : null,
    } as const;
    const sub = await db.submission.create({ data });
    // First submitted student also has an attached file (dummy storage path).
    if (bucket === 2 && i === 1) {
      await db.submissionFile.create({
        data: {
          submissionId: sub.id,
          originalName: "reflection.txt",
          storagePath: `submissions/2026/03/${sub.publicId}-reflection.txt`,
          mimeType: "text/plain",
          sizeBytes: 1234,
        },
      });
    }
  }

  // a2 (group Alpha only): students in group Alpha submit.
  const alphaStudents = gbvStudents.slice(0, 8);
  for (let i = 0; i < alphaStudents.length; i++) {
    if (i % 3 === 0) continue;
    await db.submission.create({
      data: {
        publicId: newPublicId(),
        assignmentId: a2.id,
        studentUserId: alphaStudents[i].id,
        text: "Memorized — link: https://example.com/video",
        status: i % 2 === 0 ? "SUBMITTED" : "REVIEWED",
        submittedAt: new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000),
        reviewedAt: i % 2 === 1 ? new Date() : null,
        reviewedById: i % 2 === 1 ? leaderUsers[0].id : null,
        feedback: i % 2 === 1 ? "Great memorization!" : null,
      },
    });
  }

  // a4 (TW closed): historical submissions for first 12 students.
  for (let i = 0; i < 12; i++) {
    await db.submission.create({
      data: {
        publicId: newPublicId(),
        assignmentId: a4.id,
        studentUserId: gbvStudents[i].id,
        text: "TW final essay (archived).",
        status: "REVIEWED",
        submittedAt: new Date("2025-08-29"),
        reviewedAt: new Date("2025-09-05"),
        reviewedById: leaderUsers[i % 2].id,
        feedback: "Solid work.",
      },
    });
  }

  console.log("→ Creating Engagement Notes…");
  for (let i = 0; i < 8; i++) {
    const student = gbvStudents[i];
    await db.engagementNote.create({
      data: {
        studentUserId: student.id,
        authorUserId: i % 2 === 0
          ? leaderUsers[i % leaderUsers.length].id
          : mentorUsers[i % mentorUsers.length].id,
        seasonId: gbv.id,
        body:
          i % 2 === 0
            ? "Engaged well in small-group discussion this week."
            : "Reached out pastorally — student doing well, prayer requests noted.",
        visibility: i % 3 === 0 ? "LEADERS" : i % 3 === 1 ? "MENTORS" : "ADMINS",
      },
    });
  }

  // Suppress unused warning on a3 in the small-data path.
  void a3;

  console.log("→ Flagging one note for follow-up…");
  const flagStudent = gbvStudents[2];
  await db.engagementNote.create({
    data: {
      studentUserId: flagStudent.id,
      authorUserId: mentorUsers[0].id,
      seasonId: gbv.id,
      body: "Hasn't responded to the last two check-ins. Worth a personal call.",
      visibility: "MENTORS",
      followUpFlagged: true,
    },
  });

  console.log("→ Creating Student Documents…");
  for (let i = 0; i < 2; i++) {
    const student = gbvStudents[i];
    await db.studentDocument.create({
      data: {
        studentUserId: student.id,
        uploadedById: adminUsers[0].id,
        originalName: i === 0 ? "consent-form.pdf" : "testimony.docx",
        storagePath: `documents/2026/03/seed-${i}-${
          i === 0 ? "consent-form.pdf" : "testimony.docx"
        }`,
        mimeType:
          i === 0
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: 102400 * (i + 1),
      },
    });
  }

  console.log("→ Creating Notifications…");
  const notif = (
    userId: number,
    type:
      | "ASSIGNMENT_CREATED"
      | "SUBMISSION_REVIEWED"
      | "SESSION_RESCHEDULED"
      | "LOW_ATTENDANCE_FLAG"
      | "MENTOR_FOLLOWUP",
    title: string,
    body: string | null,
    link: string | null,
  ) =>
    db.notification.create({
      data: { userId, type, title, body, link },
    });

  // Each student in the active season gets the assignment notification.
  for (const s of gbvStudents.slice(0, 6)) {
    await notif(
      s.id,
      "ASSIGNMENT_CREATED",
      `New assignment: ${a1.title}`,
      "Due soon — check it out.",
      `/student/assignments/${a1.id}`,
    );
  }
  // The reviewed-submission student gets feedback.
  await notif(
    gbvStudents[0].id,
    "SUBMISSION_REVIEWED",
    `Feedback ready on "${a1.title}"`,
    null,
    `/student/assignments/${a1.id}`,
  );
  // Admin gets a mentor-followup notification (the one flagged above).
  await notif(
    adminUsers[0].id,
    "MENTOR_FOLLOWUP",
    `Follow-up flagged for ${flagStudent.name ?? flagStudent.email}`,
    "Hasn't responded to the last two check-ins.",
    `/admin/students/${flagStudent.id}`,
  );
  // Leaders see a low-attendance flag.
  for (const l of leaderUsers.slice(0, 2)) {
    await notif(
      l.id,
      "LOW_ATTENDANCE_FLAG",
      "A student in your group has 3 consecutive absences",
      "Consider reaching out for a check-in.",
      `/leader/groups`,
    );
  }

  console.log("\n✓ Seed complete.");
  console.log("  Sign in with any of:");
  console.log(`    super@jpc.test    / ${DEFAULT_PASSWORD}`);
  console.log(`    admin1@jpc.test   / ${DEFAULT_PASSWORD}`);
  console.log(`    leader1@jpc.test  / ${DEFAULT_PASSWORD}`);
  console.log(`    mentor1@jpc.test  / ${DEFAULT_PASSWORD}`);
  console.log(`    (student emails are <first.last><n>@jpc.test) / ${DEFAULT_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
