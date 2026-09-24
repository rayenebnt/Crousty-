"""Viandes du gratiné, posées en long dans le pain, à partir des morceaux des photos reçues."""
from commun import save
from compose import grade, gradient_map, scatter
from morceaux import boeuf, tandoori

B = boeuf()
BOEUF = [gradient_map(B[i], ["#1E0C05", "#4A2211", "#7A4026", "#A8694A", "#C99478"]) for i in (3, 4, 5, 6, 7, 8, 9, 11)]
T = tandoori()
TAND = [T[i] for i in (0, 1, 2, 3, 4)]

save("steak-hache", scatter(BOEUF, 19.5, 6, count=46, scale=(1.1, 1.5), seed=1))
save("kebab", scatter([gradient_map(p, ["#2A1206", "#6E3616", "#A85E2C", "#D69A5C"]) for p in BOEUF], 19.5, 6, count=44, scale=(1.0, 1.4), sx=1.3, seed=2))
save("tandoori", scatter(TAND, 19.5, 6, count=14, scale=(0.95, 1.25), seed=3))
save("poulet", scatter([gradient_map(p, ["#4A2408", "#9A5E24", "#D6A15C", "#F2D29A"]) for p in TAND], 19.5, 6, count=14, scale=(0.95, 1.25), seed=4))
save("curry", scatter([gradient_map(p, ["#4E300C", "#9A6620", "#CC9838", "#E8C77C"]) for p in TAND], 19.5, 6, count=14, scale=(0.95, 1.25), seed=5))
