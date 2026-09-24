"""Galerie « Chez Le Crousty » : images tirées de la vidéo (filigrane effacé) et photos reçues.

    python3 tools/hero/galerie.py <video.mov>
"""
import sys
from pathlib import Path

import cv2

from filigrane import clean, templates_for
from images import ROOT, grade, read_frames

OUT = ROOT / "public/galerie"
SOURCES = ROOT / "tools/photos/demo/sources"
# nom → seconde de la vidéo
STILLS = {"accueil-porte": 1.2, "comptoir": 6.6, "burger-frites": 8.6}
# nom → (photo reçue, rognage bas en px : la date incrustée)
PHOTOS = {"gratine-steak": ("gratine.jpg", 70), "frites-cheddar-viande": ("frites-viande-hachee.jpg", 0), "frites-cheddar-tandoori": ("frites-tandoori.jpg", 0)}


def main(video):
    frames = read_frames(video, 16)
    templates = templates_for(frames)
    OUT.mkdir(parents=True, exist_ok=True)
    for name, t in STILLS.items():
        img, _ = clean(frames[round(t * 30)], templates)
        cv2.imwrite(str(OUT / f"{name}.webp"), grade(img), [cv2.IMWRITE_WEBP_QUALITY, 82])
        print("✓", name)
    for name, (src, crop) in PHOTOS.items():
        img = cv2.imread(str(SOURCES / src))
        if crop:
            img = img[:-crop]
        cv2.imwrite(str(OUT / f"{name}.webp"), img, [cv2.IMWRITE_WEBP_QUALITY, 82])
        print("✓", name, img.shape[1], "×", img.shape[0])


if __name__ == "__main__":
    main(sys.argv[1])
