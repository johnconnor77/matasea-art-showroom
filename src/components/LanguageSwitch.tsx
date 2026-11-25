import type { Lang } from '../i18n';

interface Props {
  lang: Lang;
  onChange: (lang: Lang) => void;
  label: string;
  className?: string;
}

const LANGS: Lang[] = ['es', 'en'];

export function LanguageSwitch({ lang, onChange, label, className = '' }: Props) {
  return (
    <div className={`seg ${className}`.trim()} role="group" aria-label={label}>
      {LANGS.map((l) => (
        <button key={l} type="button" data-lang={l} aria-pressed={lang === l} onClick={() => onChange(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
