import { useEffect, useRef, useState } from 'react';
import { ARTIST_NAME, ORDER, WORKS, displayYear, imageUrl } from '../data/works';
import type { Dictionary } from '../i18n';
import { ChevronLeft, ChevronRight, Close } from './icons';

interface Props {
  /** Index into WORKS, or null when closed. */
  index: number | null;
  t: Dictionary;
  onChange: (index: number) => void;
  onClose: () => void;
}

/** Full-screen view of one work with the enhanced / original comparison. */
export function DetailDialog({ index, t, onChange, onClose }: Props) {
  const open = index !== null;
  const work = index !== null ? WORKS[index] : undefined;
  const [showOriginal, setShowOriginal] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const swipeX = useRef<number | null>(null);

  const position = work ? ORDER.findIndex((w) => w.index === work.index) : -1;
  const step = (dir: 1 | -1) => {
    if (position < 0) return;
    const next = ORDER[(position + dir + ORDER.length) % ORDER.length];
    if (next) onChange(next.index);
  };

  useEffect(() => setShowOriginal(false), [index]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div id="detail" className={open ? 'open' : ''} role="dialog" aria-modal="true" aria-labelledby="dTitle" aria-hidden={!open}>
      <button ref={closeRef} type="button" className="round dclose" aria-label={t.close} onClick={onClose}><Close /></button>
      <div
        className="dimg"
        onPointerDown={(e) => { swipeX.current = e.clientX; }}
        onPointerUp={(e) => {
          const x0 = swipeX.current;
          swipeX.current = null;
          if (x0 !== null && Math.abs(e.clientX - x0) > 50) step(e.clientX < x0 ? 1 : -1);
          else if (e.target === e.currentTarget) onClose();
        }}
      >
        {work && (
          <img
            src={imageUrl(work, showOriginal ? 'original' : 'full')}
            alt={`${work.kind === 'studio' ? t.studioPhoto : t.painting}, ${displayYear(work)}`}
          />
        )}
      </div>
      <div className="dinfo">
        <div className="who">{ARTIST_NAME}</div>
        <h4 id="dTitle">{work ? displayYear(work) : ''}</h4>
        <div className="seg" role="group" aria-label={t.compare}>
          <button type="button" aria-pressed={!showOriginal} onClick={() => setShowOriginal(false)}>{t.after}</button>
          <button type="button" aria-pressed={showOriginal} onClick={() => setShowOriginal(true)}>{t.before}</button>
        </div>
        <p className="fine">{showOriginal ? t.fineBefore : t.fine}</p>
        <div className="dnav">
          <button type="button" className="round" aria-label={t.prev} onClick={() => step(-1)}><ChevronLeft /></button>
          <button type="button" className="round" aria-label={t.next} onClick={() => step(1)}><ChevronRight /></button>
          <span className="count">{position + 1} {t.of} {ORDER.length}</span>
        </div>
      </div>
    </div>
  );
}
