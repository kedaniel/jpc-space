import type { UserRole } from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/rbac";

export type NavIconName =
  | "home"
  | "dashboard"
  | "users"
  | "calendar"
  | "events"
  | "assignments"
  | "submissions"
  | "history"
  | "profile"
  | "reports"
  | "groups"
  | "season"
  | "students"
  | "alumni"
  | "dropped"
  | "notes"
  | "quizzes"
  | "more"
  | "settings";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
}

export interface RoleNav {
  sidebar: NavItem[];
  tabs: NavItem[];
}

const SUPER: RoleNav = {
  sidebar: [
    { href: "/super/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/super/seasons", label: "Seasons", icon: "season" },
    { href: "/super/calendar", label: "Calendar", icon: "calendar" },
    { href: "/super/events", label: "JPC Events", icon: "events" },
    { href: "/super/students", label: "Students", icon: "students" },
    { href: "/super/students/alumni", label: "Alumni", icon: "alumni" },
    { href: "/super/students/dropped", label: "Dropped students", icon: "dropped" },
    { href: "/super/users", label: "Users", icon: "users" },
    { href: "/super/reports", label: "Reports", icon: "reports" },
    { href: "/super/settings", label: "Settings", icon: "settings" },
  ],
  tabs: [
    { href: "/super/seasons", label: "Seasons", icon: "season" },
    { href: "/super/calendar", label: "Calendar", icon: "calendar" },
    { href: "/super/dashboard", label: "Home", icon: "home" },
    { href: "/super/students", label: "Students", icon: "students" },
    { href: "/super/more", label: "More", icon: "more" },
  ],
};

const ADMIN: RoleNav = {
  sidebar: [
    { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/season", label: "My Season", icon: "season" },
    { href: "/admin/calendar", label: "Calendar", icon: "calendar" },
    { href: "/admin/groups", label: "Groups", icon: "groups" },
    { href: "/admin/students", label: "Students", icon: "students" },
    { href: "/admin/assignments", label: "Assignments", icon: "assignments" },
    { href: "/admin/quizzes", label: "Quizzes", icon: "quizzes" },
    { href: "/admin/reports", label: "Reports", icon: "reports" },
    { href: "/admin/settings", label: "Settings", icon: "settings" },
  ],
  tabs: [
    { href: "/admin/calendar", label: "Calendar", icon: "calendar" },
    { href: "/admin/groups", label: "Groups", icon: "groups" },
    { href: "/admin/dashboard", label: "Home", icon: "home" },
    { href: "/admin/students", label: "Students", icon: "students" },
    { href: "/admin/more", label: "More", icon: "more" },
  ],
};

const LEADER: RoleNav = {
  sidebar: [
    { href: "/leader/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/leader/groups", label: "My Groups", icon: "groups" },
    { href: "/leader/calendar", label: "Calendar", icon: "calendar" },
    { href: "/leader/submissions", label: "Submissions", icon: "submissions" },
    { href: "/leader/quizzes", label: "Quizzes", icon: "quizzes" },
    { href: "/leader/settings", label: "Settings", icon: "settings" },
  ],
  tabs: [
    { href: "/leader/groups", label: "My Group", icon: "groups" },
    { href: "/leader/calendar", label: "Calendar", icon: "calendar" },
    { href: "/leader/dashboard", label: "Home", icon: "home" },
    { href: "/leader/submissions", label: "Submissions", icon: "submissions" },
    { href: "/leader/more", label: "More", icon: "more" },
  ],
};

const STUDENT: RoleNav = {
  sidebar: [
    { href: "/student/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/student/season", label: "Current Season", icon: "season" },
    { href: "/student/calendar", label: "Calendar", icon: "calendar" },
    { href: "/student/assignments", label: "Assignments", icon: "assignments" },
    { href: "/student/quizzes", label: "Quizzes", icon: "quizzes" },
    { href: "/student/history", label: "History", icon: "history" },
    { href: "/student/profile", label: "Profile", icon: "profile" },
    { href: "/student/settings", label: "Settings", icon: "settings" },
  ],
  tabs: [
    { href: "/student/calendar", label: "Calendar", icon: "calendar" },
    { href: "/student/assignments", label: "Assignments", icon: "assignments" },
    { href: "/student/dashboard", label: "Home", icon: "home" },
    { href: "/student/quizzes", label: "Quizzes", icon: "quizzes" },
    { href: "/student/more", label: "More", icon: "more" },
  ],
};

const MENTOR: RoleNav = {
  sidebar: [
    { href: "/mentor/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/mentor/students", label: "Students", icon: "students" },
    { href: "/mentor/reports", label: "Reports", icon: "reports" },
    { href: "/mentor/settings", label: "Settings", icon: "settings" },
  ],
  tabs: [
    { href: "/mentor/students", label: "Students", icon: "students" },
    { href: "/mentor/reports", label: "Reports", icon: "reports" },
    { href: "/mentor/dashboard", label: "Home", icon: "home" },
    { href: "/mentor/notes", label: "Notes", icon: "notes" },
    { href: "/mentor/profile", label: "Profile", icon: "profile" },
  ],
};

// Alumni are graduated students (role STUDENT + graduationYear) — a read-only portal.
const ALUMNI: RoleNav = {
  sidebar: [
    { href: "/alumni/dashboard", label: "Home", icon: "dashboard" },
    { href: "/alumni/calendar", label: "Events", icon: "events" },
    { href: "/alumni/history", label: "My History", icon: "history" },
    { href: "/alumni/profile", label: "Profile", icon: "profile" },
    { href: "/alumni/settings", label: "Settings", icon: "settings" },
  ],
  tabs: [
    { href: "/alumni/calendar", label: "Events", icon: "events" },
    { href: "/alumni/history", label: "History", icon: "history" },
    { href: "/alumni/dashboard", label: "Home", icon: "home" },
    { href: "/alumni/profile", label: "Profile", icon: "profile" },
    { href: "/alumni/more", label: "More", icon: "more" },
  ],
};

export const navByRole: Record<UserRole, RoleNav> = {
  SUPER,
  ADMIN,
  LEADER,
  MENTOR,
  STUDENT,
};

export function navFor(user: SessionUser): RoleNav {
  if (user.role === "STUDENT" && user.graduationYear != null) return ALUMNI;
  return navByRole[user.role];
}
