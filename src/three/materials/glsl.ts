/** Fonctions GLSL partagées : bruit, fbm, cellules (bulles). */
export const NOISE_GLSL = /* glsl */ `
float cr_hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float cr_noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(cr_hash(i), cr_hash(i + vec2(1.0, 0.0)), u.x), mix(cr_hash(i + vec2(0.0, 1.0)), cr_hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float cr_fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * cr_noise(p); p *= 2.03; a *= 0.5; }
  return s / 0.9375;
}
// Distance à la cellule la plus proche (0 au centre d'une bulle)
float cr_cells(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d = 1.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(cr_hash(i + g), cr_hash(i + g + 17.0));
    d = min(d, length(g + o - f));
  }
  return d;
}
`;

/** Relief calculé dans le fragment (dérivées écran : fragment shader uniquement). */
export const BUMP_GLSL = /* glsl */ `
// Perturbe la normale à partir d'une hauteur calculée dans le fragment (relief sans texture).
vec3 cr_bump(vec3 n, vec3 viewPos, float h, float strength) {
  vec3 dpdx = dFdx(viewPos), dpdy = dFdy(viewPos);
  float hx = dFdx(h) * strength, hy = dFdy(h) * strength;
  vec3 r1 = cross(dpdy, n), r2 = cross(n, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (hx * r1 + hy * r2);
  return normalize(abs(det) * n - grad);
}
`;
