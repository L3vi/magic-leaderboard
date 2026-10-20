import { useEffect, useRef, type RefObject } from 'react';
import { animate, type MotionValue } from 'framer-motion';

// A swipe must begin this close to the left edge. Wide enough to be easy to
// hit, narrow enough that a stray horizontal drag mid-screen does nothing.
// (In Safari the outermost strip belongs to the browser's own back gesture;
// in a home-screen install there is no such gesture, which is why we need one.)
const EDGE_PX = 40;
// Movement before we commit to "horizontal swipe" vs "vertical scroll".
const LOCK_PX = 10;
// Release past this fraction of the page width, or faster than this, closes.
const CLOSE_FRACTION = 0.3;
const CLOSE_VELOCITY = 0.5; // px per ms

/**
 * Swipe right from the left edge to close an overlay page. The page follows
 * the finger via `x` (a framer-motion value the caller puts on the element's
 * style), snaps back if released early, and slides off then calls `onClose`
 * if released past the threshold.
 *
 * Only an edge-started, clearly horizontal drag is claimed; everything else is
 * left to the browser, so vertical scrolling and taps are unaffected. The
 * element should set `touch-action: pan-y` so the browser never starts a
 * competing horizontal pan.
 */
export function useSwipeToClose(
  ref: RefObject<HTMLElement | null>,
  x: MotionValue<number>,
  onClose: () => void
) {
  // Pages recreate onClose every render; keep the latest without re-binding.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false; // touch began at the edge, still watching it
    let dragging = false; // committed to a horizontal swipe

    const settleBack = () => {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        tracking = false;
        return;
      }
      const t = e.touches[0];
      tracking = t.clientX <= EDGE_PX;
      dragging = false;
      startX = t.clientX;
      startY = t.clientY;
      startT = e.timeStamp;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!dragging) {
        if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
        // Decide once: rightward and more sideways than vertical, or give up.
        if (dx <= 0 || Math.abs(dx) < Math.abs(dy)) {
          tracking = false;
          return;
        }
        dragging = true;
      }
      // Ours now — stop the page scrolling underneath the drag.
      e.preventDefault();
      x.set(Math.max(0, dx));
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      if (!dragging) return;
      dragging = false;
      const dx = x.get();
      const velocity = dx / Math.max(1, e.timeStamp - startT);
      const width = el.clientWidth || window.innerWidth;
      if (dx > width * CLOSE_FRACTION || velocity > CLOSE_VELOCITY) {
        animate(x, width, { duration: 0.15, ease: 'easeOut' }).then(() => onCloseRef.current());
      } else {
        settleBack();
      }
    };

    const onTouchCancel = () => {
      if (dragging) settleBack();
      tracking = false;
      dragging = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchCancel);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [ref, x]);
}
