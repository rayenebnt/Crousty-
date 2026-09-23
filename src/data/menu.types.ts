/**
 * Contrat de données du site Le Crousty — ÉTAPE 1 (proposition, à valider).
 *
 * menu.json est la SEULE source de vérité : catégories, produits, options,
 * ingrédients visibles en 3D. Le code 3D ne connaît qu'un vocabulaire fixe
 * d'« archétypes » (formes génériques) et de « couches » (places dans
 * l'empilement). Tout le reste vient de menu.json : ajouter un produit, une
 * option ou un ingrédient ne demande aucune modification du code 3D.
 *
 * Règles :
 * - Les identifiants (Id) sont en kebab-case et STABLES : un ingrédient `tenders`
 *   peut être remplacé par `/models/ingredients/tenders.glb` sans rien changer.
 * - Toute information manquante vaut exactement "[À COMPLÉTER]".
 * - Toute information lue sur la photo et non confirmée porte `toVerify`.
 * - Aucun prix n'est stocké tant que `meta.showPrices` est false.
 */

export type Id = string;
export type ToComplete = "[À COMPLÉTER]";

/** D'où vient l'information (rien n'est encore validé par le restaurant). */
export type Source = "brief" | "photo" | "brief+photo";

// ---------------------------------------------------------------------------
// Vocabulaire fixe côté code (ajouter une valeur ici = nouveau code 3D)
// ---------------------------------------------------------------------------

/** Places dans l'empilement. Chaque support déclare lesquelles il accepte et dans quel ordre. */
export type LayerId =
  | "sauce-base" // sauce ou crème étalée sur la base (sauce emmental, fromage frais…)
  | "fries" //      frites (dans la barquette, dans le tacos)
  | "veg" //        crudités du bas (salade, tomate, avocat)
  | "meat" //       viandes principales
  | "cheese" //     fromages en tranche ou à tartiner
  | "extra" //      bacon, œuf, charcuterie, champignons…
  | "veg-top" //    crudités du haut (oignons, cornichons, jalapeños…)
  | "coating" //    nappage qui coule (cheddar sur les frites)
  | "sauce" //      filet de sauce
  | "gratin" //     fromage gratiné posé SUR le support refermé
  | "drink"; //     boisson (emplacement boisson de la formule)

/** Formes génériques des supports (ce qui porte les ingrédients). */
export type SupportArchetype =
  | "bread" //       pain de sandwich (s'ouvre en charnière)
  | "tortilla" //    galette de tacos (ouverte pendant la composition, se replie ensuite)
  | "bun" //         pain burger (base + chapeau)
  | "hotdog-bun" //  pain hot-dog
  | "fry-box" //     barquette de frites
  | "drink-spot"; // emplacement de boisson (invisible)

/** Formes génériques des ingrédients, paramétrées par couleur / nombre / taille. */
export type IngredientArchetype =
  | "patty" //        steak haché, smash (variant "smash" : bords croustillants)
  | "cutlet" //       escalope, suprême, poulet (plaque irrégulière, grillée ou panée)
  | "strips" //       tenders (bâtonnets panés)
  | "chunks" //       tandoori, curry, émincé (morceaux irréguliers)
  | "crumble" //      viande hachée, bacon émietté, bolognaise
  | "sausage" //      merguez, saucisse
  | "sliced" //       tranches souples : pastrami, jambon, bacon, poulet fumé
  | "cheese-slice" // tranche de fromage qui s'affaisse
  | "spread" //       boursin, crème, fromage frais, confiture, sauce fromagère
  | "melt" //         gratin (variant "gratin") ou nappage qui coule (variant "pour")
  | "leaf" //         salade
  | "slices" //       rondelles : tomate, oignon rouge, cornichon, jalapeño, avocat, chorizo…
  | "bits" //         petits éléments : oignons, olives, poivrons, oignons frits…
  | "egg" //          œuf au plat
  | "drizzle" //      filet de sauce, miel
  | "fries" //        frites (instanciées ; variant "wedges" pour potatoes/paysannes)
  | "can" //          canette
  | "bottle"; //      bouteille

export type EnterAnim = "drop-bounce" | "flutter" | "slide-in" | "pour" | "melt" | "rain" | "pop" | "none";
export type ExitAnim = "lift-fade" | "dissolve" | "slide-out" | "none";

export type Picto = "burger" | "sandwich" | "tacos" | "hotdog" | "fries" | "bottle" | "icecream";
export type Badge = "epice" | "best-seller" | "nouveau";

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------

export interface Menu {
  version: 1;
  meta: MenuMeta;
  showcase: Showcase;
  supports: Record<Id, Support>;
  ingredients: Record<Id, Ingredient>;
  optionGroups: Record<Id, OptionGroup>;
  formulas: Record<Id, Formula>;
  categories: Category[];
  products: Product[];
}

export interface MenuMeta {
  restaurant: string;
  city: string;
  currency: "EUR";
  /** false : aucun prix affiché nulle part (ni fiche, ni configurateur, ni récap). */
  showPrices: boolean;
  /** Passe à true quand le restaurant a relu toute la carte. */
  validatedByRestaurant: boolean;
  todoMarker: ToComplete;
}

