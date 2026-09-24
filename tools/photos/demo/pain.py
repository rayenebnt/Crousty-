"""Pain ouvert, vide : la silhouette du pain de la photo du gratiné, croûte dorée et mie apparente."""
import numpy as np
from commun import blur, hexrgb, load, ndi, noise, save, shade

src = load("gratin-fromage__apres")
h, w = src.shape[:2]
# Silhouette lissée (le détourage laisse des encoches).
alpha = blur(np.clip((blur(src[:, :, 3], 6) - 0.5) * 4 + 0.5, 0, 1), 1.2)
dist = ndi.distance_transform_edt(alpha > 0.5)
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
cy = (yy * alpha).sum() / alpha.sum()

# Intérieur ouvert : à ~1 cm du bord, contour irrégulier (la croûte déchirée).
n = noise(h, w, 30, 3, seed=3)
lip = 28 + n * 12
inner = blur(np.clip((dist - lip) / 5, 0, 1), 1.0)

# Croûte : un bourrelet arrondi (clair sur le dessus, foncé sur les flancs), doré et légèrement marbré.
t = np.clip(dist / lip, 0, 1)
dome = np.sin(t * np.pi * 0.95)
mott = noise(h, w, 40, 3, seed=11)
crust = np.stack([np.interp(dome, [0, 0.5, 1], [c1, c2, c3]) for c1, c2, c3 in zip(hexrgb("#9A5A24"), hexrgb("#C98A45"), hexrgb("#E6B574"))], -1)
crust *= (0.9 + 0.16 * mott)[..., None]
crust *= np.clip(shade(blur(dome, 2) * 18, 1.0), 0.8, 1.2)[..., None]
freckle = blur((noise(h, w, 3, 1, seed=12) > 0.9).astype(np.float32), 0.7) * (1 - inner)
crust = crust * (1 - 0.12 * freckle[..., None])

# Mie : crème chaude, alvéoles irrégulières, dorée près de la croûte, fente ombrée au centre.
holes = np.clip((0.22 - noise(h, w, 6, 2, seed=5)) / 0.08, 0, 1) + 0.6 * np.clip((0.16 - noise(h, w, 3, 2, seed=8)) / 0.06, 0, 1)
holes = blur(np.clip(holes, 0, 1), 0.9)
crumb = hexrgb("#F4E4C3")[None, None] * np.ones((h, w, 1), np.float32)
toast = np.clip(1 - (dist - lip) / 26, 0, 1)[..., None] ** 2
crumb = crumb * (1 - 0.4 * toast) + hexrgb("#D59A55")[None, None] * 0.4 * toast
crumb = crumb * (1 - 0.3 * holes[..., None]) + hexrgb("#B98A55") * 0.3 * holes[..., None] * 0.6
crumb *= (0.95 + 0.07 * noise(h, w, 16, 3, seed=6))[..., None]
wob = (noise(1, w, 60, 2, seed=9)[0] - 0.5) * h * 0.08
slit = np.exp(-(((yy - cy - wob[None, :]) / (h * 0.035)) ** 2)) * np.clip((dist - 30) / 50, 0, 1)
crumb *= (1 - 0.16 * slit)[..., None]
rim = np.clip(1 - (dist - lip) / 12, 0, 1) * inner
crumb *= (1 - 0.2 * rim)[..., None]

rgb = crust * (1 - inner[..., None]) + crumb * inner[..., None]
save("pain-sandwich__ouvert", np.dstack([rgb, alpha]))
