import { CHAPTERS, displayYear, imageUrl } from '../data/works';
import { chapterCount, chapterLabel, type Dictionary } from '../i18n';

interface Props {
  t: Dictionary;
  onOpen: (index: number) => void;
}

/** The same works as the room, as a calm grid by chapter. */
export function ListView({ t, onOpen }: Props) {
  return (
    <main id="list">
      <div className="lwrap">
        {CHAPTERS.map((c) => (
          <section className="lsec" key={c.key}>
            <h3>{chapterLabel(c, t)}</h3>
            <p>{chapterCount(c, t)}</p>
            <div className="grid">
              {c.works.map((w) => (
                <button type="button" className="card" key={w.id} onClick={() => onOpen(w.index)}>
                  <div className="ph">
                    <img
                      loading="lazy"
                      src={imageUrl(w, 'thumb')}
                      width={w.width}
                      height={w.height}
                      alt={`${w.kind === 'studio' ? t.studioPhoto : t.painting}, ${displayYear(w)}`}
                    />
                  </div>
                  <span><i>{displayYear(w)}</i></span>
                </button>
              ))}
            </div>
          </section>
        ))}
        <p className="note">{t.note}</p>
      </div>
    </main>
  );
}
