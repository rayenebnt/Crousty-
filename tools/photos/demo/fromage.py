"""Gratiné « avant le four » : l'emmental râpé posé sur la garniture, au cadrage exact de la photo « après »."""
import numpy as np
from PIL import Image, ImageDraw
from commun import blur, hexrgb, load, ndi, noise, save
from compose import over
from dessins import lit, pillow

src = load("gratin-fromage__apres")
h, w = src.shape[:2]
S = 2  # dessin en double résolution
H, W = h * S, w * S
alpha = blur(np.clip((blur(src[:, :, 3], 6) - 0.5) * 4 + 0.5, 0, 1), 1.2)
dist = ndi.distance_transform_edt(alpha > 0.5)
# Zone couverte : l'intérieur du pain, un peu débordante sur la croûte.
zone = np.clip((dist - 14) / 20, 0, 1)
zone = np.asarray(Image.fromarray((zone * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)).astype(np.float32) / 255

r = np.random.default_rng(5)
img = np.zeros((H, W, 4), np.float32)
# Sous les brins : une couche de fromage (les trous ne laissent pas voir d'ombre grise).
base = np.clip((zone - 0.3) / 0.5, 0, 1) * 0.9
img[..., :3] = hexrgb("#F6E9C0")
img[..., 3] = blur(base, 6)
ys, xs = np.nonzero(zone > 0.5)
cols = [hexrgb(c) for c in ("#FFF6D6", "#FCEDB8", "#F8E3A0", "#FFF1C4", "#F3DB90")]
L = 30 * S  # px par cm
shreds = []
for k in range(5):
    size = int(1.2 * L)
    im = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(im)
    pts = [(size / 2 + (t - 0.5) * size * 0.8, size / 2 + np.sin(t * 3 + k) * size * 0.06) for t in np.linspace(0, 1, 12)]
    d.line(pts, fill=255, width=int(0.26 * L), joint="curve")
    m = blur(np.asarray(im).astype(np.float32) / 255, 0.8)
    shreds.append((m, pillow(m, 0.12 * L)))
for k in range(1900):
    i = r.integers(len(xs))
    x, y = xs[i], ys[i]
    m, hg = shreds[r.integers(len(shreds))]
    col = cols[r.integers(len(cols))][None, None] * (0.95 + 0.12 * hg[..., None])
    p = lit(col, hg * 0.6, m, spec=0.25, gloss=18)
    im = Image.fromarray((p * 255).astype(np.uint8), "RGBA")
    sc = r.uniform(0.6, 1.2)
    im = im.resize((max(2, int(im.width * sc)), max(2, int(im.height * sc))), Image.BILINEAR).rotate(r.uniform(0, 360), Image.BILINEAR, expand=True)
    p = np.asarray(im).astype(np.float32) / 255
    over(img, p, int(x - p.shape[1] / 2), int(y - p.shape[0] / 2), shadow=0.12, sh_off=(2, 3), sh_blur=2)
img[..., 3] *= np.clip(zone * 1.5, 0, 1)
save("gratin-fromage__avant", img, supersample=S, crop=False)
