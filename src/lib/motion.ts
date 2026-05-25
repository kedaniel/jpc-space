import type { Transition, Variants } from "framer-motion";

export const easeOutSoft: Transition["ease"] = [0.22, 1, 0.36, 1];

export const springSoft: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 28,
  mass: 0.6,
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: easeOutSoft },
  },
  exit: {
    opacity: 0,
    y: -2,
    transition: { duration: 0.12, ease: easeOutSoft },
  },
};

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: easeOutSoft },
  },
};

export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: easeOutSoft } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: easeOutSoft } },
};

export const staggerParent: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
};

export const tap = { scale: 0.97 } as const;
export const hoverLift = { y: -2 } as const;

export const modalDesktop: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.18, ease: easeOutSoft },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.12, ease: easeOutSoft },
  },
};

export const modalMobile: Variants = {
  initial: { y: "100%" },
  animate: { y: 0, transition: springSoft },
  exit: { y: "100%", transition: { duration: 0.18, ease: easeOutSoft } },
};
