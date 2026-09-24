"""Découpe chaque photo d'aliment en morceaux, en suivant ses contours (les ombres entre les frites).

Le configurateur fait tomber ces morceaux un par un : le tas se construit au lieu d'arriver
d'un bloc, et une fois tout posé on retrouve exactement la photo.

    python3 tools/photos/morceaux.py            # toutes les photos concernées
    python3 tools/photos/morceaux.py frites     # une seule

Écrit public/photos/<nom>.morceaux.png (gris : 0 = vide, 1…N = numéro du morceau)
et ajoute "pieces": N au manifeste src/data/photos.json.
Python 3 + numpy, Pillow, scikit-image.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from skimage.segmentation import felzenszwalb

ROOT = Path(__file__).resolve().parents[2]
PHOTOS = ROOT / "public/photos"
MANIFEST = ROOT / "src/data/photos.json"

# Ce qui tombe en morceaux (les sauces se dessinent, le fromage râpé tombe puis fond, le pain reste entier).
EXCLUDE_PREFIX = ("gratin-fromage__apres", "nappage-", "pain-", "tortilla")
EXCLUDE = {"ketchup", "mayonnaise", "sauce-blanche", "barbecue", "biggy", "algerienne", "harissa", "samourai", "oeuf", "cheddar", "escalope"}


# Aliments faits d'éléments entiers (tranches, lanières, saucisses) : un morceau = un élément.
# Découpe plus fine (fromage râpé : de petites poignées de brins).
FINE = {"gratin-fromage__avant": (60, 260)}
WHOLE = {"tomate", "bacon", "merguez", "jambon-dinde", "pastrami", "tenders", "boursin"}


def concerned(name):
    return name not in EXCLUDE and not name.startswith(EXCLUDE_PREFIX)


def cut(name, info):
    img = np.asarray(Image.open(PHOTOS / f"{name}.webp").convert("RGBA")).astype(np.float32) / 255
    mask = img[..., 3] > 0.5
    rgb = img[..., :3].copy()
    rgb[~mask] = 0
    if name in WHOLE:
        from scipy import ndimage as ndi

        labels, _ = ndi.label(img[..., 3] > 0.92)  # sans les ombres, qui relient les éléments
    else:
        # Segmentation par graphe : les frontières passent par les ombres entre les morceaux.
        scale, div = FINE.get(name, (160, 160))
        labels = felzenszwalb(rgb, scale=scale, sigma=0.7, min_size=max(60, int(mask.sum() / div))) + 1
        labels[~mask] = 0
    # Les pixels semi-transparents du bord rejoignent le morceau voisin (pas de liseré oublié).
    edge = (img[..., 3] > 0.02) & (labels == 0)
    if edge.any():
        from scipy import ndimage as ndi

        _, (iy, ix) = ndi.distance_transform_edt(labels == 0, return_indices=True)
        labels[edge] = labels[iy[edge], ix[edge]]
    # Renuméroter 1…N (au plus 255)
    ids = [i for i in np.unique(labels) if i]
    remap = np.zeros(labels.max() + 1, np.uint8)
    for k, i in enumerate(ids[:255], 1):
        remap[i] = k
    out = remap[labels]
    Image.fromarray(out, "L").save(PHOTOS / f"{name}.morceaux.png", optimize=True)
    return len(ids[:255])


def main(names):
    man = json.loads(MANIFEST.read_text())
    for name, info in man["files"].items():
        if names and name not in names:
            continue
        if not concerned(name):
            info.pop("pieces", None)
            (PHOTOS / f"{name}.morceaux.png").unlink(missing_ok=True)
            continue
        n = cut(name, info)
        if n < 2:  # un seul élément : il tombe d'un bloc
            info.pop("pieces", None)
            (PHOTOS / f"{name}.morceaux.png").unlink(missing_ok=True)
            print(f"· {name} : d'un seul bloc")
            continue
        info["pieces"] = n
        print(f"✓ {name} : {info['pieces']} morceaux")
    MANIFEST.write_text(json.dumps(man, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
