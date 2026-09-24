"""Photos des catégories : efface le titre écrit en haut (fond noir reconstruit), puis agrandit.

    python3 tools/menus/nettoyer.py <image> <nom> <hauteur_max_du_titre_en_%>
Écrit public/menus/<nom>.webp.
"""
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]


def main(src, name, top_pct):
    img = cv2.imread(src, cv2.IMREAD_COLOR)
    # Bords blancs éventuels (capture d'écran) : on les retire.
    light = img.min(axis=2) > 235
    rows = np.where(light.mean(axis=1) < 0.9)[0]
    cols = np.where(light.mean(axis=0) < 0.9)[0]
    img = img[rows[0] + 2 : rows[-1] - 1, cols[0] + 2 : cols[-1] - 1]
    h, w = img.shape[:2]
    top = int(h * top_pct / 100)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    # Titre = tout ce qui est clair ou coloré sur le fond noir, dans la bande du haut.
    mask = ((hsv[..., 2] > 70) | (hsv[..., 1] > 90)).astype(np.uint8)
    mask[top:] = 0
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=2)
    out = cv2.inpaint(img, mask * 255, 9, cv2.INPAINT_TELEA)
    # Le fond du haut, lissé : aucune trace des lettres.
    band = out[:top].copy()
    smooth = cv2.GaussianBlur(band, (0, 0), 6)
    out[:top] = np.where(mask[:top, :, None] > 0, smooth, band)
    # Agrandissement ×4 (Lanczos) puis léger renfort de netteté.
    big = cv2.resize(out, (w * 4, h * 4), interpolation=cv2.INTER_LANCZOS4)
    blur = cv2.GaussianBlur(big, (0, 0), 2.0)
    big = cv2.addWeighted(big, 1.35, blur, -0.35, 0)
    dst = ROOT / "public/menus" / f"{name}.webp"
    cv2.imwrite(str(dst), big, [cv2.IMWRITE_WEBP_QUALITY, 86])
    print("✓", dst.name, big.shape[1], "×", big.shape[0])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]))
