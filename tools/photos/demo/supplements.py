"""Suppléments et autres viandes dessinés : tenders, escalope, merguez, pastrami, jambon, bacon, œuf, cheddar, boursin."""
import numpy as np
from PIL import Image, ImageDraw
from commun import blur, hexrgb, noise
from compose import over, transform
from dessins import K, finish, lit, pillow

rng = np.random.default_rng(21)


def shape(wcm, hcm, draw):
    im = Image.new("L", (int(wcm * K), int(hcm * K)), 0)
    draw(ImageDraw.Draw(im), im.width, im.height)
    return blur(np.asarray(im).astype(np.float32) / 255, 1.5)


def breaded(m, seed, light="#F0C06A", dark="#B06A1E"):
    """Panure : grains en relief, dorée, plus foncée sur les arêtes."""
    h, w = m.shape
    grain = blur(noise(h, w, 3, 3, seed=seed), 0.8)
    big = noise(h, w, 20, 2, seed=seed + 1)
    body = pillow(m, 0.6 * K)
    hgt = body * 0.8 + grain * 0.35 + big * 0.15
    t = np.clip(0.25 + body * 0.45 + big * 0.3 - grain * 0.25, 0, 1)
    col = np.stack([np.interp(t, [0, 1], [a, b]) for a, b in zip(hexrgb(dark), hexrgb(light))], -1)
    return lit(col, hgt, m, spec=0.12, gloss=10, relief=0.5)


def place(pieces, wcm=19, hcm=6.5, shadow=0.4):
    img = np.zeros((int(hcm * K), int(wcm * K), 4), np.float32)
    for p, (fx, fy) in pieces:
        over(img, p, int(fx * img.shape[1] - p.shape[1] / 2), int(fy * img.shape[0] - p.shape[0] / 2), shadow=shadow, sh_off=(6, 9), sh_blur=6)
    return img


def tenders():
    ps = []
    for i, (fx, fy, ang) in enumerate(((0.3, 0.42, 8), (0.62, 0.55, -6), (0.5, 0.35, 3))):
        m = shape(11, 3.4, lambda d, w, h: d.rounded_rectangle((20, 20 + rng.uniform(0, 8), w - 20, h - 20), radius=h * 0.4, fill=255))
        m *= np.clip(noise(*m.shape, 10, 2, seed=i + 60) * 3, 0, 1) ** 0.1
        ps.append((transform(breaded(m, i + 30), angle=ang), (fx, fy)))
    finish("tenders", place(ps))


def escalope():
    def d(dr, w, h):
        pts = [(w / 2 + np.cos(t) * w * 0.46 * (1 + 0.06 * np.sin(3 * t + 1)), h / 2 + np.sin(t) * h * 0.42 * (1 + 0.08 * np.cos(2 * t))) for t in np.linspace(0, 2 * np.pi, 60)]
        dr.polygon(pts, fill=255)
    m = shape(18, 6.4, d)
    finish("escalope", place([(breaded(m, 40, "#E9B866", "#A8601C"), (0.5, 0.5))]))


def merguez():
    ps = []
    for i, fy in enumerate((0.36, 0.66)):
        L, R = 17.5, 0.95
        def d(dr, w, h, i=i):
            pts = [(w * (0.06 + 0.88 * t), h / 2 + np.sin(t * np.pi) * (-1) ** i * h * 0.18) for t in np.linspace(0, 1, 40)]
            dr.line(pts, fill=255, width=int(R * 2 * K), joint="curve")
            for p in (pts[0], pts[-1]):
                dr.ellipse((p[0] - R * K, p[1] - R * K, p[0] + R * K, p[1] + R * K), fill=255)
        m = shape(L + 2.4, 3.6, d)
        hgt = pillow(m, R * K)
        h, w = m.shape
        yy, xx = np.mgrid[0:h, 0:w]
        grill = (np.sin((xx + yy * 0.6) / (0.9 * K) * np.pi * 2) > 0.82).astype(np.float32)
        grill = blur(grill, 2) * np.clip(hgt * 2 - 0.6, 0, 1)
        mott = noise(h, w, 8, 3, seed=70 + i)
        col = np.stack([np.interp(hgt * 0.6 + mott * 0.4, [0, 1], [a, b]) for a, b in zip(hexrgb("#4E150B"), hexrgb("#9E3A20"))], -1)
        col *= (1 - 0.6 * grill)[..., None]
        ps.append((lit(col, hgt, m, spec=0.55, gloss=30, relief=0.8), (0.5, fy)))
    finish("merguez", place(ps))


