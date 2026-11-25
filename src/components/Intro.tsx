import { ARTIST_NAME, HERO_IMAGE, SIGNATURE_IMAGE } from '../data/works';
import type { Dictionary, Lang } from '../i18n';
import { LanguageSwitch } from './LanguageSwitch';

interface Props {
  visible: boolean;
  lang: Lang;
  t: Dictionary;
  onLang: (lang: Lang) => void;
  onEnter: () => void;
  onList: () => void;
}

/** The cover: arched-window portrait, name, signature and the two ways in. */
export function Intro({ visible, lang, t, onLang, onEnter, onList }: Props) {
  return (
    <section id="intro" className={visible ? '' : 'gone'} aria-labelledby="name" aria-hidden={!visible}>
      <LanguageSwitch className="langs" lang={lang} onChange={onLang} label={t.languageLabel} />
      <div className="door">
        <div className="arch">
          <img src={HERO_IMAGE} alt={t.heroAlt} width={952} height={1093} />
        </div>
        <h1 id="name">{ARTIST_NAME}</h1>
        <img className="sig" src={SIGNATURE_IMAGE} width={900} height={290} alt={t.sigAlt} />
        <p>{t.sub}</p>
        <div className="cta">
          <button type="button" id="enter" className="btn main" onClick={onEnter}>{t.enter}</button>
          <button type="button" id="enterList" className="btn" onClick={onList}>{t.asList}</button>
        </div>
      </div>
    </section>
  );
}
