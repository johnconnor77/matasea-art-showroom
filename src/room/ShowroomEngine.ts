import * as THREE from 'three';
import { CHAPTERS, ORDER, imageUrl, type Chapter, type Work } from '../data/works';
import {
  chapterTitleTexture,
  floorTexture,
  glowTexture,
  plasterTexture,
  wallLabelTexture,
  windowTexture,
} from './textures';

export interface HudState {
  /** Index into CHAPTERS of the section the visitor is standing in. */
  chapter: number;
  /** True while the camera is close to one work. */
  focused: boolean;
}

export interface EngineCallbacks {
  onHud: (state: HudState) => void;
  /** A focused work was clicked again: open it full screen. */
  onOpen: (work: Work) => void;
}

export interface LabelText {
  artist: string;
  year: (w: Work) => string;
  chapterTitle: (c: Chapter) => string;
  chapterCount: (c: Chapter) => string;
}

interface Slot {
  work: Work;
  /** Arc-length position of the work's centre along the wall. */
  s: number;
  pw: number;
  ph: number;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  label: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  hiRes: boolean;
}

interface ChapterSlot {
  chapter: Chapter;
  start: number;
  next: number;
  window: number;
  title: number;
  titleMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
}

/* Room geometry, in metres. */
const GAP = 2.4;
const WALL_H = 5.0;
const HANG_Y = 2.25;
const MAX_H = 2.75;
const MAX_W = 5.8;
const AREA = { painting: 4.6, studio: 2.7 } as const;

const isNarrow = () => window.innerWidth < 600;

/**
 * A circular gallery: works hang on the inside of a cylinder and the camera
 * walks around it, looking at the wall. Framework-free so it can be driven
 * from React (or anything else) through a handful of methods.
 */
export class ShowroomEngine {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  private readonly loader = new THREE.TextureLoader();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly anisotropy: number;
  private readonly slots: Slot[] = [];
  private readonly chapters: ChapterSlot[] = [];
  private readonly L: number;
  private readonly R: number;
  private readonly ease: number;
  private readonly cleanups: Array<() => void> = [];

