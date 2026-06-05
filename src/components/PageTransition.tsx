import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import SwipeBack from './SwipeBack';

interface PageTransitionProps {
  children: ReactNode;
  /** Optional CSS class on the wrapper */
  className?: string;
}

/**
 * Wraps a page in a slide-in-from-right / slide-out-left animation.
 * Used for non-tab pages (CourseEditor, NextClass, etc.).
 *
 * Also enables swipe-from-left-edge to navigate back (iOS-style).
 */
export default function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ x: '30%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-30%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className={className}
      style={{ position: 'absolute', inset: 0 }}
    >
      <SwipeBack>
        {children}
      </SwipeBack>
    </motion.div>
  );
}
