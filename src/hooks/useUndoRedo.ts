import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic undo/redo state container.
 * Tracks past, present, future. Optional global Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) shortcuts.
 */
export function useUndoRedo<T>(initial: T, opts?: { maxDepth?: number; enableShortcuts?: boolean }) {
  const max = opts?.maxDepth ?? 50;
  const [state, setState] = useState<{ past: T[]; present: T; future: T[] }>({
    past: [],
    present: initial,
    future: [],
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((s) => {
        const value = typeof next === "function" ? (next as (p: T) => T)(s.present) : next;
        if (Object.is(value, s.present)) return s;
        const past = [...s.past, s.present].slice(-max);
        return { past, present: value, future: [] };
      });
    },
    [max],
  );

  const undo = useCallback(() => {
    setState((s) => {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), present: prev, future: [s.present, ...s.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return { past: [...s.past, s.present], present: next, future: s.future.slice(1) };
    });
  }, []);

  const reset = useCallback((v: T) => setState({ past: [], present: v, future: [] }), []);

  const handlerRef = useRef({ undo, redo });
  handlerRef.current = { undo, redo };

  useEffect(() => {
    if (opts?.enableShortcuts === false) return;
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); handlerRef.current.undo(); }
      else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault(); handlerRef.current.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts?.enableShortcuts]);

  return {
    value: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    historyDepth: state.past.length,
  };
}
