"""Garnitures dessinées (sauces, crudités, suppléments) pour la démo, en attendant les photos.

Chaque élément est une forme (masque) dont on tire un relief : ombrage, reflet brillant, ombre portée.
Travail à 60 px/cm, enregistré à 30 px/cm.
"""
import numpy as np
from PIL import Image, ImageDraw
from commun import blur, hexrgb, ndi, noise, save, shade
from compose import over

K = 60  # px par cm pendant le dessin


def canvas(wcm, hcm):
    return np.zeros((int(hcm * K), int(wcm * K), 4), np.float32)


def mask(wcm, hcm, draw):
    im = Image.new("L", (int(wcm * K), int(hcm * K)), 0)
    draw(ImageDraw.Draw(im))
    return np.asarray(im).astype(np.float32) / 255


def pillow(m, r):
    """Relief bombé : 0 au bord, 1 à r px du bord."""
    d = ndi.distance_transform_edt(m > 0.5)
    return np.sqrt(np.clip(d / r, 0, 1) * (2 - np.clip(d / r, 0, 1)))


def lit(color, height, m, spec=0.35, gloss=18, relief=1.0, amb=0.0):
    """Couleur éclairée : ombrage du relief + reflet spéculaire."""
    col = color if color.ndim == 3 else color[None, None] * np.ones(m.shape + (1,), np.float32)
    gy, gx = np.gradient(height * relief * 30)
    n = np.dstack([-gx, -gy, np.ones_like(gx)])
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    L = np.array([-0.45, -0.55, 0.7]); L /= np.linalg.norm(L)
    diff = np.clip((n * L).sum(-1), 0, 1)
    Hh = L + np.array([0, 0, 1.0]); Hh /= np.linalg.norm(Hh)
    sp = np.clip((n * Hh).sum(-1), 0, 1) ** gloss * spec
    rgb = col * (0.55 + 0.55 * diff)[..., None] + sp[..., None]
    a = blur(m, 0.8)
    return np.dstack([np.clip(rgb, 0, 1), a])


def finish(name, img, shadow=0.35):
    """Ombre portée douce, puis enregistrement à 30 px/cm."""
    h, w = img.shape[:2]
    pad = 40
    out = np.zeros((h + 2 * pad, w + 2 * pad, 4), np.float32)
    over(out, img, pad, pad, shadow=shadow, sh_off=(6, 9), sh_blur=7)
    save(name, out, supersample=2)


# ---------- Sauces : un filet en zigzag, brillant ----------
def sauce(name, color, wcm=19, hcm=5.5, width=0.38, seed=0):
    r = np.random.default_rng(seed)
    W, H = int(wcm * K), int(hcm * K)
    t = np.linspace(0, 1, 1400)
    zig = 4.6 + r.uniform(-0.4, 0.4)
    ph = t * np.pi * 2 * zig + 0.6 * np.sin(t * 9 + seed) + r.uniform(0, 6)
    amp = H * 0.36 * (0.65 + 0.35 * noise(1, 1400, 200, 2, seed=seed + 40)[0])
    x = 0.04 * W + t * 0.92 * W + np.cos(ph) * K * 0.5
    y = H / 2 + np.sin(ph) * amp + np.sin(t * 17 + seed) * K * 0.15
    thick = width * K / 2 * (0.75 + 0.35 * noise(1, 1400, 90, 2, seed=seed)[0])
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    for xi, yi, ri in zip(x, y, thick):
        d.ellipse((xi - ri, yi - ri, xi + ri, yi + ri), fill=255)
    # quelques gouttes
    for _ in range(6):
        k = r.integers(1400)
        rr = r.uniform(0.12, 0.22) * K
        cx, cy = x[k] + r.uniform(-1, 1) * K * 0.6, y[k] + r.uniform(-1, 1) * K * 0.6
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=255)
    m = np.asarray(im).astype(np.float32) / 255
    hgt = blur(pillow(m, width * K * 0.45), 1.5)
    col = hexrgb(color)
    # bords un peu plus foncés (épaisseur), cœur plus clair
    c = col[None, None] * (0.82 + 0.22 * hgt[..., None])
    finish(name, lit(c, hgt, m, spec=0.4, gloss=26, relief=0.45), shadow=0.22)


