"""Assemblage de morceaux (photos ou dessins) en une portion posée en long dans le pain."""
import numpy as np
from PIL import Image
from commun import blur, hexrgb, rng


def to_img(p):
    return Image.fromarray((np.clip(p, 0, 1) * 255).astype(np.uint8), "RGBA")


def over(dst, src, x, y, shadow=0.45, sh_off=(4, 6), sh_blur=4):
    """Pose src (RGBA float) sur dst en (x, y), avec une ombre de contact."""
    h, w = src.shape[:2]
    H, W = dst.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    s = src[y0 - y : y1 - y, x0 - x : x1 - x]
    if shadow:
        pad = sh_blur * 3
        a = np.pad(src[..., 3], pad)
        a = blur(a, sh_blur) * shadow
        sx, sy = x - pad + sh_off[0], y - pad + sh_off[1]
        ah, aw = a.shape
        X0, Y0, X1, Y1 = max(0, sx), max(0, sy), min(W, sx + aw), min(H, sy + ah)
        if X1 > X0 and Y1 > Y0:
            sa = a[Y0 - sy : Y1 - sy, X0 - sx : X1 - sx]
            dst[Y0:Y1, X0:X1, :3] *= (1 - sa[..., None] * 0.9)
            dst[Y0:Y1, X0:X1, 3] = np.maximum(dst[Y0:Y1, X0:X1, 3], sa * 0.6)
    a = s[..., 3:4]
    dst[y0:y1, x0:x1, :3] = s[..., :3] * a + dst[y0:y1, x0:x1, :3] * (1 - a)
    dst[y0:y1, x0:x1, 3] = a[..., 0] + dst[y0:y1, x0:x1, 3] * (1 - a[..., 0])


def transform(p, scale=1.0, angle=0.0, flip=False, sx=1.0):
    im = to_img(p)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im = im.resize((max(1, int(im.width * scale * sx)), max(1, int(im.height * scale))), Image.BICUBIC)
    im = im.rotate(angle, resample=Image.BICUBIC, expand=True)
    return np.asarray(im).astype(np.float32) / 255


def scatter(pieces, wcm, hcm, px=30, count=40, scale=(1.0, 1.4), sx=1.0, shadow=0.45, seed=0, angle=180):
    """Remplit une ellipse wcm × hcm de morceaux au hasard (les plus gros d'abord)."""
    r = np.random.default_rng(seed)
    W, H = int(wcm * px), int(hcm * px)
    pad = 60
    dst = np.zeros((H + 2 * pad, W + 2 * pad, 4), np.float32)
    for k in range(count):
        p = pieces[r.integers(len(pieces))]
        t = transform(p, r.uniform(*scale), r.uniform(-angle, angle), bool(r.integers(2)), sx)
        # position dans l'ellipse (plus dense au centre)
        while True:
            u, v = r.uniform(-1, 1, 2)
            if u * u + v * v <= 1:
                break
        cx = pad + W / 2 + u * W / 2 * 0.8
        cy = pad + H / 2 + v * H / 2 * 0.75
        over(dst, t, int(cx - t.shape[1] / 2), int(cy - t.shape[0] / 2), shadow)
    return dst


def gradient_map(p, stops):
    """Recolore d'après la luminance (garde la texture de la photo)."""
    lum = p[..., :3].mean(-1)
    lo, hi = np.percentile(lum[p[..., 3] > 0.5], [3, 97]) if (p[..., 3] > 0.5).any() else (0, 1)
    t = np.clip((lum - lo) / (hi - lo + 1e-6), 0, 1)
    xs = np.linspace(0, 1, len(stops))
    cols = np.array([hexrgb(s) for s in stops])
    rgb = np.stack([np.interp(t, xs, cols[:, i]) for i in range(3)], -1)
    return np.dstack([rgb, p[..., 3]])


def grade(p, sat=1.0, gain=1.0, gamma=1.0):
    rgb = p[..., :3]
    m = rgb.mean(-1, keepdims=True)
    rgb = np.clip(m + (rgb - m) * sat, 0, 1) * gain
    rgb = np.clip(rgb, 0, 1) ** gamma
    return np.dstack([rgb, p[..., 3]])
