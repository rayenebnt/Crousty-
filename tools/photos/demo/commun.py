"""Outils communs aux images de démonstration (en attendant la séance photo)."""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "public/photos"
MANIFEST = ROOT / "src/data/photos.json"
BRUTES = Path(__file__).resolve().parent / "sources"
PX = 30  # px par cm, comme la chaîne de traitement
rng = np.random.default_rng(1994)


def load(name):
    return np.asarray(Image.open(OUT / f"{name}.webp").convert("RGBA")).astype(np.float32) / 255


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


def noise(h, w, scale, octaves=4, seed=0):
    """Bruit fractal lisse (valeurs 0..1)."""
    r = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        s = max(1, int(scale / 2**o))
        g = r.random((h // s + 3, w // s + 3)).astype(np.float32)
        up = ndi.zoom(g, s, order=3)[:h, :w]
        out += amp * up
        tot += amp
        amp *= 0.5
    out /= tot
    return (out - out.min()) / (out.max() - out.min() + 1e-6)


def blur(a, s):
    return ndi.gaussian_filter(a, s)


def shade(height, strength=1.0, light=(-0.6, -0.8)):
    """Éclairage d'un relief (lumière en haut à gauche) : 1 = neutre."""
    gy, gx = np.gradient(height)
    lx, ly = light
    d = -(gx * lx + gy * ly) * strength
    return 1 + d


def save(name, rgba, supersample=1, synthese=True, crop=True):
    rgba = np.clip(rgba, 0, 1)
    img = Image.fromarray((rgba * 255).round().astype(np.uint8), "RGBA")
    if supersample > 1:
        img = img.resize((img.width // supersample, img.height // supersample), Image.LANCZOS)
    # Recadrage sur les pixels visibles (marge 3 %)
    a = np.asarray(img)[:, :, 3]
    ys, xs = np.nonzero(a > 8)
    if crop and len(xs):
        m = int(max(img.width, img.height) * 0.02)
        img = img.crop((max(0, xs.min() - m), max(0, ys.min() - m), min(img.width, xs.max() + m + 1), min(img.height, ys.max() + m + 1)))
    img.save(OUT / f"{name}.webp", "WEBP", quality=84, alpha_quality=90, method=5)
    man = json.loads(MANIFEST.read_text())
    man["files"][name] = {"w": img.width, "h": img.height, "wCm": round(img.width / PX, 2), "hCm": round(img.height / PX, 2), "demo": True, **({"synthese": True} if synthese else {})}
    man["files"] = dict(sorted(man["files"].items()))
    MANIFEST.write_text(json.dumps(man, indent=2, ensure_ascii=False) + "\n")
    print(f"✓ {name} {img.width}×{img.height}")
    return img
