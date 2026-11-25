import { ARTIST_NAME, SIGNATURE_IMAGE } from '../data/works';
import type { Dictionary, Lang } from '../i18n';
import type { View } from '../App';
import { LanguageSwitch } from './LanguageSwitch';

interface Props {
  view: View;
  roomAvailable: boolean;
  lang: Lang;
  t: Dictionary;
  onLang: (lang: Lang) => void;
  onView: (view: View) => void;
}

export function TopBar({ view, roomAvailable, lang, t, onLang, onView }: Props) {
  return (
    <header className="hud top">
      <button type="button" id="home" className="brand" title={t.home} onClick={() => onView('intro')}>
        <span>{ARTIST_NAME}</span>
        <img src={SIGNATURE_IMAGE} width={900} height={290} alt={ARTIST_NAME} />
      </button>
      <div className="tools">
        <div className="seg" role="group" aria-label={t.viewLabel}>
          {roomAvailable && (
            <button id="vRoom" type="button" aria-pressed={view === 'room'} onClick={() => onView('room')}>{t.room}</button>
          )}
          <button id="vList" type="button" aria-pressed={view === 'list'} onClick={() => onView('list')}>{t.list}</button>
        </div>
        <LanguageSwitch lang={lang} onChange={onLang} label={t.languageLabel} />
      </div>
    </header>
  );
}
