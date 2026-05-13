import { motion, AnimatePresence } from 'motion/react';
import type { ReactNode } from 'react';

interface ModalTransitionProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  type?: 'slide' | 'zoom';
  className?: string;
}

export default function ModalTransition({ 
  isOpen, 
  onClose, 
  children, 
  type = 'zoom',
  className = ''
}: ModalTransitionProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Content */}
          <motion.div
            initial={type === 'slide' ? { x: '100%', opacity: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
            animate={type === 'slide' ? { x: 0, opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={type === 'slide' ? { x: '100%', opacity: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
            transition={
              type === 'slide' 
                ? { type: 'spring', damping: 25, stiffness: 200 }
                : { duration: 0.2, ease: "easeOut" }
            }
            className={`fixed z-[90] ${className}`}
            style={type === 'slide' ? { inset: 0 } : {}}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
