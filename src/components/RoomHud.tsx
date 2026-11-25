import { useEffect, useRef } from 'react';
import { CHAPTERS } from '../data/works';
import { chapterCount, chapterLabel, type Dictionary } from '../i18n';
import type { HudState } from '../room/ShowroomEngine';
import { ChevronLeft, ChevronRight } from './icons';

interface Props {
  hud: HudState;
  t: Dictionary;
  onStep: (dir: 1 | -1) => void;
  onChapter: (index: number) => void;
}

/** Overlay for the 3D room: where you are, prev/next, and the chapter row. */
export function RoomHud({ hud, t, onStep, onChapter }: Props) {
  const current = CHAPTERS[hud.chapter] ?? CHAPTERS[0]!;
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    buttons.current[hud.chapter]?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [hud.chapter]);

  return (
    <>
      <div className="hud room where" aria-live="polite">
        <small>{t.walking}</small>
        <h2>{chapterLabel(current, t)} · {chapterCount(current, t)}</h2>
        <div className="hint">{hud.focused ? t.hintFocus : t.hint}</div>
      </div>
      <div className="hud room nav">
        <button type="button" id="prev" className="round" aria-label={t.prev} onClick={() => onStep(-1)}><ChevronLeft /></button>
        <button type="button" id="next" className="round" aria-label={t.next} onClick={() => onStep(1)}><ChevronRight /></button>
      </div>
      <nav className="hud room chapters" aria-label={t.chaptersLabel}>
        {CHAPTERS.map((c, k) => (
          <button
            key={c.key}
            data-ch={k}
            type="button"
            ref={(el) => { buttons.current[k] = el; }}
            aria-current={k === hud.chapter}
            onClick={() => onChapter(k)}
          >
            {chapterLabel(c, t)}
          </button>
        ))}
      </nav>
    </>
  );
}
