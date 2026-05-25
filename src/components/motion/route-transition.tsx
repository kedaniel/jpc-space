"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { pageTransition } from "@/lib/motion";

export function RouteTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      className="contents"
    >
      {children}
    </motion.div>
  );
}
