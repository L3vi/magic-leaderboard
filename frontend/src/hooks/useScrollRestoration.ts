import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Per-history-entry scroll restoration.
 *
 * The app has two kinds of scrollers: the main Players/Games tabs scroll the
 * window (their `.tab-content` only sets a min-height, so the document grows
 * and scrolls), while overlay/detail pages scroll inside their own fixed
 * `.page-shell` root. Neither the browser's native restoration nor
 * react-router's window-only <ScrollRestoration> covers both — and overlay
 * pages are keyed by pathname in AnimatePresence, so they remount and reset to
 * the top on every navigation, losing your place when you hit Back.
 *
 * Positions are keyed by `location.key` (react-router assigns a unique key per
 * history entry, so Back lands on the same key it had on the way in). The
 * current offset is saved continuously by a scroll listener; on (re)mount for a
 * key we've seen, it's restored — waiting for async content to grow tall enough
 * before scrolling. Forward navigation to a brand-new entry has no saved key,
 * so the page naturally stays at the top.
 *
 * Pass a ref to the scroll container, or the string "window" for the
 * window/document scroller.
 */

// Module-level so positions survive the unmount/remount of overlay pages.
const positions = new Map<string, number>();

type Target = React.RefObject<HTMLElement | null> | "window";

const isWindow = (t: Target): t is "window" => t === "window";

interface Options {
  enabled?: boolean;
  /**
   * Freeze the history key at mount instead of tracking the live location.
   * Required for components rendered inside AnimatePresence (overlay pages):
   * they linger through an exit animation during which `useLocation()` already
   * reports the *new* route, so a live key would make the exiting page adopt —
   * and corrupt — the incoming page's saved offset. A frozen key stays bound to
   * the entry the instance was mounted for. Persistent layers (MainLayout) must
   * NOT freeze, since they never remount and need the key to follow navigation.
   */
  freezeKey?: boolean;
}

export function useScrollRestoration(target: Target, options: Options = {}) {
  const { enabled = true, freezeKey = false } = options;
  const location = useLocation();
  const frozenKey = useRef(location.key);
  const locationKey = freezeKey ? frozenKey.current : location.key;
  // Namespace by scroller type: the always-mounted MainLayout restores the
  // window for every route (including while an overlay is open), and overlay
  // pages restore their own container — both for the same location.key. Without
  // separate namespaces they'd overwrite each other's saved offset.
  const key = (isWindow(target) ? "w:" : "c:") + locationKey;

  useEffect(() => {
    if (!enabled) return;

    const getNode = (): HTMLElement | null =>
      isWindow(target)
        ? (document.scrollingElement as HTMLElement | null)
        : target.current;

    const getScrollTop = () => {
      if (isWindow(target)) return window.scrollY;
      return target.current ? target.current.scrollTop : 0;
    };
    const setScrollTop = (y: number) => {
      if (isWindow(target)) window.scrollTo(0, y);
      else if (target.current) target.current.scrollTop = y;
    };
    const eventSource: Window | HTMLElement | null = isWindow(target)
      ? window
      : target.current;
    if (!eventSource) return;

    // --- Save: keep the stored offset current while mounted.
    const save = () => positions.set(key, getScrollTop());
    eventSource.addEventListener("scroll", save, { passive: true });

    // --- Restore: only when we have a non-trivial saved offset for this entry.
    // Content (Firestore-backed lists) may not be laid out yet, so poll on
    // animation frames until the scroller is tall enough to reach the target,
    // capped at ~2s so a now-shorter page never spins. On a Back navigation the
    // session data is already warm, so this typically lands within a frame.
    const target_ = positions.get(key) ?? 0;
    let done = target_ <= 0;
    let raf = 0;
    const MAX_FRAMES = 120;

    const attempt = (frame: number) => {
      if (done) return;
      const node = getNode();
      if (node && node.scrollHeight - node.clientHeight >= target_) {
        setScrollTop(target_);
        done = true;
        return;
      }
      if (frame >= MAX_FRAMES) {
        // Best effort: clamp to whatever is reachable now.
        if (node) setScrollTop(target_);
        done = true;
        return;
      }
      raf = requestAnimationFrame(() => attempt(frame + 1));
    };
    if (!done) attempt(0);

    return () => {
      done = true;
      // Intentionally NOT saving here: the live scroll listener already keeps
      // positions[key] current during real interaction. An overlay page lingers
      // through a framer-motion exit, and its scrollTop collapses to 0 as it
      // tears down — a cleanup save would read that spurious 0 and clobber the
      // real offset.
      eventSource.removeEventListener("scroll", save);
      if (raf) cancelAnimationFrame(raf);
    };
    // Re-runs per history entry. target/enabled are stable across a key's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
}
