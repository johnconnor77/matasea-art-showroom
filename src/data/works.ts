/**
 * The works shown in the showroom, in wall order.
 *
 * Each image exists in /public/img in three versions:
 *   `<id>.webp`    enhanced, long edge up to 1600 px (detail view, close-up textures)
 *   `<id>-t.webp`  enhanced thumbnail, long edge 520 px (list view, distant textures)
 *   `<id>-o.webp`  cropped and straightened only, no enhancement ("Original" view)
 */

export type WorkKind = 'painting' | 'studio';
export type ChapterKey = '2021-2022' | '2023' | '2024' | '2025' | '2026' | 'studio';

export interface Work {
  /** File stem in /public/img, e.g. "2025-19". */
  id: string;
  /** Year as written in the file names, e.g. "2021-2022". */
  year: string;
  kind: WorkKind;
  /** Pixel size of the enhanced image. */
  width: number;
  height: number;
  /** Position in WORKS (stable across views). */
  index: number;
}

export interface Chapter {
  key: ChapterKey;
  works: Work[];
}

type Row = [id: string, year: string, kind: 'p' | 's', width: number, height: number];

const ROWS: Row[] = [
  ['2021-2022-11', '2021-2022', 'p', 1107, 1600],
  ['2021-2022-12', '2021-2022', 'p', 1073, 671],
  ['2021-2022-19', '2021-2022', 'p', 1134, 246],
  ['2021-2022-27', '2021-2022', 'p', 1236, 614],
  ['2021-2022-30', '2021-2022', 'p', 1600, 1314],
  ['2021-2022-34', '2021-2022', 'p', 1412, 1194],
  ['2023-08', '2023', 'p', 1600, 779],
  ['2023-15', '2023', 'p', 1600, 1030],
  ['2023-24', '2023', 'p', 1227, 1186],
  ['2023-33', '2023', 'p', 1583, 1600],
  ['2023-35', '2023', 'p', 888, 837],
  ['2024-04', '2024', 'p', 545, 1080],
  ['2024-19', '2024', 'p', 1218, 892],
  ['2024-23', '2024', 'p', 1150, 851],
  ['2025-05', '2025', 'p', 681, 604],
  ['2025-08', '2025', 'p', 1248, 491],
  ['2025-10', '2025', 'p', 1274, 780],
  ['2025-16', '2025', 'p', 1106, 722],
  ['2025-19', '2025', 'p', 1592, 1102],
  ['2025-23', '2025', 'p', 1191, 494],
  ['2025-24', '2025', 'p', 1465, 771],
  ['2025-25', '2025', 'p', 1272, 951],
  ['2025-26', '2025', 'p', 1224, 604],
  ['2026-02', '2026', 'p', 888, 1120],
  ['2026-08', '2026', 'p', 1590, 1190],
  ['2026-10', '2026', 'p', 1152, 800],
  ['2026-12', '2026', 'p', 1052, 887],
  ['2026-14', '2026', 'p', 1320, 690],
  ['2026-15', '2026', 'p', 952, 1272],
  ['2026-19', '2026', 'p', 1265, 1270],
  ['2026-20', '2026', 'p', 1270, 1196],
  ['2026-21', '2026', 'p', 1199, 662],
  ['2026-23', '2026', 'p', 1211, 760],
  ['2026-26', '2026', 'p', 1265, 1270],
  ['2026-29', '2026', 'p', 1243, 298],
  ['2021-2022-29', '2021-2022', 's', 860, 1149],
  ['2023-07', '2023', 's', 860, 1149],
  ['2023-14', '2023', 's', 1197, 1600],
  ['2024-20', '2024', 's', 952, 1272],
  ['2024-27', '2024', 's', 952, 1272],
  ['2024-25', '2024', 's', 952, 1093],
];

export const WORKS: Work[] = ROWS.map(([id, year, kind, width, height], index) => ({
  id,
  year,
  kind: kind === 'p' ? 'painting' : 'studio',
  width,
  height,
  index,
}));

const CHAPTER_KEYS: ChapterKey[] = ['2021-2022', '2023', '2024', '2025', '2026', 'studio'];

export const CHAPTERS: Chapter[] = CHAPTER_KEYS.map((key) => ({
  key,
  works: WORKS.filter((w) => (key === 'studio' ? w.kind === 'studio' : w.kind === 'painting' && w.year === key)),
}));

/** Every work in the order it hangs on the wall (and in the list view). */
export const ORDER: Work[] = CHAPTERS.flatMap((c) => c.works);

/** "2021-2022" → "2021–2022" (en dash for display). */
export const displayYear = (w: Work): string => w.year.replace('-', '–');

export const imageUrl = (w: Work, variant: 'full' | 'thumb' | 'original' = 'full'): string =>
  `${import.meta.env.BASE_URL}img/${w.id}${variant === 'thumb' ? '-t' : variant === 'original' ? '-o' : ''}.webp`;

export const HERO_IMAGE = `${import.meta.env.BASE_URL}img/2024-25.webp`;
export const SIGNATURE_IMAGE = `${import.meta.env.BASE_URL}img/signature.png`;
export const ARTIST_NAME = 'Edison Muñoz Matasea';
