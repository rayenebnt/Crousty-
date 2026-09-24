"""Frites du menu et frites cheddar (démo) : frites maison, paysannes, nappage cheddar, viandes posées dessus.

Photos reçues : un tas sur plateau inox (sources/*-plateau.webp). On détoure le tas, on le met à
l'échelle (le tas fait ~18 cm), puis :
- frites maison et paysannes : le tas entier ;
- viandes « en tas » (posées sur les frites cheddar) : une poignée prise au centre du tas ;
- nappage cheddar : dessiné, au cadrage exact des paysannes (il coule dessus) ;
- bacon en miettes : dessiné (pas de photo).
"""
import cv2
import numpy as np

from commun import PX, blur, hexrgb, noise, save
from compose import over
from dessins import lit, pillow
from plateaux import cutout

rng = np.random.default_rng(7)
PILE_CM = 18.0  # largeur d'une portion de frites servie sur le plateau


def crop_alpha(img):
    ys, xs = np.nonzero(img[..., 3] > 0.05)
    return img[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def resize(img, w, h):
    return cv2.resize(img, (int(w), int(h)), interpolation=cv2.INTER_AREA)


def to_scale(img, width_cm):
    h, w = img.shape[:2]
    k = width_cm * PX / w
    return resize(img, w * k, h * k), k


def handful(img, w_cm, h_cm, px_per_cm, seed):
    """Une poignée au centre du tas : contour irrégulier, bord adouci, légère ombre du bord."""
    h, w = img.shape[:2]
    W, H = int(w_cm * px_per_cm), int(h_cm * px_per_cm)
    cx, cy = w // 2, int(h * 0.55)
    sub = img[cy - H // 2 : cy + H // 2, cx - W // 2 : cx + W // 2].copy()
    hh, ww = sub.shape[:2]
    yy, xx = np.mgrid[0:hh, 0:ww].astype(np.float32)
    ang = np.arctan2(yy - hh / 2, xx - ww / 2)
    r = np.hypot((xx - ww / 2) / (ww / 2), (yy - hh / 2) / (hh / 2))
    wob = 0.93 + 0.06 * np.sin(ang * 3 + seed) + 0.06 * np.sin(ang * 7 + seed * 2) + (noise(hh, ww, 25, 2, seed=seed) - 0.5) * 0.18
    blob = np.clip((wob - r) / 0.06, 0, 1)
    sub[..., 3] *= blob
    edge = np.clip(1 - (wob - r) / 0.25, 0, 1) * blob
    sub[..., :3] *= (1 - 0.25 * edge)[..., None]
    return sub


def cheddar_mask(fries):
    """Forme du nappage : une large nappe et des coulures arrondies, seulement sur les frites."""
    h, w = fries.shape[:2]
    S = 2
    H, W = h * S, w * S
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cy = H * 0.5
    nx, ny = (xx - W / 2) / (W / 2), (yy - cy) / (H / 2)
    ang = np.arctan2(ny, nx)
    r = np.hypot(nx, ny)
    wob = 0.6 + 0.07 * np.sin(ang * 4 + 1) + 0.05 * np.sin(ang * 7 + 2) + (noise(H, W, 50, 3, seed=31) - 0.5) * 0.2
    m = np.clip((wob - r) / 0.025, 0, 1)
    # coulures : langues arrondies qui descendent entre les frites
    for k in range(8):
        a = rng.uniform(0, 2 * np.pi)
        L = rng.uniform(0.12, 0.28)
        wd = rng.uniform(0.06, 0.1)
        for t in np.linspace(0.5, 0.55 + L, 40):
            px = W / 2 + np.cos(a) * t * W / 2
            py = cy + np.sin(a) * t * H / 2
            rr = wd * W / 2 * (0.75 + 0.25 * np.cos((t - 0.5) / (L + 0.05) * np.pi / 2))
            m = np.maximum(m, np.clip((rr - np.hypot(xx - px, yy - py)) / 3, 0, 1))
    fa = cv2.resize(fries[..., 3], (W, H))
    m *= np.clip(fa * 1.5, 0, 1)
    m = blur(m, 1.5)
    return cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA)


def cheddar_over(fries):
    """Nappage cheddar fondu : une large nappe et des coulures arrondies, brillante, au cadrage des frites."""
    h, w = fries.shape[:2]
    S = 2
    H, W = h * S, w * S
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cy = H * 0.5
    nx, ny = (xx - W / 2) / (W / 2), (yy - cy) / (H / 2)
    ang = np.arctan2(ny, nx)
    r = np.hypot(nx, ny)
    wob = 0.6 + 0.07 * np.sin(ang * 4 + 1) + 0.05 * np.sin(ang * 7 + 2) + (noise(H, W, 50, 3, seed=31) - 0.5) * 0.2
    m = np.clip((wob - r) / 0.025, 0, 1)
    # coulures : langues arrondies qui descendent entre les frites
    for k in range(8):
        a = rng.uniform(0, 2 * np.pi)
        L = rng.uniform(0.12, 0.28)
        wd = rng.uniform(0.06, 0.1)
        for t in np.linspace(0.5, 0.55 + L, 40):
            px = W / 2 + np.cos(a) * t * W / 2
            py = cy + np.sin(a) * t * H / 2
            rr = wd * W / 2 * (0.75 + 0.25 * np.cos((t - 0.5) / (L + 0.05) * np.pi / 2))
            m = np.maximum(m, np.clip((rr - np.hypot(xx - px, yy - py)) / 3, 0, 1))
    fa = cv2.resize(fries[..., 3], (W, H))
    m *= np.clip(fa * 1.5, 0, 1)
    m = blur(m, 1.5)
    # relief : bombé de la nappe + les frites qu'on devine dessous
    fl = blur(cv2.resize(fries[..., :3].mean(-1), (W, H)), 3)
    hgt = blur(pillow(m, 0.3 * PX * S), 4) * 0.8 + fl * 0.5 + blur(noise(H, W, 18, 2, seed=33), 5) * 0.2
    gy, gx = np.gradient(hgt * 40)
    nrm = np.dstack([-gx, -gy, np.ones_like(gx)])
    nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    L_ = np.array([-0.4, -0.6, 0.7]); L_ /= np.linalg.norm(L_)
    diff = np.clip((nrm * L_).sum(-1), 0, 1)
    Hh = L_ + np.array([0, 0, 1.0]); Hh /= np.linalg.norm(Hh)
    spec = np.clip((nrm * Hh).sum(-1), 0, 1) ** 60 * 0.8
    t = np.clip(0.35 + 0.5 * diff + 0.25 * fl - 0.2, 0, 1)
    col = np.stack([np.interp(t, [0, 0.5, 1], [a, b, c]) for a, b, c in zip(hexrgb("#E88400"), hexrgb("#FFB21A"), hexrgb("#FFD457"))], -1)
    col = np.clip(col + spec[..., None], 0, 1)
    edge = np.clip(1 - m * 1.2, 0, 1)  # bords fins un peu plus foncés (épaisseur)
    col *= (1 - 0.25 * edge)[..., None]
    out = np.dstack([col, m * 0.97])
    return cv2.resize(out, (w, h), interpolation=cv2.INTER_AREA)


def bacon_bits(w_cm, h_cm):
    from dessins import K

    W, H = int(w_cm * K), int(h_cm * K)
    img = np.zeros((H, W, 4), np.float32)
    for i in range(55):
        s = rng.uniform(0.3, 0.6) * K
        S = int(s * 2 + 8)
        yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
        a = rng.uniform(0, np.pi)
        u = (xx - S / 2) * np.cos(a) + (yy - S / 2) * np.sin(a)
        v = -(xx - S / 2) * np.sin(a) + (yy - S / 2) * np.cos(a)
        m = ((np.abs(u) < s * rng.uniform(0.5, 1)) & (np.abs(v) < s * rng.uniform(0.25, 0.45))).astype(np.float32)
        m *= np.clip(noise(S, S, 4, 2, seed=i + 300) * 2.2, 0, 1)
        m = blur(m, 1)
        fat = np.clip((np.sin(u / s * 6 + i) - 0.5) * 3, 0, 1)
        col = hexrgb("#B8402E")[None, None] * np.ones((S, S, 1)) * (0.85 + 0.25 * noise(S, S, 5, 2, seed=i))[..., None]
        col = col * (1 - fat[..., None] * 0.8) + hexrgb("#F2C6A6") * fat[..., None] * 0.8
        p = lit(col, pillow(m, s * 0.2) * 0.5, m, spec=0.5, gloss=26)
        while True:
            x, y = rng.uniform(-1, 1, 2)
            if x * x + y * y < 1:
                break
        over(img, p, int(W / 2 + x * W * 0.4 - S / 2), int(H / 2 + y * H * 0.36 - S / 2), shadow=0.35, sh_off=(3, 4), sh_blur=3)
    return cv2.resize(img, (int(w_cm * PX), int(h_cm * PX)), interpolation=cv2.INTER_AREA)


if __name__ == "__main__":
    fr = crop_alpha(cutout("frites", holes=8000))
    frites, _ = to_scale(fr, PILE_CM * 0.95)
    save("frites", frites, synthese=False)

    pay = crop_alpha(cutout("paysannes"))
    pay_s, k_pay = to_scale(pay, PILE_CM)
    save("frites-paysannes", pay_s, synthese=False)
    # Le nappage est enregistré au cadrage exact des paysannes (il coule dessus).
    save("nappage-cheddar__sur-frites", cheddar_over(pay_s), crop=False)

    px_src = pay.shape[1] / PILE_CM  # px de la photo source par cm (même plateau, même cadrage)
    for src, name, seed in (("tandoori", "tandoori__tas", 3), ("viande", "viande-hachee__tas", 5)):
        pile = crop_alpha(cutout(src))
        hand = handful(pile, 10.5, 7.5, px_src, seed)
        save(name, resize(hand, hand.shape[1] * PX / px_src, hand.shape[0] * PX / px_src), synthese=False)
    save("bacon-miettes__tas", bacon_bits(10, 7))
