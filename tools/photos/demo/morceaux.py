"""Morceaux de viande découpés dans les photos reçues (viande hachée, poulet tandoori)."""
import numpy as np
from PIL import Image
from commun import BRUTES, blur, ndi


def _load(name):
    return np.asarray(Image.open(BRUTES / f"{name}.jpg").convert("RGB")).astype(np.float32) / 255


def _pieces(img, mask, min_area, max_area):
    mask = ndi.binary_opening(mask, iterations=1)
    mask = ndi.binary_fill_holes(mask)
    lab, n = ndi.label(mask)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        m = lab[sl] == i
        area = m.sum()
        if area < min_area or area > max_area:
            continue
        a = blur(m.astype(np.float32), 0.8)
        a = np.clip((a - 0.25) / 0.5, 0, 1)
        out.append(np.dstack([img[sl], a]))
    return out


def boeuf():
    img = _load("frites-viande-hachee")
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    lum = (r + g + b) / 3
    m = (lum > 0.1) & (lum < 0.5) & (r - b > 0.06) & (r >= g) & (g - b < 0.2)
    m[:, :215] = False  # à gauche : le gratiné
    ps = _pieces(img, m, 400, 6000)
    def brun(p):
        a = p[..., 3] > 0.5
        c = p[..., :3][a].mean(0)
        return c[0] - c[2] > 0.1 and c.mean() < 0.42 and c[1] - c[2] < 0.12
    return [p for p in ps if brun(p)]


def tandoori():
    img = _load("frites-tandoori")
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    m = (r > 0.35) & (r - g > 0.22) & (r - b > 0.18)
    return _pieces(img, m, 900, 30000)


if __name__ == "__main__":
    from pathlib import Path
    import sys
    dest = Path(sys.argv[1])
    for name, ps in (("boeuf", boeuf()), ("tandoori", tandoori())):
        W = 1400
        sheet = np.zeros((600, W, 4), np.float32)
        x = y = rowh = 0
        for p in ps:
            h, w = p.shape[:2]
            if x + w > W:
                x, y, rowh = 0, y + rowh + 4, 0
            if y + h > 600:
                break
            sheet[y : y + h, x : x + w] = p
            x += w + 4
            rowh = max(rowh, h)
        print(name, len(ps), [p.shape[:2] for p in ps][:12])
        bg = np.ones((600, W, 3)) * 0.2
        comp = sheet[..., :3] * sheet[..., 3:] + bg * (1 - sheet[..., 3:])
        Image.fromarray((comp * 255).astype(np.uint8)).save(dest / f"{name}.png")