def slices(name, n, colors, fat, wcm=7.5, hcm=5.5, round_=False, spread=0.8, pepper=False):
    ps = []
    for i in range(n):
        seed = 80 + i * 7 + len(name)
        if round_:
            m = shape(wcm, wcm, lambda d, w, h: d.ellipse((12, 12, w - 12, h - 12), fill=255))
        else:
            m = shape(wcm, hcm, lambda d, w, h: d.rounded_rectangle((12, 12, w - 12, h - 12), radius=h * 0.3, fill=255))
        h, w = m.shape
        # pli : la tranche est repliée sur elle-même (bosse douce)
        fold = blur(noise(h, w, 30, 2, seed=seed), 4)
        mott = noise(h, w, 10, 3, seed=seed + 1)
        c = np.stack([np.interp(mott, [0, 1], [a, b]) for a, b in zip(hexrgb(colors[0]), hexrgb(colors[1]))], -1)
        if fat:
            vein = np.abs(noise(h, w, 16, 3, seed=seed + 2) - 0.5) < 0.035
            vein = blur(vein.astype(np.float32), 1.5)
            c = c * (1 - vein[..., None] * 0.8) + hexrgb(fat) * vein[..., None] * 0.8
        if pepper:
            edge = np.clip(1 - pillow(m, 0.35 * K), 0, 1)
            dots = (noise(h, w, 2, 1, seed=seed + 3) > 0.8) * edge
            c *= (1 - 0.7 * blur(dots.astype(np.float32), 0.6))[..., None]
        hgt = pillow(m, 0.3 * K) * 0.3 + fold * 0.9
        p = lit(c, hgt, m, spec=0.3, gloss=22, relief=0.6)
        ps.append((transform(p, angle=rng.uniform(-35, 35)), ((i + 0.5) / n * spread + (1 - spread) / 2, 0.5 + (i % 2 - 0.5) * 0.18)))
    finish(name, place(ps, shadow=0.3))


def bacon():
    ps = []
    for i, fy in enumerate((0.38, 0.64)):
        W_, H_ = 18, 2.6
        m = shape(W_, H_ + 1.6, lambda d, w, h: d.rectangle((20, 0.8 * K, w - 20, h - 0.8 * K), fill=255))
        h, w = m.shape
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        wave = np.sin(xx / (2.6 * K) * np.pi * 2 + i) * 0.45 * K
        mm = np.zeros_like(m)
        for x in range(w):
            mm[:, x] = np.roll(m[:, x], int(wave[0, x]))
        m = blur(mm, 1)
        band = np.sin((yy - wave) / (H_ * K) * np.pi * 3.2 + noise(h, w, 30, 2, seed=90 + i) * 3)
        fat = np.clip(band * 2 - 1.1, 0, 1)
        c = hexrgb("#9C3024")[None, None] * np.ones((h, w, 1)) * (0.8 + 0.3 * noise(h, w, 6, 2, seed=95 + i))[..., None]
        c = c * (1 - fat[..., None]) + hexrgb("#EFC7A8") * fat[..., None]
        crisp = np.clip(1 - pillow(m, 0.25 * K), 0, 1)
        c *= (1 - 0.35 * crisp)[..., None]
        hgt = np.sin(xx / (2.6 * K) * np.pi * 2 + i + np.pi / 2) * 0.5 + pillow(m, 0.2 * K) * 0.3
        ps.append((lit(c, hgt, m, spec=0.45, gloss=25, relief=0.4), (0.5, fy)))
    finish("bacon", place(ps))