# ---------- Salade : lanières d'iceberg, ondulées ----------
def salade():
    wcm, hcm = 19.5, 6.5
    r = np.random.default_rng(7)
    W, H = int(wcm * K), int(hcm * K)
    img = np.zeros((H, W, 4), np.float32)
    for k in range(110):
        L = r.uniform(1.4, 3.2) * K
        wdt = r.uniform(0.3, 0.6) * K
        ang = r.uniform(0, np.pi)
        while True:
            u, v = r.uniform(-1, 1, 2)
            if u * u + v * v < 1:
                break
        cx, cy = W / 2 + u * W * 0.42, H / 2 + v * H * 0.36
        curl = r.uniform(-1.2, 1.2)
        size = int(L * 1.3 + wdt * 3)
        sm = Image.new("L", (size, size), 0)
        d = ImageDraw.Draw(sm)
        prof = noise(1, 60, 8, 2, seed=int(k) + 100)[0]
        a0 = ang
        px, py = size / 2 - np.cos(ang) * L / 2, size / 2 - np.sin(ang) * L / 2
        for i in range(60):
            t = i / 59
            a0 += curl / 60 + np.sin(t * 9 + k) * 0.03
            px += np.cos(a0) * L / 60
            py += np.sin(a0) * L / 60
            rr = wdt / 2 * (0.55 + 0.6 * prof[i]) * np.sin(np.pi * (0.08 + 0.84 * t)) ** 0.4
            d.ellipse((px - rr, py - rr, px + rr, py + rr), fill=255)
        m = blur(np.asarray(sm).astype(np.float32) / 255, 1.0)
        hgt = blur(pillow(m, wdt * 0.35), 1.5)
        tone = r.uniform(0, 1) ** 1.5
        base = hexrgb("#F1F5D2") * (1 - tone) + hexrgb("#B5D96E") * tone
        vein = blur(noise(size, size, 4, 2, seed=int(k)), 0.8) * 0.08
        rim = np.clip(1 - hgt * 2, 0, 1)[..., None] * 0.3
        col = base[None, None] * (0.95 - vein[..., None]) * (1 - rim) + hexrgb("#7DB844") * rim
        piece = lit(col, hgt * 0.5, m, spec=0.18, gloss=14)
        piece[..., 3] *= 0.95
        over(img, piece, int(cx - size / 2), int(cy - size / 2), shadow=0.22, sh_off=(3, 5), sh_blur=4)
    finish("salade", img, shadow=0.2)


# ---------- Tomates : rondelles ----------
def tomate_slice(dcm, seed):
    r = np.random.default_rng(seed)
    S = int(dcm * K)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    cx = cy = S / 2
    ang = np.arctan2(yy - cy, xx - cx)
    rad = np.hypot(xx - cx, yy - cy) / (S / 2)
    edge = 0.96 + 0.03 * np.sin(ang * 5 + seed)
    m = (rad < edge).astype(np.float32)
    # 4-5 loges avec gelée et pépins
    n = r.integers(4, 6)
    loc = np.zeros_like(rad)
    for i in range(n):
        a0 = i * 2 * np.pi / n + r.uniform(-0.1, 0.1)
        da = np.angle(np.exp(1j * (ang - a0 - np.pi / n)))
        loc = np.maximum(loc, (np.abs(da) < np.pi / n * 0.72) & (rad > 0.28) & (rad < 0.78))
    loc = blur(loc.astype(np.float32), 3)
    flesh = hexrgb("#D8301E")[None, None] * np.ones((S, S, 1))
    flesh = flesh * (1 - 0.25 * np.clip((rad - 0.85) / 0.15, 0, 1))[..., None]  # peau plus foncée
    core = np.exp(-(rad / 0.22) ** 2)[..., None]
    flesh = flesh * (1 - core * 0.5) + hexrgb("#F59A80") * core * 0.5
    gel = hexrgb("#F2653E") * 0.8 + hexrgb("#F7C46A") * 0.2
    col = flesh * (1 - loc[..., None]) + gel * loc[..., None]
    seeds = np.zeros_like(rad)
    for i in range(n * 6):
        a = r.uniform(0, 2 * np.pi); rr = r.uniform(0.4, 0.68)
        sx, sy = cx + np.cos(a) * rr * S / 2, cy + np.sin(a) * rr * S / 2
        seeds = np.maximum(seeds, np.exp(-(((xx - sx) / (S * 0.022)) ** 2 + ((yy - sy) / (S * 0.034)) ** 2)))
    seeds *= loc
    col = col * (1 - seeds[..., None]) + hexrgb("#F4DDA0") * seeds[..., None]
    hgt = blur(pillow(m, S * 0.08), 2) + loc * 0.15 - seeds * 0.1
    return lit(col, hgt, m, spec=0.35, gloss=40, relief=0.4)


