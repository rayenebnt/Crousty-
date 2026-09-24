"""Détoure les aliments posés sur un plateau inox (photos de démo : frites, paysannes, viandes).

Le plateau est gris et lisse, les aliments sont colorés et texturés : couleur + texture suffisent.
"""
import cv2
import numpy as np

from commun import BRUTES


# Fond du plateau (même plateau, même cadrage sur les quatre photos) : ses parois reflètent
# les aliments, la couleur ne suffit pas à les écarter.
FLOOR = np.array([(178, 232), (1358, 232), (1452, 828), (84, 828)], np.int32)
RIM_TOP = 150  # au-dessus du rebord arrière : fond blanc, ou aliments qui dépassent


def cutout(name, sat=0.42, sat_tex=0.28, tex_min=7.0, holes=3000):
    img = cv2.imread(str(BRUTES / f"{name}-plateau.webp"))
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    s, v = hsv[..., 1] / 255, hsv[..., 2] / 255
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    mu = cv2.blur(gray, (7, 7))
    tex = np.sqrt(np.maximum(cv2.blur(gray * gray, (7, 7)) - mu * mu, 0))
    m = (((s > sat) | ((s > sat_tex) & (tex > tex_min))) & (v > 0.18)).astype(np.uint8)
    inside = np.zeros_like(m)
    cv2.fillPoly(inside, [FLOOR], 1)
    inside[:RIM_TOP] = 1
    # Devant la paroi arrière, seuls les aliments bien éclairés (la paroi est dans l'ombre).
    band = np.zeros_like(m)
    band[RIM_TOP:FLOOR[0][1]] = 1
    inside |= band & (v > 0.62) & (s > 0.35)
    m &= inside
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    # Les parois du plateau sont des bandes fines : une ouverture large les efface, puis on ne
    # garde que ce qui touche le cœur du tas (les bords des aliments restent nets).
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45))
    core = cv2.morphologyEx(m, cv2.MORPH_OPEN, k)
    n, lab, st, _ = cv2.connectedComponentsWithStats(core)
    core = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    m = m & cv2.dilate(core, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    # Petits trous seulement (les grands laissent voir le plateau : on les garde transparents).
    inv = 1 - m
    n, lab, st, _ = cv2.connectedComponentsWithStats(inv)
    for k in range(1, n):
        if st[k, cv2.CC_STAT_AREA] < holes:
            m[lab == k] = 1
    a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2)
    a = np.clip((a - 0.2) / 0.6, 0, 1)
    rgb = img[..., ::-1].astype(np.float32) / 255
    return np.dstack([rgb, a])


if __name__ == "__main__":
    import sys
    rows = []
    for n in ["frites", "viande", "tandoori", "paysannes"]:
        c = cutout(n)
        bg = np.array([1, 0, 1], np.float32)
        comp = c[..., :3] * c[..., 3:] + bg * (1 - c[..., 3:])
        rows.append(cv2.resize((comp[..., ::-1] * 255).astype(np.uint8), (768, 512)))
    cv2.imwrite(sys.argv[1], np.vstack([np.hstack(rows[:2]), np.hstack(rows[2:])]))
