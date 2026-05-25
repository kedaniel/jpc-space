"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { pageTransition } from "@/lib/motion";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
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