def tomates():
    img = np.zeros((int(6.5 * K), int(19 * K), 4), np.float32)
    for i, (x, rot) in enumerate(((0.2, 0), (0.5, 0), (0.8, 0))):
        s = tomate_slice(4.6, i + 3)
        over(img, s, int(x * img.shape[1] - s.shape[1] / 2), int(img.shape[0] / 2 - s.shape[0] / 2 + (i % 2 - 0.5) * 0.6 * K), shadow=0.35, sh_off=(5, 7), sh_blur=5)
    finish("tomate", img)


# ---------- Oignons (dés) ----------
def bits(name, colors, count, size=(0.35, 0.8), spec=0.5, strands=False, seed=0, opacity=1.0, width=0.16, gain=1.0):
    r = np.random.default_rng(seed)
    W, H = int(19 * K), int(6 * K)
    img = np.zeros((H, W, 4), np.float32)
    for k in range(count):
        s = int(r.uniform(*size) * K * (2.6 if strands else 1))
        S = s * 2 + 8
        sm = Image.new("L", (S, S), 0)
        d = ImageDraw.Draw(sm)
        if strands:
            a = r.uniform(0, np.pi); b = r.uniform(-0.6, 0.6)
            pts = [(S / 2 + np.cos(a) * t * s - np.sin(a) * b * s * (t * t - 1) * 0.5, S / 2 + np.sin(a) * t * s + np.cos(a) * b * s * (t * t - 1) * 0.5) for t in np.linspace(-1, 1, 16)]
            d.line(pts, fill=255, width=max(3, int(width * K)), joint="curve")
        else:
            n = r.integers(4, 6)
            ang = np.sort(r.uniform(0, 2 * np.pi, n))
            d.polygon([(S / 2 + np.cos(t) * s * r.uniform(0.6, 1), S / 2 + np.sin(t) * s * r.uniform(0.6, 1)) for t in ang], fill=255)
        m = blur(np.asarray(sm).astype(np.float32) / 255, 1.2)
        hgt = blur(pillow(m, s * 0.3), 1.2)
        base = hexrgb(colors[r.integers(len(colors))])
        col = base[None, None] * (0.8 + 0.25 * hgt[..., None])
        piece = lit(col, hgt * 0.5, m, spec=spec, gloss=24)
        piece[..., :3] = np.clip(piece[..., :3] * gain, 0, 1)
        piece[..., 3] *= opacity
        while True:
            u, v = r.uniform(-1, 1, 2)
            if u * u + v * v < 1:
                break
        over(img, piece, int(W / 2 + u * W * 0.43 - S / 2), int(H / 2 + v * H * 0.36 - S / 2), shadow=0.3, sh_off=(3, 4), sh_blur=3)
    finish(name, img, shadow=0.15)


if __name__ == "__main__":
    for i, (n, c) in enumerate({
        "ketchup": "#B8141B", "mayonnaise": "#F2DC92", "sauce-blanche": "#EEEBDF", "barbecue": "#5A2410",
        "biggy": "#EE8A4E", "algerienne": "#E0914A", "harissa": "#A3200F", "samourai": "#E2682C",
    }.items()):
        sauce(n, c, seed=i + 1)
    salade()
    tomates()
    bits("oignons", ["#FBF6E6", "#F4EDD8", "#F8F2E8", "#EFE6D6"], 110, size=(0.2, 0.4), spec=0.25, seed=11, opacity=0.9, gain=1.18)
    bits("oignons-caramelises", ["#B8702C", "#C98A40", "#9A5420", "#D49A50"], 55, size=(0.3, 0.55), spec=0.7, strands=True, seed=12, width=0.6, opacity=0.92)
