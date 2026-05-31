import { useState, useRef, useCallback } from 'react';

// Walk up from a node to find the nearest scrollable ancestor that actually
// overflows. Returns null if none (treated as "at top").
function findScrollParent(node) {
  let el = node;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.nodeType === 1) {
      const s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2) return el;
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * usePullToRefresh — native-feeling pull-to-refresh for a fixed-height app.
 *
 * Returns a *callback ref* (`containerRef`) to spread onto the scrollable
 * container. Using a callback ref (not a ref object) means listeners attach
 * exactly when the element mounts — robust against the element appearing after
 * an initial loading screen, where a ref-object effect would attach to null
 * and never re-run.
 *
 * Unlike a naive `window.scrollY === 0` check, this finds the actual scrolled
 * container under the touch and only engages when IT is at the top. Works with
 * both touch (mobile) and mouse drag (desktop). Calls onRefresh() and shows a
 * spinner until it resolves — no full page reload.
 *
 * @param {() => Promise<void>} onRefresh - async refresh handler
 * @returns {{ containerRef:Function, pull:number, progress:number, refreshing:boolean, threshold:number }}
 */
export function usePullToRefresh(onRefresh, { threshold = 80, max = 120 } = {}) {
  const [pull,       setPull]       = useState(0);   // visual pull distance (px, damped)
  const [refreshing, setRefreshing] = useState(false);

  const st          = useRef({ active: false, startY: 0, atTop: false, engaged: false });
  const pullRef     = useRef(0);
  const refreshing_ = useRef(false);
  const cleanupRef  = useRef(null);

  const setPullVal = (v) => { pullRef.current = v; setPull(v); };

  // Callback ref: React invokes this with the node on mount, and null on unmount.
  const containerRef = useCallback((el) => {
    // Detach from any previous element
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    if (!el) return;

    const begin = (clientY, target) => {
      if (refreshing_.current) return;
      const sc = findScrollParent(target);
      st.current = { active: true, startY: clientY, atTop: !sc || sc.scrollTop <= 0, engaged: false };
    };

    // Returns true when the pull is engaged (caller may preventDefault).
    const move = (clientY) => {
      const s = st.current;
      if (!s.active || refreshing_.current) return false;
      const dy = clientY - s.startY;
      if (s.atTop && dy > 0) {
        s.engaged = true;
        setPullVal(Math.min(max, dy * 0.5)); // resistance
        return true;
      }
      if (s.engaged) { s.engaged = false; setPullVal(0); }
      return false;
    };

    const end = async () => {
      const s = st.current;
      if (!s.active) return;
      s.active = false;
      if (s.engaged && pullRef.current >= threshold && !refreshing_.current) {
        refreshing_.current = true; setRefreshing(true);
        setPullVal(threshold); // snap to spinner resting position
        try { await onRefresh?.(); }
        finally {
          refreshing_.current = false; setRefreshing(false);
          setPullVal(0);
        }
      } else {
        setPullVal(0);
      }
      s.engaged = false;
    };

    const onTouchStart = (e) => begin(e.touches[0].clientY, e.target);
    const onTouchMove  = (e) => { if (move(e.touches[0].clientY)) e.preventDefault(); };
    const onTouchEnd   = () => end();
    const onMouseDown  = (e) => { if (e.button === 0) begin(e.clientY, e.target); };
    const onMouseMove  = (e) => { move(e.clientY); };
    const onMouseUp    = () => end();

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false }); // non-passive → can preventDefault
    el.addEventListener('touchend',   onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    el.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);

    cleanupRef.current = () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('mousedown',  onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, [onRefresh, threshold, max]);

  return { containerRef, pull, progress: Math.min(pull / threshold, 1), refreshing, threshold };
}
