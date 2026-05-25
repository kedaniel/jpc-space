"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/layout/nav-link";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { springSoft } from "@/lib/motion";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface ShellFrameProps {
  sidebarItems: NavItem[];
  tabItems: NavItem[];
  topBar: React.ReactNode;
  children: React.ReactNode;
}

export function ShellFrame(props: ShellFrameProps) {
  return (
    <SidebarProvider>
      <ShellFrameInner {...props} />
    </SidebarProvider>
  );
}

function ShellFrameInner({
  sidebarItems,
  tabItems,
  topBar,
  children,
}: ShellFrameProps) {
  const { collapsed, toggle } = useSidebar();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 256 }}
        transition={springSoft}
        className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl md:flex"
      >
        <div className="relative flex flex-col items-center justify-center gap-3 border-b border-sidebar-border bg-gradient-to-b from-primary/10 to-transparent py-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-brand-teal-500 to-brand-navy-900 opacity-40 blur-md" />
            <Image
              src="/jpc-logo.jpg"
              alt="JPC Space"
              width={80}
              height={80}
              priority
              className={cn(
                "relative rounded-3xl ring-1 ring-white/10 transition-all duration-300",
                collapsed ? "size-[50px]" : "size-20",
              )}
            />
          </div>
          {!collapsed && (
            <div className="text-center">
              <h1 className="px-2 text-lg font-bold text-white">JPC Space</h1>
              <p className="text-xs text-white/60">Jesus Project Community</p>
            </div>
          )}
        </div>

        <nav
          aria-label="Primary"
          className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-6"
        >
          {sidebarItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              variant="sidebar"
              compact={collapsed}
            />
          ))}
        </nav>

        <div className="flex items-center justify-center border-t border-sidebar-border py-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="size-8 text-white/70 hover:bg-sidebar-accent hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {topBar}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">
          {children}
        </main>

        <nav
          aria-label="Primary"
          className="jpc-glass fixed inset-x-0 bottom-0 z-30 flex border-t border-border px-2 py-1 md:hidden"
        >
          {tabItems.slice(0, 5).map((item) => (
            <NavLink key={item.href} {...item} variant="tab" />
          ))}
        </nav>
      </div>
    </div>
  );
}
