"""Filigrane TikTok de la vidéo : masque (logo + @compte) aux deux positions où il apparaît."""
import cv2
import numpy as np

# Boîtes (x0, y0, x1, y1) dans l'image 480 × 854 : à gauche au début, à droite ensuite.
BOXES = {"gauche": (0, 375, 150, 465), "droite": (325, 585, 480, 670)}


def detail(img, box):
    """Pixels plus clairs que leur voisinage, ou très colorés (logo cyan / rouge)."""
    x0, y0, x1, y1 = box
    crop = img[y0:y1, x0:x1].astype(np.float32)
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    bg = cv2.medianBlur(gray.astype(np.uint8), 15).astype(np.float32)
    hsv = cv2.cvtColor(crop.astype(np.uint8), cv2.COLOR_BGR2HSV)
    bright = (gray - bg) > 22
    colored = (hsv[..., 1] > 70) & (hsv[..., 2] > 90)
    return bright | colored


def template(frames, box):
    """Masque du filigrane : pixels « détail » présents dans la plupart des images (le fond, lui, bouge)."""
    acc = np.mean([detail(f, box) for f in frames], axis=0)
    m = (acc > 0.4).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    # lettres pleines et halo coloré compris
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    return m


def presence(img, box, tpl):
    d = detail(img, box)
    return (d & (tpl > 0)).sum() / max(1, tpl.sum())


def clean(img, templates, threshold=0.25):
    """Efface le filigrane là où il est présent (inpainting)."""
    mask = np.zeros(img.shape[:2], np.uint8)
    for name, box in BOXES.items():
        tpl = templates[name]
        if presence(img, box, tpl) > threshold:
            x0, y0, x1, y1 = box
            mask[y0:y1, x0:x1] |= tpl
    if not mask.any():
        return img, mask
    mask = cv2.dilate(mask, np.ones((9, 9), np.uint8), iterations=1)
    return cv2.inpaint(img, mask * 255, 6, cv2.INPAINT_TELEA), mask


def templates_for(frames):
    """Masques aux deux positions, appris sur la vidéo (30 images/s, au moins 10 s)."""
    return {"gauche": template(frames[20:130:6], BOXES["gauche"]), "droite": template(frames[150:300:8], BOXES["droite"])}
