import { useEffect, useRef, type MutableRefObject } from 'react';
import { ShowroomEngine, type HudState } from '../room/ShowroomEngine';
import type { Work } from '../data/works';

interface Props {
  ariaLabel: string;
  engineRef: MutableRefObject<ShowroomEngine | null>;
  onHud: (state: HudState) => void;
  onOpen: (work: Work) => void;
  /** Called once if WebGL cannot start; the app then falls back to the list. */
  onUnavailable: () => void;
  /** Called once the engine exists, so painted labels can be drawn. */
  onReady: () => void;
}

/** Owns the canvas and the lifetime of the three.js engine. */
export function Showroom({ ariaLabel, engineRef, onHud, onOpen, onUnavailable, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Keep the latest callbacks without re-creating the engine.
  const handlers = useRef({ onHud, onOpen });
  handlers.current = { onHud, onOpen };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: ShowroomEngine;
    try {
      engine = new ShowroomEngine(
        canvas,
        {
          onHud: (s) => handlers.current.onHud(s),
          onOpen: (w) => handlers.current.onOpen(w),
        },
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      );
    } catch {
      onUnavailable();
      return;
    }
    engineRef.current = engine;
    onReady();
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // The engine is created once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas id="stage" ref={canvasRef} aria-label={ariaLabel} />;
}
