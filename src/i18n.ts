import { useCallback, useEffect, useState } from 'react';
import type { Chapter } from './data/works';

export type Lang = 'es' | 'en';

export interface Dictionary {
  sub: string;
  enter: string;
  asList: string;
  room: string;
  list: string;
  viewLabel: string;
  walking: string;
  hint: string;
  hintFocus: string;
  studio: string;
  works: (n: number) => string;
  photos: (n: number) => string;
  painting: string;
  studioPhoto: string;
  prev: string;
  next: string;
  close: string;
  compare: string;
  after: string;
  before: string;
  home: string;
  chaptersLabel: string;
  fine: string;
  fineBefore: string;
  note: string;
  sigAlt: string;
  heroAlt: string;
  of: string;
  stage: string;
  languageLabel: string;
}

export const DICTIONARY: Record<Lang, Dictionary> = {
  es: {
    sub: 'Pintura · Archivo 2021–2026',
    enter: 'Entrar a la sala',
    asList: 'Ver como lista',
    room: 'Sala',
    list: 'Lista',
    viewLabel: 'Vista',
    walking: 'Está recorriendo',
    hint: 'Desplace o arrastre para recorrer · Toque una obra para acercarse',
    hintFocus: 'Toque la obra de nuevo para abrirla · Esc para volver',
    studio: 'Taller',
    works: (n) => `${n} ${n === 1 ? 'obra' : 'obras'}`,
    photos: (n) => `${n} fotografías`,
    painting: 'Pintura',
    studioPhoto: 'Fotografía del taller',
    prev: 'Anterior',
    next: 'Siguiente',
    close: 'Cerrar',
    compare: 'Comparar',
    after: 'Mejorada',
    before: 'Original',
    home: 'Volver a la portada',
    chaptersLabel: 'Capítulos',
    fine: 'Imagen mejorada a partir de una foto de WhatsApp: recorte, corrección de perspectiva, limpieza de compresión y nitidez ligera. Sin detalles añadidos.',
    fineBefore: 'Foto de WhatsApp recortada y enderezada, sin otras mejoras.',
    note: 'Imágenes tomadas de fotos de WhatsApp con mejora ligera.',
    sigAlt: 'Firma del artista: Matassea',
    heroAlt: 'Silueta del artista sentado junto a una ventana en arco, con luz de tarde sobre el piso de madera',
    of: 'de',
    stage: 'Sala de exposición en 3D',
    languageLabel: 'Idioma / Language',
  },
  en: {
    sub: 'Painting · Archive 2021–2026',
    enter: 'Enter the showroom',
    asList: 'View as list',
    room: 'Room',
    list: 'List',
    viewLabel: 'View',
    walking: 'You are walking through',
    hint: 'Scroll or drag to walk round · Click a work to look closer',
    hintFocus: 'Click the work again to open it · Esc to step back',
    studio: 'Studio',
    works: (n) => `${n} ${n === 1 ? 'work' : 'works'}`,
    photos: (n) => `${n} photographs`,
    painting: 'Painting',
    studioPhoto: 'Studio photograph',
    prev: 'Previous',
    next: 'Next',
    close: 'Close',
    compare: 'Compare',
    after: 'Enhanced',
    before: 'Original',
    home: 'Back to the cover',
    chaptersLabel: 'Chapters',
    fine: 'Enhanced from a WhatsApp photo: cropped, perspective corrected, compression cleaned and lightly sharpened. No detail added.',
    fineBefore: 'WhatsApp photo, cropped and straightened, no other changes.',
    note: 'Images come from WhatsApp photos with light enhancement.',
    sigAlt: "The artist's signature: Matassea",
    heroAlt: 'Silhouette of the artist seated by an arched window, late light across a wooden floor',
    of: 'of',
    stage: '3D exhibition room',
    languageLabel: 'Idioma / Language',
  },
};

export const chapterLabel = (c: Chapter, t: Dictionary): string =>
  c.key === 'studio' ? t.studio : c.key.replace('-', '–');

export const chapterCount = (c: Chapter, t: Dictionary): string =>
  c.key === 'studio' ? t.photos(c.works.length) : t.works(c.works.length);

const STORAGE_KEY = 'emm-lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* storage unavailable: fall through to the browser language */
  }
  return (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
}

/** Current language, persisted per browser, with the matching dictionary. */
export function useLanguage() {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return { lang, setLang, t: DICTIONARY[lang] };
}
