import { useRef, useState, useCallback, type ReactNode, type TouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';

interface SwipeBackProps {
  children: ReactNode;
  /** Width of the left-edge touch zone in px (default 28) */
  edgeWidth?: number;
  /** Horizontal distance required to trigger navigation (default 100) */
  threshold?: number;
}

/**
 * Wraps a page and enables iOS-style swipe-from-left-edge to go back.
 *
 * Implementation:
 *  - Only starts tracking if the touch begins within `edgeWidth` px of the
 *    left viewport edge.
 *  - As the user drags right, the page translates with the finger and fades
 *    out proportionally.
 *  - If the drag exceeds `threshold` px, `navigate(-1)` fires on release.
 *  - Otherwise the page springs back to its original position.
 *
 * Uses raw touch events (no extra deps) to stay lightweight and avoid
 * conflicts with horizontal scrolling inside the page.
 */
export default function SwipeBack({
  children,
  edgeWidth = 28,
  threshold = 100,
}: SwipeBackProps) {
  const navigate = useNavigate();

  // ── Touch tracking refs (not state, to avoid re-renders mid-gesture) ──
  const tracking = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const directionLocked = useRef(false);
  const isHorizontal = useRef(false);

  // ── Visual feedback (needs state so the DOM re-renders) ──
  const [offsetX, setOffsetX] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      const touch = e.touches[0];
      // Only activate when touch starts near the left edge
      if (touch.clientX > edgeWidth) return;

      tracking.current = true;
      directionLocked.current = false;
      isHorizontal.current = false;
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      setTransitioning(false);
    },
    [edgeWidth],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (!tracking.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;

      // Lock direction after a small movement
      if (!directionLocked.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        directionLocked.current = true;
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
        if (!isHorizontal.current) {
          // Vertical scroll – bail out entirely
          tracking.current = false;
          setOffsetX(0);
          return;
        }
      }

      if (isHorizontal.current && dx > 0) {
        // Prevent vertical scroll while swiping back
        e.preventDefault();
        setOffsetX(dx);
      }
    },
    [],
  );

  const handleTouchEnd = useCallback(() => {
    if (!tracking.current) return;
    tracking.current = false;

    if (offsetX >= threshold) {
      // Swipe confirmed → animate out, then navigate
      setTransitioning(true);
      setOffsetX(window.innerWidth);
      setTimeout(() => navigate(-1), 250);
    } else {
      // Snap back
      setTransitioning(true);
      setOffsetX(0);
      setTimeout(() => setTransitioning(false), 250);
    }
  }, [offsetX, threshold, navigate]);

  // ── Derived visual values ──
  const progress = Math.min(offsetX / threshold, 1);
  const opacity = 1 - progress * 0.4;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        transform: offsetX > 0 ? `translateX(${offsetX}px)` : undefined,
        opacity,
        transition: transitioning
          ? 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
          : 'none',
        willChange: tracking.current ? 'transform, opacity' : undefined,
        position: 'relative',
        minHeight: '100%',
      }}
    >
      {/* Left-edge visual hint indicator */}
      {offsetX > 0 && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: '50%',
            transform: `translateY(-50%) scale(${0.6 + progress * 0.4})`,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: `rgba(100, 100, 100, ${0.08 + progress * 0.15})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: progress,
            transition: transitioning ? 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M9 3L5 7L9 11"
              stroke={`rgba(60, 60, 60, ${0.4 + progress * 0.5})`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      {children}
    </div>
  );
}
