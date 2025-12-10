import { useRef } from 'react';
import { useSwipeable } from 'react-swipeable';

export function useSwipeToClose(onClose: () => void) {
  const pageRef = useRef<HTMLDivElement>(null);

  const swipeHandlers = useSwipeable({
    onSwipedDown: () => {
      // Only trigger if swiping from top area (not mid-scroll)
      if (pageRef.current && pageRef.current.scrollTop < 50) {
        onClose();
      }
    },
    trackTouch: true,
    trackMouse: false,
  });

  return { pageRef, swipeHandlers };
}
