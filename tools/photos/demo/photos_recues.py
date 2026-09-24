"""Images de démo tirées des photos reçues (plateaux inox) :

- gratin-fromage__avant : l'emmental râpé de la photo, posé dans le pain (au cadrage de « après ») ;
- nappage-cheddar__sur-frites : le cheddar gratiné de la photo, en nappe et coulures sur les paysannes ;
- kebab, tandoori, poulet, curry : portions « dans le pain » découpées dans les photos de viande ;
- pain-sandwich__ouvert : la photo du pain ouvert, vide ;
- tandoori__tas, viande-hachee__tas : la viande éparpillée sur les frites cheddar.

À lancer après frites.py (il réécrit le nappage) :  python3 photos_recues.py
"""
import cv2
import numpy as np

from commun import BRUTES, PX, blur, load, ndi, noise, save
from frites import cheddar_mask, crop_alpha, handful, resize
from plateaux import cutout


def texture(name, box=(330, 330, 1230, 780)):
    """Cœur du tas, sans bord ni plateau : une texture pleine (RGB)."""
    c = cutout(name, sat=0.25, sat_tex=0.15)
    x0, y0, x1, y1 = box
    return c[y0:y1, x0:x1, :3]


BREAD_CM = 27.0  # longueur du pain


def pain():
    """Pain ouvert, vide : détouré du fond blanc (seul le blanc relié au bord est retiré)."""
    img = cv2.imread(str(BRUTES / "pain-ouvert.webp"))
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    white = ((hsv[..., 2] > 238) & (hsv[..., 1] < 22)).astype(np.uint8)
    n, lab = cv2.connectedComponents(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = (~np.isin(lab, list(border))).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
    fg = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.float32)
    a = np.clip((blur(fg, 1.5) - 0.2) / 0.6, 0, 1)
    rgb = img[..., ::-1].astype(np.float32) / 255
    out = crop_alpha(np.dstack([rgb, a]))
    k = BREAD_CM * PX / out.shape[1]
    save("pain-sandwich__ouvert", resize(out, out.shape[1] * k, out.shape[0] * k), synthese=False)


def apres_au_pain():
    """Le gratiné « sorti du four » ramené à la taille et à la forme du pain (sinon il dépasse)."""
    src = cv2.imread(str(BRUTES / "gratine-apres-detoure.png"), cv2.IMREAD_UNCHANGED)
    if src is None:  # première fois : on garde la version d'origine comme source
        cur = (np.clip(load("gratin-fromage__apres"), 0, 1) * 255).astype(np.uint8)
        cv2.imwrite(str(BRUTES / "gratine-apres-detoure.png"), cv2.cvtColor(cur, cv2.COLOR_RGBA2BGRA))
        src = cv2.imread(str(BRUTES / "gratine-apres-detoure.png"), cv2.IMREAD_UNCHANGED)
    g = cv2.cvtColor(src, cv2.COLOR_BGRA2RGBA).astype(np.float32) / 255
    base = load("pain-sandwich__ouvert")
    h, w = base.shape[:2]
    g = crop_alpha(g)
    g = cv2.resize(g, (int(w * 0.99), int(h * 0.99)), interpolation=cv2.INTER_AREA)
    out = np.zeros((h, w, 4), np.float32)
    y0, x0 = (h - g.shape[0]) // 2, (w - g.shape[1]) // 2
    out[y0 : y0 + g.shape[0], x0 : x0 + g.shape[1]] = g
    out[..., 3] = np.minimum(out[..., 3], blur(base[..., 3], 1.0))
    save("gratin-fromage__apres", out, crop=False, synthese=False)


def emmental_avant():
    """Emmental posé sur la mie, au cadrage du pain ; le gratiné « après » a la même taille."""
    base = load("pain-sandwich__ouvert")
    h, w = base.shape[:2]
    alpha = blur(np.clip((blur(base[..., 3], 6) - 0.5) * 4 + 0.5, 0, 1), 1.2)
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


def eparpille(src, name, seed):
    """Viande éparpillée sur les frites cheddar : une poignée découpée en morceaux, écartés du centre."""
    from skimage.segmentation import felzenszwalb

    pay = crop_alpha(cutout("paysannes"))
    ppc = pay.shape[1] / 18.0  # même plateau, même cadrage : px source par cm
    hand = handful(crop_alpha(cutout(src)), 11.5, 6.2, ppc, seed)
    h, w = hand.shape[:2]
    mask = hand[..., 3] > 0.4
    rgb = hand[..., :3].copy()
    rgb[~mask] = 0
    labels = felzenszwalb(rgb, scale=160, sigma=0.7, min_size=max(80, int(mask.sum() / 90))) + 1
    labels[~mask] = 0
    rng = np.random.default_rng(seed)
    SPREAD = (1.5, 1.45)  # le tas s'étale : 11,5 × 6 cm → ≈ 17 × 9 cm
    H, W = int(h * SPREAD[1] + 40), int(w * SPREAD[0] + 40)
    out = np.zeros((H, W, 4), np.float32)
    from compose import over

    ids = [i for i in np.unique(labels) if i]
    for i in rng.permutation(ids):
        m = labels == i
        if rng.random() < 0.12:  # quelques trous : le cheddar se voit entre les morceaux
            continue
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        piece = hand[y0:y1, x0:x1].copy()
        piece[..., 3] *= m[y0:y1, x0:x1]
        cy, cx = ys.mean(), xs.mean()
        ny = H / 2 + (cy - h / 2) * SPREAD[1] + rng.normal(0, 4)
        nx = W / 2 + (cx - w / 2) * SPREAD[0] + rng.normal(0, 4)
        over(out, piece, int(nx - (cx - x0)), int(ny - (cy - y0)), shadow=0.16, sh_off=(3, 4), sh_blur=3)
    save(name, resize(out, W * PX / ppc, H * PX / ppc), synthese=False)


if __name__ == "__main__":
    pain()
    apres_au_pain()
    emmental_avant()
    eparpille("tandoori", "tandoori__tas", 3)
    eparpille("viande", "viande-hachee__tas", 5)
    cheddar_nappe()
    portion("viande", "kebab", seed=2)
    portion("tandoori", "tandoori", seed=3)
    portion("tandoori", "poulet", (22, 0.62, 1.02), seed=4)
    portion("tandoori", "curry", (24, 1.05, 1.02), seed=5)
