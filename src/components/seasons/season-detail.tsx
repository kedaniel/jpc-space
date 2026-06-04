import Link from "next/link";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Pencil, Users } from "lucide-react";

import type { SeasonStatus } from "@/generated/prisma/enums";
import type { SessionListRow } from "@/lib/sessions-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { SeasonStatusBadge } from "@/components/seasons/season-status-badge";
import { CalendarList } from "@/components/sessions/calendar-list";

export interface SeasonDetailGroup {
  id: number;
  name: string;
  studentCount: number;
  leaderNames: string[];
}

export interface SeasonDetailData {
  id: number;
  code: string;
  title: string;
  description: string | null;
  status: SeasonStatus;
  startDate: Date;
  endDate: Date;
  groups: SeasonDetailGroup[];
  sessionCount: number;
  studentCount: number;
}

interface SeasonDetailProps {
  season: SeasonDetailData;
  canEdit: boolean;
  editHref?: string;
  groupsHref: string;
  calendarHref: string;
  sessions?: SessionListRow[];
  checkInBaseUrl?: string;
  sessionBasePath?: string;
}

export function SeasonDetail({
  season,
  canEdit,
  editHref,
  groupsHref,
  calendarHref,
  sessions,
  checkInBaseUrl,
  sessionBasePath,
}: SeasonDetailProps) {
  return (
    <Tabs defaultValue="overview">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="groups">Groups ({season.groups.length})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({season.sessionCount})</TabsTrigger>
        </TabsList>
        {canEdit && editHref ? (
          <Button variant="outline" size="sm" render={<Link href={editHref} />}>
            <Pencil />
            Edit season
          </Button>
        ) : null}
      </div>

      <TabsContent value="overview">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <SeasonStatusBadge status={season.status} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {format(season.startDate, "MMM d, yyyy")} –{" "}
              {format(season.endDate, "MMM d, yyyy")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Enrollment</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {season.studentCount} students across {season.groups.length} groups
            </CardContent>
          </Card>
        </div>
        {season.description ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-foreground">
              {season.description}
            </CardContent>
          </Card>
        ) : null}
      </TabsContent>

      <TabsContent value="groups">
        {season.groups.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="Add groups so students can be placed and leaders assigned."
            action={
              canEdit ? (
                <Button render={<Link href={groupsHref} />}>Manage groups</Button>
              ) : null
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {season.groups.map((g) => (
              <Card key={g.id}>
                <CardHeader>
                  <CardTitle>{g.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 pt-0 text-sm text-muted-foreground">
                  <div>{g.studentCount} students</div>
                  <div>
                    Leaders:{" "}
                    {g.leaderNames.length
                      ? g.leaderNames.join(", ")
                      : "Unassigned"}
                  </div>
                </CardContent>
              </Card>
            ))}
            {canEdit ? (
              <div className="flex items-center justify-center">
                <Button variant="outline" render={<Link href={groupsHref} />}>
                  Manage groups
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </TabsContent>

      <TabsContent value="sessions">
        {sessions && sessionBasePath ? (
          <CalendarList
            sessions={sessions}
            basePath={sessionBasePath}
            showAttendanceLink
            showCheckIn={!!checkInBaseUrl}
            checkInBaseUrl={checkInBaseUrl}
          />
        ) : (
          <EmptyState
            icon={CalendarIcon}
            title={`${season.sessionCount} sessions scheduled`}
            description="View and manage sessions on the calendar."
            action={
              <Button render={<Link href={calendarHref} />}>Open calendar</Button>
            }
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