  private sCur: number;
  private sTar: number;
  private dCur = 15;
  private dTar = 10.5;
  private yCur = 2.3;
  private yTar = 2.3;
  private focus: Slot | null = null;
  private active = false;
  private raf = 0;
  private frame = 0;
  private lastHud: HudState | null = null;
  private drag: { lastX: number; moved: number } | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: EngineCallbacks,
    reducedMotion: boolean,
  ) {
    this.ease = reducedMotion ? 1 : 0.075;
    // Match the prototype (three r128): hex colours are used as-is, not converted from sRGB.
    THREE.ColorManagement.enabled = false;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    this.scene.background = new THREE.Color(0x0b0807);
    this.scene.fog = new THREE.Fog(0x0b0807, 18, 52);
    // three ≥ r155 uses physically based light units; × π keeps the original look.
    this.scene.add(new THREE.HemisphereLight(0xfff0de, 0x24120d, 0.62 * Math.PI));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.12 * Math.PI));

    /* Lay the wall out: window, chapter title, then the works, per chapter. */
    let s = 0;
    const pending: Array<Omit<ChapterSlot, 'next' | 'titleMesh'>> = [];
    const positions = new Map<Work, { s: number; pw: number; ph: number }>();
    for (const chapter of CHAPTERS) {
      s += 1.4;
      const win = s + 1.4;
      s += 2.8 + 1.6;
      const title = s + 1.9;
      s += 3.8 + 1.4;
      for (const work of chapter.works) {
        const a = work.width / work.height;
        let ph = Math.sqrt(AREA[work.kind] / a);
        let pw = a * ph;
        if (ph > MAX_H) { ph = MAX_H; pw = a * ph; }
        if (pw > MAX_W) { pw = MAX_W; ph = pw / a; }
        positions.set(work, { s: s + pw / 2, pw, ph });
        s += pw + GAP;
      }
      pending.push({ chapter, start: win - 2.2, window: win, title });
    }
    this.L = s + 0.8;
    this.R = this.L / (2 * Math.PI);

    this.buildRoom();
    const glow = glowTexture(this.anisotropy);
    const winTex = windowTexture(this.anisotropy);
    pending.forEach((c, k) => {
      this.addWindow(c.window, winTex, glow);
      const titleMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.9), new THREE.MeshBasicMaterial({ transparent: true }));
      titleMesh.position.set(0, 2.6, 0.02);
      this.place(new THREE.Group().add(titleMesh), c.title, this.insetFor(1.9));
      this.chapters.push({ ...c, next: k < pending.length - 1 ? pending[k + 1]!.start : this.L, titleMesh });
    });
    for (const work of ORDER) {
      const p = positions.get(work);
      if (p) this.addWork(work, p.s, p.pw, p.ph, glow);
    }

    this.sCur = this.chapters[0]!.title - 0.6;
    this.sTar = this.sCur;

    this.bindInput();
    this.resize();
    this.raf = requestAnimationFrame(this.tick);
  }

  /* ---------------- public API ---------------- */

  /** Redraw every painted text (call on language change and once fonts are ready). */
  relabel(text: LabelText): void {
    for (const c of this.chapters) {
      swapMap(c.titleMesh, chapterTitleTexture(text.chapterTitle(c.chapter), text.chapterCount(c.chapter), c.chapter.key === '2021-2022', this.anisotropy));
    }
    for (const slot of this.slots) {
      swapMap(slot.label, wallLabelTexture(text.artist, text.year(slot.work), this.anisotropy));
    }
  }

  /** Rendering and input run only while the room is the visible view. */
  setActive(active: boolean): void {
    this.active = active;
    if (!active) this.drag = null;
  }

  step(dir: 1 | -1): void {
    const cur = this.mod(this.sCur);
    let best: Slot | null = null;
    let bestD = Infinity;
    for (const slot of this.slots) {
      const d = dir > 0 ? this.mod(slot.s - cur) : this.mod(cur - slot.s);
      if (d > 0.35 && d < bestD) { bestD = d; best = slot; }
    }
    if (!best) return;
    if (this.focus) this.setFocus(best);
    else this.goTo(best.s);
  }

  goChapter(index: number): void {
    const c = this.chapters[index];
    if (!c) return;
    this.setFocus(null);
    this.goTo(c.title + 1.2);
  }

  handleKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight') { e.preventDefault(); this.step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this.step(-1); }
    else if (e.key === 'Escape') this.setFocus(null);
    else if (e.key === 'Enter' && this.focus) this.callbacks.onOpen(this.focus.work);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.cleanups.forEach((fn) => fn());
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        (m as THREE.MeshBasicMaterial).map?.dispose();
        m.dispose();
      });
    });
    this.renderer.dispose();
  }

  /* ---------------- building the room ---------------- */

  private buildRoom(): void {
    const wallTex = plasterTexture(this.anisotropy);
    wallTex.repeat.set(this.L / 3, WALL_H / 3);
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(this.R, this.R, WALL_H, 360, 1, true),
      new THREE.MeshLambertMaterial({ map: wallTex, side: THREE.BackSide }),
    );
    wall.position.y = WALL_H / 2;
    this.scene.add(wall);

    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(this.R - 0.02, this.R - 0.02, 0.16, 360, 1, true),
      new THREE.MeshLambertMaterial({ color: 0x1b100d, side: THREE.BackSide }),
    );
    skirt.position.y = 0.08;
    this.scene.add(skirt);

    const woodTex = floorTexture(this.anisotropy);
    woodTex.repeat.set(this.R / 2.2, this.R / 2.2);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(this.R, 120), new THREE.MeshLambertMaterial({ map: woodTex }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
  }

  private glow(map: THREE.Texture, w: number, h: number, opacity: number) {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
  }

  private addWindow(s: number, winTex: THREE.Texture, glow: THREE.Texture): void {
    const g = new THREE.Group();
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4.27), new THREE.MeshBasicMaterial({ map: winTex, transparent: true, fog: false }));
    win.position.set(0, 0.45 + 2.13, 0.02);
    const halo = this.glow(glow, 5.2, 6.0, 0.28);
    halo.position.set(0, 2.6, 0.01);
    const pool = this.glow(glow, 3.4, 6.2, 0.22);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.015, 3.0);
    g.add(win, halo, pool);
    this.place(g, s, this.insetFor(2.6));
  }

  private addWork(work: Work, s: number, pw: number, ph: number, glow: THREE.Texture): void {
    const g = new THREE.Group();
    const y = HANG_Y;
    const studio = work.kind === 'studio';

    const pool = this.glow(glow, pw + 2.6, ph + 3.2, 0.34);
    pool.position.set(0, y + 0.35, 0.005);
    g.add(pool);

    if (studio) {
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(pw + 0.5, ph + 0.5), new THREE.MeshLambertMaterial({ color: 0xece4d8 }));
      mat.position.set(0, y, 0.078);
      g.add(mat);
    }
    const border = studio ? 0.62 : 0.1;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(pw + border, ph + border, 0.07), new THREE.MeshLambertMaterial({ color: 0x140e0c }));
    frame.position.set(0, y, 0.035);
    g.add(frame);

    const tex = this.loader.load(imageUrl(work, 'thumb'));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.anisotropy;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: tex }));
    mesh.position.set(0, y, 0.088);
    g.add(mesh);

    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4), new THREE.MeshBasicMaterial({ transparent: true }));
    label.position.set(pw / 2 + (studio ? 0.31 : 0.05) + 0.78, y - ph / 2 + 0.2, 0.02);
    g.add(label);

    this.place(g, s, this.insetFor(pw / 2 + 1.7));
    const slot: Slot = { work, s, pw, ph, mesh, label, hiRes: false };
    mesh.userData.slot = slot;
    this.slots.push(slot);
  }

  /** Stand a group on the wall at arc position `s`, facing the centre. */
  private place(g: THREE.Object3D, s: number, inset: number): void {
    const p = s / this.R;
    const r = this.R - inset;
    g.position.set(r * Math.cos(p), 0, r * Math.sin(p));
    g.rotation.y = Math.atan2(-Math.cos(p), -Math.sin(p));
    this.scene.add(g);
  }

  /** Flat pieces are tangent to a curved wall: pull them in so their edges stay in front of it. */
  private insetFor(half: number): number {
    return (half * half) / (2 * this.R) + 0.03;
  }

  /* ---------------- camera ---------------- */

  private mod = (v: number) => ((v % this.L) + this.L) % this.L;
  private wrapDelta = (d: number) => {
    const m = this.mod(d);
    return m > this.L / 2 ? m - this.L : m;
  };
  private baseDistance = () => (isNarrow() ? 7.4 : 10.5);

  private fitDistance(slot: Slot): number {
    const vf = (this.camera.fov * Math.PI) / 180;
    const hf = 2 * Math.atan(Math.tan(vf / 2) * this.camera.aspect);
    return Math.max(
      (slot.ph + 1.5) / (2 * Math.tan(vf / 2)),
      (slot.pw + (isNarrow() ? 0.5 : 1.8)) / (2 * Math.tan(hf / 2)),
      2.4,
    ) + 0.08;
  }

  private goTo(s: number): void {
    this.sTar = this.sCur + this.wrapDelta(s - this.sCur);
  }

  private setFocus(slot: Slot | null): void {
    this.focus = slot;
    if (slot) {
      this.goTo(slot.s);
      this.dTar = this.fitDistance(slot);
      this.yTar = 2.0;
    } else {
      this.dTar = this.baseDistance();
      this.yTar = 2.3;
    }
    this.emitHud();
  }

  private chapterIndex(): number {
    const cur = this.mod(this.sCur + 0.01);
    if (cur < this.chapters[0]!.start) return this.chapters.length - 1;
    const k = this.chapters.findIndex((c) => cur >= c.start && cur < c.next);
    return k === -1 ? this.chapters.length - 1 : k;
  }

  private emitHud(): void {
    const next: HudState = { chapter: this.chapterIndex(), focused: this.focus !== null };
    if (this.lastHud && this.lastHud.chapter === next.chapter && this.lastHud.focused === next.focused) return;
    this.lastHud = next;
    this.callbacks.onHud(next);
  }

  /** Swap in the 1600 px image for works near the camera. */
  private upgradeTextures(): void {
    const cur = this.mod(this.sCur);
    for (const slot of this.slots) {
      if (slot.hiRes || Math.abs(this.wrapDelta(slot.s - cur)) >= 12) continue;
      slot.hiRes = true;
      this.loader.load(imageUrl(slot.work, 'full'), (tx) => {
        tx.colorSpace = THREE.SRGBColorSpace;
        tx.anisotropy = this.anisotropy;
        swapMap(slot.mesh, tx);
      });
    }
  }

  private resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < 600 ? 64 : 50;
    this.camera.updateProjectionMatrix();
    this.dTar = this.focus ? this.fitDistance(this.focus) : this.baseDistance();
  };

  private tick = (): void => {
    this.raf = requestAnimationFrame(this.tick);
    if (document.hidden || !this.active) return;
    const e = this.ease;
    this.sCur += (this.sTar - this.sCur) * e;
    this.dCur += (this.dTar - this.dCur) * e;
    this.yCur += (this.yTar - this.yCur) * e;
    const p = this.sCur / this.R;
    const r = this.R - this.dCur;
    this.camera.position.set(r * Math.cos(p), 1.7 + (this.dCur - 3) * 0.03, r * Math.sin(p));
    this.camera.lookAt(this.R * Math.cos(p), this.yCur, this.R * Math.sin(p));
    this.renderer.render(this.scene, this.camera);
    if (++this.frame % 20 === 0) {
      this.upgradeTextures();
      this.emitHud();
    }
  };

  /* ---------------- input ---------------- */

  private bindInput(): void {
    const c = this.canvas;
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.cleanups.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };

    on(c, 'pointerdown', (e) => {
      if (!this.active) return;
      this.drag = { lastX: e.clientX, moved: 0 };
      c.setPointerCapture(e.pointerId);
    });
    on(c, 'pointermove', (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.lastX;
      this.drag.lastX = e.clientX;
      this.drag.moved += Math.abs(dx);
      if (this.drag.moved > 6) {
        c.classList.add('dragging');
        if (this.focus) this.setFocus(null);
        this.sTar -= dx * (isNarrow() ? 0.045 : 0.02);
      }
    });
    on(c, 'pointerup', (e) => {
      c.classList.remove('dragging');
      const click = this.drag !== null && this.drag.moved <= 6;
      this.drag = null;
      if (click) this.pick(e);
    });
    on(window, 'wheel', (e) => {
      if (!this.active) return;
      e.preventDefault();
      if (this.focus) this.setFocus(null);
      this.sTar += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.012;
    }, { passive: false });
    on(window, 'resize', this.resize);
  }

  private pick(e: PointerEvent): void {
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.slots.map((s) => s.mesh))[0];
    if (!hit) {
      if (this.focus) this.setFocus(null);
      return;
    }
    const slot = hit.object.userData.slot as Slot;
    if (this.focus === slot) this.callbacks.onOpen(slot.work);
    else this.setFocus(slot);
  }
}

function swapMap(mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>, map: THREE.Texture): void {
  const old = mesh.material.map;
  mesh.material.map = map;
  mesh.material.needsUpdate = true;
  old?.dispose();
}

