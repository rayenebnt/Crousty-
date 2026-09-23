/** Courbes d'animation (t de 0 à 1). */

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t: number, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

/** Chute avec petit rebond à l'arrivée (0 → 1). */
export function bounceOut(t: number) {
  if (t < 0.62) {
    const k = t / 0.62;
    return k * k;
  }
  const k = (t - 0.62) / 0.38;
  return 1 - Math.sin(k * Math.PI) * 0.09 * (1 - k);
}

/** Approche amortie d'une valeur vers une cible (indépendant du nombre d'images par seconde). */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

/** Pseudo-aléatoire stable par index (décalages de pluie). */
export const hash01 = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
