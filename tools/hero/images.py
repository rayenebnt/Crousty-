"""Hero de l'accueil : la vidéo « entrée chez Le Crousty » découpée en images pour le défilement.

    python3 tools/hero/images.py <video.mov>

- garde 0 → 5,6 s (la porte, l'entrée, le comptoir), une image sur deux (15 images/s) ;
- efface le filigrane TikTok ;
- étalonnage « cinéma » léger (contraste, tons chauds) ;
- écrit public/hero/f000.webp… et src/data/hero.json.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

from filigrane import clean, templates_for

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/hero"
END_S = 5.6
STEP = 2  # une image sur deux


def ffmpeg():
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return "ffmpeg"


def grade(img):
    """Contraste doux, ombres un peu froides, hautes lumières chaudes, légère saturation."""
    f = img.astype(np.float32) / 255
    f = np.clip((f - 0.5) * 1.1 + 0.5 - 0.02, 0, 1)
    lum = f.mean(-1, keepdims=True)
    warm = np.array([0.94, 1.0, 1.07], np.float32)  # BGR : plus de rouge
    cool = np.array([1.04, 1.0, 0.97], np.float32)
    f = f * (warm * lum + cool * (1 - lum))
    gray = f.mean(-1, keepdims=True)
    f = gray + (f - gray) * 1.12
    return (np.clip(f, 0, 1) * 255).round().astype(np.uint8)


def read_frames(video, seconds=16):
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([ffmpeg(), "-loglevel", "error", "-i", video, "-t", str(seconds), f"{tmp}/f%03d.png"], check=True)
        return [cv2.imread(str(p)) for p in sorted(Path(tmp).glob("f*.png"))]


def main(video):
    frames = read_frames(video, 10)
    n_end = int(END_S * 30)
    templates = templates_for(frames)
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("f*.webp"):
        old.unlink()
    kept = list(range(0, n_end + 1, STEP))
    for k, i in enumerate(kept):
        img, _ = clean(frames[i], templates)
        img = grade(img)
        cv2.imwrite(str(OUT / f"f{k:03d}.webp"), img, [cv2.IMWRITE_WEBP_QUALITY, 70])
    # Dernière image en meilleure qualité : l'écran s'y arrête pendant l'apparition du nom.
    last, _ = clean(frames[kept[-1]], templates)
    cv2.imwrite(str(OUT / "fin.webp"), grade(last), [cv2.IMWRITE_WEBP_QUALITY, 88])
    cv2.imwrite(str(Path(__file__).parent / "fin.png"), grade(last))  # pour personne.mjs
    h, w = frames[0].shape[:2]
    (ROOT / "src/data/hero.json").write_text(json.dumps({"count": len(kept), "w": w, "h": h, "fps": 30 / STEP}, indent=2) + "\n")
    size = sum(p.stat().st_size for p in OUT.glob("f*.webp"))
    print(f"{len(kept)} images, {size / 1024:.0f} Ko → {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
