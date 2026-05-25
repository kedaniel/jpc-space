"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { fadeUp, staggerParent } from "@/lib/motion";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerReveal({ children, className }: StaggerRevealProps) {
  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className={className}
    >
      {React.Children.map(children, (child, idx) => (
        <motion.div key={idx} variants={fadeUp}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
