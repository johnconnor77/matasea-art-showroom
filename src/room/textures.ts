import * as THREE from 'three';

export const makeCanvas = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [c, ctx];
};

export const canvasTexture = (c: HTMLCanvasElement, anisotropy: number): THREE.CanvasTexture => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
};

/** Oxblood plaster, like the walls of the real gallery. */
export function plasterTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, x] = makeCanvas(256, 256);
  x.fillStyle = '#5e1f1b';
  x.fillRect(0, 0, 256, 256);
  for (let n = 0; n < 2600; n++) {
    x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,220,200'},${Math.random() * 0.045})`;
    x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const t = canvasTexture(c, anisotropy);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Dark wooden planks with grain. */
export function floorTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, x] = makeCanvas(512, 512);
  for (let r = 0; r < 8; r++) {
    const y = r * 64;
    x.fillStyle = `hsl(18,${28 + Math.random() * 8}%,${12 + Math.random() * 5}%)`;
    x.fillRect(0, y, 512, 64);
    for (let g = 0; g < 40; g++) {
      x.strokeStyle = `rgba(0,0,0,${Math.random() * 0.18})`;
      x.beginPath();
      const gy = y + Math.random() * 64;
      x.moveTo(0, gy);
      x.bezierCurveTo(170, gy + Math.random() * 6 - 3, 340, gy + Math.random() * 6 - 3, 512, gy);
      x.stroke();
    }
    x.fillStyle = 'rgba(0,0,0,.55)';
    x.fillRect(0, y, 512, 2);
    x.fillRect(Math.random() * 512, y, 2, 64);
  }
  const t = canvasTexture(c, anisotropy);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Soft warm radial gradient used for spotlight pools (additive). */
export function glowTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, x] = makeCanvas(256, 256);
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,224,186,1)');
  g.addColorStop(0.45, 'rgba(255,200,150,.45)');
  g.addColorStop(1, 'rgba(255,190,140,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return canvasTexture(c, anisotropy);
}

const archPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + w / 2);
  ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
};

/** Arched window with mullions and a hazy city behind it. */
export function windowTexture(anisotropy: number): THREE.CanvasTexture {
  const [c, x] = makeCanvas(256, 420);
  archPath(x, 6, 6, 244, 408);
  const sky = x.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, '#fff7ea');
  sky.addColorStop(0.6, '#f6dfc0');
  sky.addColorStop(1, '#d9b48e');
  x.fillStyle = sky;
  x.fill();
  x.save();
  x.clip();
  x.fillStyle = 'rgba(150,120,100,.35)';
  ([[20, 250, 60, 170], [90, 210, 50, 210], [150, 270, 80, 150], [200, 230, 60, 190]] as const).forEach(([bx, by, bw, bh]) =>
    x.fillRect(bx, by, bw, bh),
  );
  x.restore();
  x.strokeStyle = '#24150f';
  x.lineWidth = 12;
  archPath(x, 6, 6, 244, 408);
  x.stroke();
  x.lineWidth = 7;
  x.beginPath();
  x.moveTo(128, 20);
  x.lineTo(128, 414);
  [128, 180, 260, 340].forEach((y) => {
    x.moveTo(8, y);
    x.lineTo(248, y);
  });
  x.stroke();
  return canvasTexture(c, anisotropy);
}

/** Large year title painted on the wall. */
export function chapterTitleTexture(title: string, count: string, longTitle: boolean, anisotropy: number): THREE.CanvasTexture {
  const [c, x] = makeCanvas(1024, 512);
  x.fillStyle = '#f3e6d6';
  x.textAlign = 'center';
  x.font = `${longTitle ? 190 : 250}px "Instrument Serif", Georgia, serif`;
  x.fillText(title, 512, 300);
  x.fillStyle = 'rgba(243,230,214,.72)';
  x.font = '500 46px "Hanken Grotesk", sans-serif';
  x.fillText(count, 512, 400);
  return canvasTexture(c, anisotropy);
}

/** Wall label beside a work: artist name and year. */
export function wallLabelTexture(name: string, year: string, anisotropy: number): THREE.CanvasTexture {
  const [c, x] = makeCanvas(576, 192);
  x.fillStyle = '#efe6da';
  x.fillRect(0, 0, 576, 192);
  x.fillStyle = '#1c1411';
  x.font = '600 32px "Hanken Grotesk", sans-serif';
  x.fillText(name, 30, 56);
  x.font = 'italic 50px "Instrument Serif", Georgia, serif';
  x.fillText(year, 30, 130);
  return canvasTexture(c, anisotropy);
}
