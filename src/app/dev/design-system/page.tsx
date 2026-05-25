import type { Metadata } from "next";
import { Bell, FileText, Inbox, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AttendancePill } from "@/components/ui/attendance-pill";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FileUpload } from "@/components/ui/file-upload";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SkeletonCard, SkeletonText } from "@/components/ui/skeleton";
import { SubmissionStatusBadge } from "@/components/ui/submission-status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DesignSystemForm } from "./form";
import {
  ElevationDemo,
  IdentityDemo,
  MotionDemo,
  ThemeDemo,
} from "./identity-demo";
import { ModalDemo } from "./modal-demo";
import { palette, semanticSwatches } from "./swatches";

export const metadata: Metadata = {
  title: "Design System — JPC Space",
};

const roles = ["super", "admin", "leader", "mentor", "student"] as const;

export default function DesignSystemPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-10">
      <PageHeader
        title="Design System"
        description="Tokens, primitives, and patterns. Reference before building any new screen."
      />

      <Section title="Identity" subtitle="Logo, wordmark, and brand mark sizes">
        <IdentityDemo />
      </Section>

      <Section title="Theme" subtitle="Light + dark via next-themes — tokens swap automatically">
        <ThemeDemo />
      </Section>

      <Section title="Motion" subtitle="framer-motion presets in src/lib/motion.ts">
        <MotionDemo />
      </Section>

      <Section title="Elevation" subtitle="Three sanctioned shadow tokens">
        <ElevationDemo />
      </Section>

      <Section title="Palette" subtitle="Brand and semantic scales">
        <div className="flex flex-col gap-6">
          {palette.map((scale) => (
            <div key={scale.name} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-foreground">
                {scale.name}
              </h3>
              <div className="grid grid-cols-6 gap-2 md:grid-cols-11">
                {scale.steps.map(({ step, className }) => (
                  <div key={step} className="flex flex-col gap-1">
                    <div
                      className={`h-10 rounded-md border border-border ${className}`}
                      aria-label={`${scale.name}-${step}`}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Semantic aliases" subtitle="Re-pointed at brand scales">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {semanticSwatches.map(({ name, className }) => (
            <div key={name} className="flex flex-col gap-1">
              <div className={`h-12 rounded-md border border-border ${className}`} />
              <span className="text-xs text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Role colors" subtitle="Used by role badges">
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <Badge key={r} role={r}>
              {r.toUpperCase()}
            </Badge>
          ))}
        </div>
      </Section>

      <Section
        title="Typography"
        subtitle="Geist Sans for all UI and headings, Geist Mono for code, Fraunces reserved for the JPC Space wordmark"
      >
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            The work between
          </h1>
          <h2 className="text-2xl font-semibold tracking-tight">
            Heading 2 — Geist Sans
          </h2>
          <h3 className="text-xl font-semibold">Heading 3 — Geist Sans</h3>
          <h4 className="text-lg font-medium">Heading 4 — Geist Sans</h4>
          <p className="max-w-2xl text-base text-foreground">
            Body text — the primary reading size for paragraphs. Geist&apos;s
            stylistic alternates are on by default (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              ss01
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              ss03
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              cv11
            </code>
            ).
          </p>
          <p className="text-sm text-muted-foreground">
            Small text — secondary metadata and descriptions.
          </p>
          <p className="text-xs text-muted-foreground">
            Caption — timestamps and overflow labels.
          </p>
          <p className="font-mono text-sm text-foreground">
            const fontMono = &quot;Geist Mono&quot;;
          </p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button size="xs">xs</Button>
            <Button size="sm">sm</Button>
            <Button size="default">default</Button>
            <Button size="lg">lg</Button>
            <Button size="icon" aria-label="add">
              <Plus />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled outline
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </Section>

      <Section title="Avatars">
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <Avatar size="sm">
              <AvatarFallback>MB</AvatarFallback>
            </Avatar>
            <Avatar size="md">
              <AvatarFallback>JP</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>AS</AvatarFallback>
            </Avatar>
            <Avatar size="xl">
              <AvatarFallback>XL</AvatarFallback>
            </Avatar>
          </div>
          <AvatarGroup max={3}>
            <Avatar size="md">
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar size="md">
              <AvatarFallback>CD</AvatarFallback>
            </Avatar>
            <Avatar size="md">
              <AvatarFallback>EF</AvatarFallback>
            </Avatar>
            <Avatar size="md">
              <AvatarFallback>GH</AvatarFallback>
            </Avatar>
            <Avatar size="md">
              <AvatarFallback>IJ</AvatarFallback>
            </Avatar>
          </AvatarGroup>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <p className="text-sm text-muted-foreground">Overview content.</p>
          </TabsContent>
          <TabsContent value="members">
            <p className="text-sm text-muted-foreground">Members content.</p>
          </TabsContent>
          <TabsContent value="activity">
            <p className="text-sm text-muted-foreground">Activity content.</p>
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Progress">
        <div className="flex flex-col gap-4 max-w-md">
          <Progress value={25} label="Quarter complete" showValue />
          <Progress value={60} label="In progress" showValue />
          <Progress value={100} label="Done" showValue />
        </div>
      </Section>

      <Section title="Attendance pills">
        <div className="flex flex-wrap gap-2">
          <AttendancePill status="PRESENT" />
          <AttendancePill status="ABSENT" />
          <AttendancePill status="EXCUSED" />
          <AttendancePill status="LATE" />
        </div>
      </Section>

      <Section title="Submission status badges">
        <div className="flex flex-wrap gap-2">
          <SubmissionStatusBadge status="DRAFT" />
          <SubmissionStatusBadge status="SUBMITTED" />
          <SubmissionStatusBadge status="REVIEWED" />
          <SubmissionStatusBadge status="RETURNED" />
        </div>
      </Section>

      <Section title="File upload">
        <FileUpload accept="image/*,.pdf" maxSizeMb={10} multiple />
      </Section>

      <Section title="Data table" subtitle="Becomes a card list at < md">
        <DataTable
          columns={demoColumns}
          rows={demoRows}
          rowKey={(r) => r.id}
        />
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Plain card</CardTitle>
              <CardDescription>
                A simple card with a header and content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Body content goes here.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>With footer</CardTitle>
              <CardDescription>Actions live in the footer.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Some body text describing the action below.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Confirm</Button>
              <Button size="sm" variant="ghost">
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      <Section title="Form fields" subtitle="React Hook Form + Zod demo">
        <DesignSystemForm />
      </Section>

      <Section title="Modal" subtitle="Bottom sheet on mobile, centered dialog on md+">
        <ModalDemo />
      </Section>

      <Section title="Empty states">
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            icon={Inbox}
            title="No items yet"
            description="When items are created, they will appear here."
          />
          <EmptyState
            icon={Search}
            title="No matches"
            description="Try a different search term."
            action={
              <Button size="sm" variant="outline">
                Clear filters
              </Button>
            }
          />
        </div>
      </Section>

      <Section title="Skeletons">
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <Separator className="my-4" />
        <SkeletonText lines={4} />
      </Section>

      <Section title="Icons" subtitle="lucide-react">
        <div className="flex flex-wrap gap-3 text-muted-foreground">
          <Bell className="size-5" />
          <FileText className="size-5" />
          <Inbox className="size-5" />
          <Plus className="size-5" />
          <Search className="size-5" />
        </div>
      </Section>
    </div>
  );
}

interface DemoRow {
  id: number;
  name: string;
  role: "SUPER" | "ADMIN" | "LEADER" | "MENTOR" | "STUDENT";
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
}

const demoRows: DemoRow[] = [
  { id: 1, name: "Alice Cohen", role: "STUDENT", status: "PRESENT" },
  { id: 2, name: "Ben Daniels", role: "STUDENT", status: "LATE" },
  { id: 3, name: "Carla Evans", role: "LEADER", status: "PRESENT" },
];

const demoColumns: DataTableColumn<DemoRow>[] = [
  { key: "name", header: "Name", cell: (r) => r.name },
  {
    key: "role",
    header: "Role",
    cell: (r) => (
      <Badge role={r.role.toLowerCase() as "super"}>{r.role}</Badge>
    ),
  },
  {
    key: "status",
    header: "Attendance",
    cell: (r) => <AttendancePill status={r.status} />,
  },
];

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-6 first:border-t-0 md:py-8">
      <div className="mb-4 flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
