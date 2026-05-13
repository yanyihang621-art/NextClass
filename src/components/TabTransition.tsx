import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export default function TabTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{ position: 'absolute', inset: 0 }}
      className="flex flex-col h-full w-full"
    >
      {children}
    </motion.div>
  );
}
