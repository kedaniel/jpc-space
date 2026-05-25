"use client";

import * as React from "react";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "jpc:sidebar:collapsed";

const STORE_LISTENERS = new Set<() => void>();

function subscribe(callback: () => void) {
  STORE_LISTENERS.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    STORE_LISTENERS.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function notify() {
  STORE_LISTENERS.forEach((listener) => listener());
}

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const collapsed = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setCollapsed = React.useCallback((value: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      // ignore — private mode or storage disabled
    }
    notify();
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const value = React.useMemo(
    () => ({ collapsed, setCollapsed, toggle }),
    [collapsed, setCollapsed, toggle],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used inside SidebarProvider");
  }
  return ctx;
}