/** Produits mis en scène (accueil). */
export interface Showcase {
  hero: { product: Id; selections: Selections };
}

/** Réglage visuel commun aux supports et ingrédients. */
export interface Visual<A extends string = string> {
  archetype: A;
  /** Sous-style de l'archétype (ex. "smash", "sesame", "gratin", "pour", "wedges"). */
  variant?: string;
  /** Couleur dominante (hex). */
  color?: string;
  /** Couleur secondaire : grillé, panure, peau, marquage… */
  color2?: string;
  /** Nombre de morceaux (tenders, rondelles, frites…). */
  count?: number;
  /** Échelle relative, 1 = taille par défaut de l'archétype. */
  size?: number;
  /** Texte imprimé (boissons : nom en clair, jamais de logo). */
  label?: string;
  /** Modèle designer. S'il existe, il remplace le procédural (même id, même place). */
  glb?: string;
  /** Visuel du mode 2D ; sinon dessiné automatiquement depuis archétype + couleurs. */
  sprite2d?: string;
  /** Surcharge des animations par défaut de l'archétype. */
  anim?: { enter?: EnterAnim; exit?: ExitAnim };
}

export interface Support {
  label: string;
  visual: Visual<SupportArchetype>;
  /** Le support s'ouvre pour recevoir la garniture puis se referme. */
  opens?: boolean;
  /** Couches acceptées à l'intérieur, du bas vers le haut. */
  layers: LayerId[];
  /** Couches posées sur le support refermé (ex. "gratin"). */
  onTop?: LayerId[];
  source?: Source;
  toVerify?: string;
}

export interface Ingredient {
  /** Nom affiché au client (fiche produit, récap, lecteur d'écran). */
  label: string;
  layer: LayerId;
  visual: Visual<IngredientArchetype>;
  allergens?: string[] | ToComplete;
  source?: Source;
  toVerify?: string;
}

/** Ingrédient seul, ou avec une quantité (ex. double cheddar). */
export type IngredientRef = Id | { id: Id; qty: number };

/** Assemblage visé par une option : le produit, les frites de la formule, ou la boisson. */
export type Target = "main" | "side" | "drink";

export interface OptionGroup {
  /** Titre court et gourmand ("Ta viande", "Tes sauces"). */
  label: string;
  kind: "single" | "multi" | "toggle";
  /** Minimum de choix (défaut : 1 pour "single", 0 sinon). */
  min?: number;
  /** Maximum de choix ; null = limite inconnue [À COMPLÉTER]. */
  max?: number | null;
  /** Le même choix peut être pris plusieurs fois (ex. 2 × tenders dans un tacos). */
  allowRepeat?: boolean;
  /** Défaut : "main". */
  target?: Target;
  /** Réutilise les choix d'un autre groupe (évite les doublons). */
  choicesFrom?: Id;
  choices?: Choice[];
  source?: Source;
  toVerify?: string;
}

export interface Choice {
  id: Id;
  label: string;
  /** Ingrédients ajoutés à l'assemblage visé. */
  adds?: IngredientRef[];
  /** Ingrédients de base retirés (ex. « sans oignons »). */
  removes?: Id[];
  /** Duplique les ingrédients d'une couche (« Doublez votre viande », double / triple). */
  duplicate?: { layer: LayerId; times: number };
  /** Choix coché à l'ouverture. */
  default?: boolean;
  /** Réservé : ignoré tant que meta.showPrices est false. */
  priceDelta?: number;
  toVerify?: string;
}

export interface Formula {
  /** Ex. "Frites + boisson incluses". */
  label: string;
  side?: { support: Id; defaults: IngredientRef[] };
  drink?: { support: Id };
  optionGroups: Id[];
  /** Affiche l'ensemble sur le plateau papier journal. */
  tray: boolean;
  source?: Source;
  toVerify?: string;
}

export interface Category {
  id: Id;
  label: string;
  picto: Picto;
  /** Support par défaut des produits de la catégorie. */
  support: Id;
  /** Options par défaut des produits de la catégorie. */
  optionGroups: Id[];
  /** Formule par défaut ; null = vendu seul. */
  formula: Id | null;
  source?: Source;
  toVerify?: string;
}

export interface Product {
  id: Id;
  category: Id;
  name: string;
  /** Phrase gourmande validée par le restaurant, sinon "[À COMPLÉTER]". */
  description: string | ToComplete;
  /** Garniture de base (la fiche produit liste ces ingrédients). */
  defaults: IngredientRef[];
  /** Surcharges de la catégorie. */
  support?: Id;
  optionGroups?: Id[];
  formula?: Id | null;
  badges: Badge[];
  /** Réservé : jamais publié tant que meta.showPrices est false. */
  price?: number;
  source?: Source;
  toVerify?: string;
}

/** Sélections du client : id de groupe → ids des choix cochés (répétés si allowRepeat). */
export type Selections = Record<Id, Id[]>;
