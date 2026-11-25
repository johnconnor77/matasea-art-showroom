import { useCallback, useEffect, useRef, useState } from 'react';
import { ARTIST_NAME, displayYear } from './data/works';
import { chapterCount, chapterLabel, useLanguage } from './i18n';
import type { HudState, ShowroomEngine } from './room/ShowroomEngine';
import { DetailDialog } from './components/DetailDialog';
import { Intro } from './components/Intro';
import { ListView } from './components/ListView';
import { RoomHud } from './components/RoomHud';
import { Showroom } from './components/Showroom';
import { TopBar } from './components/TopBar';

export type View = 'intro' | 'room' | 'list';

/** Resolves when the display fonts can be painted onto canvases (or after 2.5 s). */
const fontsReady: Promise<unknown> =
  'fonts' in document
    ? Promise.race([
        Promise.all([
          document.fonts.load('64px "Instrument Serif"'),
          document.fonts.load('italic 44px "Instrument Serif"'),
          document.fonts.load('600 30px "Hanken Grotesk"'),
        ]),
        new Promise((r) => setTimeout(r, 2500)),
      ]).catch(() => undefined)
    : Promise.resolve();

export default function App() {
  const { lang, setLang, t } = useLanguage();
  const [view, setView] = useState<View>('intro');
  const [detail, setDetail] = useState<number | null>(null);
  const [hud, setHud] = useState<HudState>({ chapter: 0, focused: false });
  const [roomAvailable, setRoomAvailable] = useState(true);
  const [engineReady, setEngineReady] = useState(false);
  const engine = useRef<ShowroomEngine | null>(null);

  const go = useCallback((next: View) => setView(next === 'room' && !roomAvailable ? 'list' : next), [roomAvailable]);

  // The stylesheet keys the HUD and list visibility off classes on <body>.
  useEffect(() => {
    document.body.classList.toggle('at-intro', view === 'intro');
    document.body.classList.toggle('at-list', view === 'list');
  }, [view]);

  // Only the visible room renders and listens to input.
  useEffect(() => {
    engine.current?.setActive(view === 'room' && detail === null);
  }, [view, detail, engineReady]);

  // Paint wall labels and chapter titles in the current language.
  useEffect(() => {
    if (!engineReady) return;
    let cancelled = false;
    void fontsReady.then(() => {
      if (cancelled) return;
      engine.current?.relabel({
        artist: ARTIST_NAME,
        year: displayYear,
        chapterTitle: (c) => chapterLabel(c, t),
        chapterCount: (c) => chapterCount(c, t),
      });
    });
    return () => { cancelled = true; };
  }, [engineReady, t]);

  // Arrow keys, Enter and Esc drive the room when no dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (detail === null && view === 'room') engine.current?.handleKey(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, detail]);

  const goChapter = (index: number) => {
    engine.current?.goChapter(index);
    if (view !== 'room') go('room');
  };

  return (
    <>
      <Showroom
        ariaLabel={t.stage}
        engineRef={engine}
        onHud={setHud}
        onOpen={(w) => setDetail(w.index)}
        onUnavailable={() => setRoomAvailable(false)}
        onReady={() => setEngineReady(true)}
      />
      <Intro
        visible={view === 'intro'}
        lang={lang}
        t={t}
        onLang={setLang}
        onEnter={() => go('room')}
        onList={() => go('list')}
      />
      <TopBar view={view} roomAvailable={roomAvailable} lang={lang} t={t} onLang={setLang} onView={go} />
      <RoomHud hud={hud} t={t} onStep={(d) => engine.current?.step(d)} onChapter={goChapter} />
      <ListView t={t} onOpen={setDetail} />
      <DetailDialog index={detail} t={t} onChange={setDetail} onClose={() => setDetail(null)} />
    </>
  );
}
