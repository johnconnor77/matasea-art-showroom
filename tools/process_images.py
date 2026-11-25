import sys, os, json, cv2, numpy as np
root, out = sys.argv[1], sys.argv[2]
F = None  # full frame
P = {
 "2021_2022": {11:F,12:F,19:[(0.005,0.355),(0.987,0.355),(0.985,0.635),(0.005,0.64)],27:F,30:F,34:[(0.10,0.025),(0.915,0.025),(0.91,0.94),(0.10,0.945)]},
 "2023": {8:F,15:F,24:[(0.04,0.17),(0.985,0.17),(0.985,0.855),(0.04,0.84)],33:F,35:[(0.045,0.075),(0.553,0.17),(0.553,0.655),(0.045,0.72)]},
 "2024": {4:[(0.20,0.02),(0.80,0.02),(0.81,0.955),(0.18,0.955)],19:[(0.003,0.05),(0.955,0.05),(0.955,0.975),(0.003,0.98)],23:F},
 "2025": {5:F,8:F,10:F,16:F,19:F,23:F,24:F,25:F,26:F},
 "2026": {2:[(0.03,0.11),(0.955,0.10),(0.955,0.975),(0.03,0.975)],8:F,10:F,12:F,14:[(0.10,0.19),(0.925,0.22),(0.92,0.71),(0.105,0.765)],15:F,19:F,20:F,21:F,23:F,26:F,29:F},
}
STUDIO = [("2021_2022",29),("2023",7),("2023",14),("2024",20),("2024",27)]
HERO = ("2024",25)
def files(year): return sorted(os.listdir(os.path.join(root, year)))
def load(year, i): return cv2.imread(os.path.join(root, year, files(year)[i-1]), cv2.IMREAD_COLOR)
def warp(img, q):
    h, w = img.shape[:2]
    if q is None:
        m = int(round(min(w,h)*0.004)); return img[m:h-m, m:w-m]
    pts = np.float32([(x*w, y*h) for x,y in q])
    wt = np.linalg.norm(pts[1]-pts[0]); wb = np.linalg.norm(pts[2]-pts[3])
    hl = np.linalg.norm(pts[3]-pts[0]); hr = np.linalg.norm(pts[2]-pts[1])
    W, H = int(max(wt,wb)), int(max(hl,hr))
    M = cv2.getPerspectiveTransform(pts, np.float32([(0,0),(W,0),(W,H),(0,H)]))
    return cv2.warpPerspective(img, M, (W,H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
def enhance(img, levels=True):
    # 1 compression clean-up: stronger on chroma (blocking), light on luma
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    L, a, b = cv2.split(lab)
    a = cv2.bilateralFilter(a, 5, 6, 3); b = cv2.bilateralFilter(b, 5, 6, 3)
    L = cv2.fastNlMeansDenoising(L, None, h=3, templateWindowSize=5, searchWindowSize=15)
    # 2 gentle levels on luminance only, only when the range is compressed
    if levels:
        lo, hi = np.percentile(L, 0.3), np.percentile(L, 99.7)
        lo = min(lo, 14); hi = max(hi, 238)
        L = np.clip((L.astype(np.float32)-lo)*255.0/(hi-lo), 0, 255).astype(np.uint8)
    # 3 upscale small sources 1.5x (conventional, no invented detail)
    lab = cv2.merge([L, a, b])
    if max(lab.shape[:2]) < 1000:
        lab = cv2.resize(lab, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_LANCZOS4)
    # 4 mild unsharp mask on luminance
    L, a, b = cv2.split(lab)
    blur = cv2.GaussianBlur(L, (0,0), 1.2)
    diff = L.astype(np.int16) - blur.astype(np.int16)
    mask = np.abs(diff) > 2
    L = np.clip(L + 0.45*diff*mask, 0, 255).astype(np.uint8)
    return cv2.cvtColor(cv2.merge([L,a,b]), cv2.COLOR_LAB2BGR)
def save(img, path, long_edge, q):
    h, w = img.shape[:2]; s = min(1.0, long_edge/max(h,w))
    if s < 1: img = cv2.resize(img, (int(w*s), int(h*s)), interpolation=cv2.INTER_AREA)
    cv2.imwrite(path, img, [cv2.IMWRITE_WEBP_QUALITY, q]); return img.shape[1], img.shape[0]
man = []
def emit(kind, year, i, q, levels):
    src = load(year, i); base = warp(src, q); enh = enhance(base, levels)
    yr = "2021-2022" if year=="2021_2022" else year
    pid = f"{yr}-{i:02d}"
    w, h = save(enh, f"{out}/{pid}.webp", 1600, 86)
    save(base, f"{out}/{pid}-o.webp", 1600, 86)
    save(enh, f"{out}/{pid}-t.webp", 520, 80)
    man.append(dict(id=pid, year=yr, kind=kind, w=w, h=h, src=f"{year} #{i:02d}"))
for year, d in P.items():
    for i, q in d.items(): emit("painting", year, i, q, True)
for year, i in STUDIO: emit("studio", year, i, None, False)
emit("hero", *HERO, None, False)
json.dump(man, open(f"{out}/../manifest.json","w"), indent=1)
print(len(man), sum(os.path.getsize(f"{out}/{f}") for f in os.listdir(out))//1024, "KB")
