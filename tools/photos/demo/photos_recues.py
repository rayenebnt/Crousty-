"""Images de démo tirées des photos reçues (plateaux inox) :

- gratin-fromage__avant : l'emmental râpé de la photo, posé dans le pain (au cadrage de « après ») ;
- nappage-cheddar__sur-frites : le cheddar gratiné de la photo, en nappe et coulures sur les paysannes ;
- kebab, tandoori, poulet, curry : portions « dans le pain » découpées dans les photos de viande.

À lancer après frites.py (il réécrit le nappage) :  python3 photos_recues.py
"""
import cv2
import numpy as np

from commun import PX, blur, load, ndi, noise, save
from frites import cheddar_mask, crop_alpha, handful, resize
from plateaux import cutout


def texture(name, box=(330, 330, 1230, 780)):
    """Cœur du tas, sans bord ni plateau : une texture pleine (RGB)."""
    c = cutout(name, sat=0.25, sat_tex=0.15)
    x0, y0, x1, y1 = box
    return c[y0:y1, x0:x1, :3]


def emmental_avant():
    apres = load("gratin-fromage__apres")
    h, w = apres.shape[:2]
    alpha = blur(np.clip((blur(apres[..., 3], 6) - 0.5) * 4 + 0.5, 0, 1), 1.2)
    dist = ndi.distance_transform_edt(alpha > 0.5)
    tex = cv2.resize(texture("emmental"), (w, h), interpolation=cv2.INTER_AREA)
    lum = tex.mean(-1)
    # Dans le pain, avec un bord effiloché : près du bord, seuls les brins (clairs) restent.
    zone = np.clip((dist - 12 - noise(h, w, 20, 3, seed=41) * 14) / 10, 0, 1)
    strands = np.clip((lum - 0.72) / 0.12, 0, 1)
    a = np.clip(zone * 1.6 - (1 - strands) * np.clip(1 - (dist - 12) / 40, 0, 1), 0, 1)
    a = blur(a, 0.6)
    # Ombre douce sous le fromage (il repose sur la garniture).
    save("gratin-fromage__avant", np.dstack([tex, a]), crop=False, synthese=False)


def cheddar_nappe():
    fries = load("frites-paysannes")
    h, w = fries.shape[:2]
    m = cheddar_mask(fries)
    tex = cv2.resize(texture("cheddar", (250, 300, 1300, 800)), (w, h), interpolation=cv2.INTER_AREA)
    # Bord un peu plus foncé (épaisseur), le reste tel quel : c'est la vraie photo.
    edge = np.clip(1 - m * 1.3, 0, 1)
    tex = tex * (1 - 0.22 * edge)[..., None]
    save("nappage-cheddar__sur-frites", np.dstack([tex, m * 0.98]), crop=False, synthese=False)


def shift(p, hue_deg, sat, val=1.0):
    """Décale la teinte (garde les nuances et le grillé de la photo)."""
    rgb = (np.clip(p[..., :3], 0, 1) * 255).astype(np.uint8)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[..., 0] = (hsv[..., 0] + hue_deg / 2) % 180
    hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * val, 0, 255)
    out = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32) / 255
    return np.dstack([out, p[..., 3]])


def portion(src, name, recolor=None, seed=1):
    """Portion en long qui remplit le pain ouvert (≈ 23 × 8 cm), prise au cœur du tas."""
    pile = crop_alpha(cutout(src))
    ppc = pile.shape[1] * 0.9 / 23  # px source par cm pour que la portion tienne dans le tas
    p = handful(pile, 23, 8.2, ppc, seed)
    if recolor:
        p = shift(p, *recolor)
    save(name, resize(p, p.shape[1] * PX / ppc, p.shape[0] * PX / ppc), synthese=bool(recolor))


if __name__ == "__main__":
    emmental_avant()
    cheddar_nappe()
    portion("viande", "kebab", seed=2)
    portion("tandoori", "tandoori", seed=3)
    portion("tandoori", "poulet", (22, 0.62, 1.02), seed=4)
    portion("tandoori", "curry", (24, 1.05, 1.02), seed=5)