def oeuf():
    S = 11
    def d(dr, w, h):
        pts = [(w / 2 + np.cos(t) * w * 0.44 * (1 + 0.1 * np.sin(5 * t + 2) + 0.05 * np.sin(11 * t)), h / 2 + np.sin(t) * h * 0.4 * (1 + 0.08 * np.cos(4 * t))) for t in np.linspace(0, 2 * np.pi, 90)]
        dr.polygon(pts, fill=255)
    m = shape(S, 9, d)
    h, w = m.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy, R = w * 0.46, h * 0.46, 1.7 * K
    rr = np.hypot(xx - cx, yy - cy) / R
    yolk = np.clip((1 - rr) * 8, 0, 1)
    white = hexrgb("#FBF8F0")[None, None] * np.ones((h, w, 1))
    crisp = np.clip(1 - pillow(m, 0.5 * K), 0, 1) * np.clip(noise(h, w, 10, 2, seed=5) * 1.6, 0, 1)
    white = white * (1 - crisp[..., None] * 0.5) + hexrgb("#C98A3E") * crisp[..., None] * 0.5
    yc = np.stack([np.interp(rr, [0, 0.7, 1], [a, b, c]) for a, b, c in zip(hexrgb("#FFC21A"), hexrgb("#FFAA00"), hexrgb("#F08A00"))], -1)
    col = white * (1 - yolk[..., None]) + yc * yolk[..., None]
    hgt = pillow(m, 0.8 * K) * 0.25 + np.sqrt(np.clip(1 - rr**2, 0, 1)) * 0.9 + blur(noise(h, w, 12, 2, seed=6), 3) * 0.15
    finish("oeuf", lit(col, hgt, m, spec=0.6, gloss=40, relief=0.6))


def cheddar():
    def d(dr, w, h):
        pts = [(w / 2 + np.cos(t) * w * 0.47 * (1 + 0.05 * np.sin(7 * t)), h / 2 + np.sin(t) * h * 0.44 * (1 + 0.12 * np.sin(5 * t + 1))) for t in np.linspace(0, 2 * np.pi, 80)]
        dr.polygon(pts, fill=255)
    m = shape(17, 6, d)
    h, w = m.shape
    hgt = pillow(m, 0.5 * K) * 0.4 + blur(noise(h, w, 18, 2, seed=8), 3) * 0.6
    col = np.stack([np.interp(hgt, [0, 1], [a, b]) for a, b in zip(hexrgb("#E0880E"), hexrgb("#FFB43A"))], -1)
    finish("cheddar", lit(col, hgt, m, spec=0.55, gloss=30, relief=0.5), shadow=0.25)


def boursin():
    ps = []
    for i in range(7):
        s = rng.uniform(2.2, 3.2)
        def d(dr, w, h):
            pts = [(w / 2 + np.cos(t) * w * 0.42 * (1 + 0.15 * np.sin(3 * t + i)), h / 2 + np.sin(t) * h * 0.42 * (1 + 0.15 * np.cos(2 * t + i))) for t in np.linspace(0, 2 * np.pi, 50)]
            dr.polygon(pts, fill=255)
        m = shape(s, s * 0.8, d)
        h, w = m.shape
        herbs = (noise(h, w, 2, 1, seed=100 + i) > 0.86).astype(np.float32)
        herbs = blur(herbs, 0.6)
        col = hexrgb("#F7F4EA")[None, None] * np.ones((h, w, 1))
        col = col * (1 - herbs[..., None] * 0.8) + hexrgb("#4E7A32") * herbs[..., None] * 0.8
        hgt = pillow(m, 0.6 * K) + blur(noise(h, w, 8, 2, seed=110 + i), 2) * 0.3
        ps.append((lit(col, hgt, m, spec=0.2, gloss=14, relief=0.5), ((i + 0.5) / 7 * 0.85 + 0.075, 0.5 + (i % 2 - 0.5) * 0.3)))
    finish("boursin", place(ps, shadow=0.3))


if __name__ == "__main__":
    tenders()
    escalope()
    merguez()
    slices("pastrami", 4, ["#5C1E24", "#A8404A"], "#E8B8B0", pepper=True)
    slices("jambon-dinde", 2, ["#E89A8C", "#F4BCAE"], None, wcm=8.5, round_=True, spread=0.6)
    bacon()
    oeuf()
    cheddar()
    boursin()
