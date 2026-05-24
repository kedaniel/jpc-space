import Link from "next/link";
import { format } from "date-fns";
import { Calendar, Mail, MapPin, Phone, Flag } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendancePill } from "@/components/ui/attendance-pill";
import { SubmissionStatusBadge } from "@/components/ui/submission-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NoteForm } from "@/components/students/note-form";
import type { StudentDetailData } from "@/lib/students-query";
import type { EngagementScore } from "@/lib/engagement";

interface StudentDetailProps {
  student: StudentDetailData;
  engagement: EngagementScore | null;
  visibleNotes: StudentDetailData["notes"];
  canEdit: boolean;
  canWriteNote: boolean;
  editHref?: string;
  reviewBasePath?: string; // e.g. "/leader/submissions"
  showNotesTab?: boolean;
  showSubmissionsTab?: boolean;
  showDocumentsTab?: boolean;
}

function initialsFor(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  }
  return email[0]?.toUpperCase() ?? "?";
}

export function StudentDetail({
  student,
  engagement,
  visibleNotes,
  canEdit,
  canWriteNote,
  editHref,
  reviewBasePath = "/leader/submissions",
  showNotesTab = true,
  showSubmissionsTab = true,
  showDocumentsTab = true,
}: StudentDetailProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="size-14">
              <AvatarFallback>{initialsFor(student.name, student.email)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{student.name ?? student.email}</p>
              <p className="text-sm text-muted-foreground">{student.email}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                {student.profile.activeSeasonTitle && (
                  <Badge variant="outline">{student.profile.activeSeasonTitle}</Badge>
                )}
                {student.currentGroup && (
                  <Badge variant="secondary">{student.currentGroup.name}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<a href={`mailto:${student.email}`} />}>
              <Mail /> Email
            </Button>
            {student.profile.phone && (
              <Button variant="outline" render={<a href={`tel:${student.profile.phone}`} />}>
                <Phone /> Call
              </Button>
            )}
            {canEdit && editHref && (
              <Button render={<Link href={editHref} />}>Edit profile</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {engagement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement (current season)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Progress value={engagement.score} className="flex-1" />
              <span className="text-sm font-semibold tabular-nums">
                {engagement.score}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <span>
                Attendance: {engagement.attendancePresent}/{engagement.attendanceTotal} (
                {engagement.attendancePct}%)
              </span>
              <span>
                Submissions: {engagement.submissionsCompleted}/{engagement.submissionsExpected} (
                {engagement.submissionPct}%)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          {showSubmissionsTab && (
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          )}
          {showNotesTab && <TabsTrigger value="notes">Notes</TabsTrigger>}
          {showDocumentsTab && <TabsTrigger value="documents">Documents</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="grid grid-cols-1 gap-3 pt-6 md:grid-cols-2">
              <Field label="University" value={student.profile.university} />
              <Field label="Year / faculty" value={student.profile.year} />
              <Field
                label="Date of birth"
                value={
                  student.profile.dateOfBirth
                    ? format(student.profile.dateOfBirth, "MMM d, yyyy")
                    : null
                }
              />
              <Field label="Phone" value={student.profile.phone} />
              <Field
                label="Spiritual background"
                value={student.profile.spiritualBackground}
                wide
              />
              <Field label="Gifts / interests" value={student.profile.gifts} wide />
              {student.profile.notes != null && (
                <Field label="Internal notes" value={student.profile.notes} wide />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasons">
          {student.seasons.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No seasons"
              description="This student isn't enrolled in any season yet."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {student.seasons.map((s) => (
                <li key={s.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-2 pt-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(s.startDate, "MMM d, yyyy")} – {format(s.endDate, "MMM d, yyyy")}
                          {s.groupName && ` · ${s.groupName}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">{s.status}</Badge>
                        <Badge variant={s.enrollmentStatus === "ACTIVE" ? "info" : "secondary"}>
                          {s.enrollmentStatus}
                        </Badge>
                        <Badge variant="success">{s.attendancePct}% attendance</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="attendance">
          {student.attendance.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No attendance yet"
              description="Attendance records will appear here as sessions are marked."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {student.attendance.map((a) => (
                    <li
                      key={a.sessionId}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.sessionTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(a.startsAt, "EEE, MMM d, yyyy · h:mm a")} · {a.seasonTitle}
                        </p>
                      </div>
                      <AttendancePill
                        status={a.status as "PRESENT" | "ABSENT" | "EXCUSED" | "LATE"}
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {showSubmissionsTab && (
          <TabsContent value="submissions">
            {student.submissions.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No submissions"
                description="Submissions visible to you will appear here."
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {student.submissions.map((s) => (
                      <li
                        key={s.publicId}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`${reviewBasePath}/${s.publicId}`}
                            className="truncate text-sm font-medium hover:underline"
                          >
                            {s.assignmentTitle}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {s.seasonTitle}
                            {s.submittedAt &&
                              ` · submitted ${format(s.submittedAt, "MMM d, yyyy")}`}
                          </p>
                        </div>
                        <SubmissionStatusBadge
                          status={s.status as "DRAFT" | "SUBMITTED" | "REVIEWED" | "RETURNED"}
                        />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {showNotesTab && (
          <TabsContent value="notes">
            <div className="flex flex-col gap-4">
              {canWriteNote && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add a note</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <NoteForm studentUserId={student.id} />
                  </CardContent>
                </Card>
              )}
              {visibleNotes.length === 0 ? (
                <EmptyState
                  icon={Flag}
                  title="No notes yet"
                  description="Notes you can see will appear here."
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {visibleNotes.map((n) => (
                    <li key={n.id}>
                      <Card>
                        <CardContent className="flex flex-col gap-2 pt-4">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {n.authorName ?? "Unknown author"}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {n.authorRole}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {n.visibility}
                            </Badge>
                            {n.followUpFlagged && (
                              <Badge variant="warning" className="text-[10px]">
                                Follow up
                              </Badge>
                            )}
                            <span>·</span>
                            <span>{format(n.createdAt, "MMM d, yyyy")}</span>
                            {n.seasonTitle && (
                              <>
                                <span>·</span>
                                <span>{n.seasonTitle}</span>
                              </>
                            )}
                          </div>
                          <div
                            className="prose prose-sm max-w-none text-sm"
                            dangerouslySetInnerHTML={{ __html: n.body }}
                          />
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        )}

        {showDocumentsTab && (
          <TabsContent value="documents">
            {student.documents.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="No documents"
                description="Upload consent forms, testimonies, or other files."
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {student.documents.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{d.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.mimeType} · {(d.sizeBytes / 1024).toFixed(1)} KB · uploaded{" "}
                            {format(d.uploadedAt, "MMM d, yyyy")}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {value ? (
        <p className="mt-1 whitespace-pre-line text-sm text-foreground">{value}</p>
      ) : (
        <p className="mt-1 text-sm italic text-muted-foreground">—</p>
      )}
    </div>
  );
}
