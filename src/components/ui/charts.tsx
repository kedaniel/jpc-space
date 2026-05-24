"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { categoricalPalette, chartColors } from "@/lib/chart-colors";

interface BaseChartCardProps {
  title: string;
  description?: string;
  className?: string;
  height?: number;
}

export interface LineChartCardProps extends BaseChartCardProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  yLabel?: string;
}

export function LineChartCard({
  title,
  description,
  className,
  height = 240,
  data,
  xKey,
  yKey,
  yLabel,
}: LineChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={chartColors.neutral[200]} vertical={false} />
              <XAxis
                dataKey={xKey}
                stroke={chartColors.neutral[600]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: chartColors.neutral[200] }}
              />
              <YAxis
                stroke={chartColors.neutral[600]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: chartColors.neutral[200] }}
                label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 } : undefined}
              />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: `1px solid ${chartColors.neutral[200]}`,
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke={chartColors.brandTeal[700]}
                strokeWidth={2}
                dot={{ fill: chartColors.brandTeal[700], r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export interface BarChartCardProps extends BaseChartCardProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
}

export function BarChartCard({
  title,
  description,
  className,
  height = 240,
  data,
  xKey,
  yKey,
}: BarChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={chartColors.neutral[200]} vertical={false} />
              <XAxis
                dataKey={xKey}
                stroke={chartColors.neutral[600]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: chartColors.neutral[200] }}
              />
              <YAxis
                stroke={chartColors.neutral[600]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: chartColors.neutral[200] }}
              />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: `1px solid ${chartColors.neutral[200]}`,
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Bar dataKey={yKey} fill={chartColors.brandTeal[500]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export interface PieChartCardProps extends BaseChartCardProps {
  data: Array<{ name: string; value: number }>;
}

export function PieChartCard({
  title,
  description,
  className,
  height = 240,
  data,
}: PieChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer>
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: `1px solid ${chartColors.neutral[200]}`,
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                label={({ name }) => name ?? ""}
                labelLine={false}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={categoricalPalette[idx % categoricalPalette.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export interface ChartLegendItem {
  label: string;
  color: string;
}

export function ChartLegend({ items, className }: { items: ChartLegendItem[]; className?: string }) {
  return (
    <ul className={cn("mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground", className)}>
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
