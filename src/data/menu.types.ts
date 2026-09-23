/**
 * Contrat de données du site Le Crousty.
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
 * - Le site est une vitrine : aucun prix, aucune commande.
 * - Une option n'est proposée que si le support courant peut accueillir ce
 *   qu'elle ajoute (ex. pas de gratiné sur la tortilla) : aucune règle à écrire.
 */

export type Id = string;
export type ToComplete = "[À COMPLÉTER]";

/** D'où vient l'information. `restaurant` = confirmé par le restaurant. */
export type Source = "brief" | "photo" | "restaurant";

// ---------------------------------------------------------------------------
// Vocabulaire fixe côté code (ajouter une valeur ici = nouveau code 3D)
// ---------------------------------------------------------------------------

/** Places dans l'empilement. Chaque support déclare lesquelles il accepte et dans quel ordre. */
export type LayerId =
  | "sauce-base" // sauce ou crème étalée sur la base (sauce emmental, crème fraîche…)
  | "fries" //      frites (barquette, tacos, pot d'accompagnement)
  | "veg" //        crudités du bas (salade, tomate, avocat)
  | "meat" //       viandes principales
  | "cheese" //     fromages en tranche ou à tartiner
  | "extra" //      bacon, œuf, charcuterie, champignons…
  | "veg-top" //    crudités du haut (oignons, cornichons, jalapeños…)
  | "coating" //    nappage qui coule (cheddar sur les frites)
  | "sauce" //      filet de sauce
  | "gratin" //     fromage gratiné posé SUR le support refermé
  | "drink"; //     boisson

export const LAYERS: readonly LayerId[] = [
  "sauce-base", "fries", "veg", "meat", "cheese", "extra", "veg-top", "coating", "sauce", "gratin", "drink",
];

/** Formes génériques des supports (ce qui porte les ingrédients). */
export type SupportArchetype =
  | "bread" //       pain long (sandwichs, gratinés) : s'ouvre en charnière
  | "tortilla" //    variant "wrap" (roulée) ou "tacos" (pliée, grillée)
  | "bun" //         pain burger (base + chapeau)
  | "hotdog-bun" //  pain hot-dog
  | "toast" //       pain de mie (croques)
  | "fry-box" //     barquette (frites, starters)
  | "pot" //         pot d'accompagnement (brasserie)
  | "bowl" //        bol (salades)
  | "plate" //       assiette (brasserie)
  | "drink-spot"; // emplacement de boisson (invisible)

export const SUPPORT_ARCHETYPES: readonly SupportArchetype[] = [
  "bread", "tortilla", "bun", "hotdog-bun", "toast", "fry-box", "pot", "bowl", "plate", "drink-spot",
];

/** Formes génériques des ingrédients, paramétrées par couleur / nombre / taille. */
export type IngredientArchetype =
  | "patty" //        steak haché (variant "smash" : bords croustillants)
  | "cutlet" //       escalope, suprême, cordon bleu (plaque irrégulière, grillée ou panée)
  | "strips" //       tenders, nuggets (morceaux panés)
  | "chunks" //       tandoori, curry, kebab, émincés (morceaux irréguliers)
  | "crumble" //      viande hachée, bacon émietté, bolognaise
  | "sausage" //      merguez, saucisse
  | "sliced" //       tranches souples : pastrami, jambon, bacon, poulet fumé
  | "skewer" //       brochettes
  | "wings" //        ailes de poulet
  | "rings" //        onion rings panés
  | "cheese-slice" // tranche de fromage qui s'affaisse
  | "spread" //       boursin, crème, fromage frais, confiture, sauce fromagère
  | "ball" //         burrata, tomates cerises
  | "melt" //         gratin (variant "gratin") ou nappage qui coule (variant "pour")
  | "leaf" //         salade
  | "slices" //       rondelles : tomate, oignon rouge, cornichon, jalapeño, avocat, chorizo…
  | "bits" //         petits éléments : oignons, olives, poivrons, maïs, feta…
  | "pasta" //        mac & cheese
  | "egg" //          œuf au plat
  | "drizzle" //      filet de sauce, miel
  | "fries" //        frites (instanciées ; variant "wedges" pour les paysannes)
  | "can" //          canette
  | "bottle"; //      bouteille

export const INGREDIENT_ARCHETYPES: readonly IngredientArchetype[] = [
  "patty", "cutlet", "strips", "chunks", "crumble", "sausage", "sliced", "skewer", "wings", "rings",
  "cheese-slice", "spread", "ball", "melt", "leaf", "slices", "bits", "pasta", "egg", "drizzle",
  "fries", "can", "bottle",
];

export type EnterAnim = "drop-bounce" | "flutter" | "slide-in" | "pour" | "melt" | "rain" | "pop" | "none";
export type ExitAnim = "lift-fade" | "dissolve" | "slide-out" | "none";

export type Picto = "burger" | "sandwich" | "tacos" | "hotdog" | "fries" | "bottle" | "icecream" | "plate" | "salad";
export type Badge = "epice" | "best-seller" | "nouveau";

/** Emplacements autour du produit principal. */
export type PlaceId = "side" | "side2" | "drink";
/** Assemblage modifié par une option. */
export type Target = "main" | PlaceId;

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
  /** Passe à true quand le restaurant a relu toute la carte. */
  validatedByRestaurant: boolean;
  todoMarker: ToComplete;
}

/** Produits mis en scène (accueil, ouverture du configurateur). */
export interface Showcase {
  hero: { product: Id; selections: Selections };
}

/** Réglage visuel commun aux supports et ingrédients. */
export interface Visual<A extends string = string> {
  archetype: A;
  /** Sous-style de l'archétype (ex. "smash", "wrap", "gratin", "pour", "wedges"). */
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
  source?: Source;
  toVerify?: string;
}

/** Ingrédient seul, ou avec une quantité (ex. double cheddar). */
export type IngredientRef = Id | { id: Id; qty: number };

export interface OptionGroup {
  /** Titre court et gourmand ("Ta viande", "Tes sauces"). */
  label: string;
  kind: "single" | "multi" | "toggle";
  /** Minimum de choix (défaut : 1 pour "single", 0 sinon). */
  min?: number;
  /** Maximum de choix ; null = pas de limite connue. */
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
  /** Mention courte affichée sous le choix (ex. "Supplément"). */
  note?: string;
  /** Ingrédients ajoutés à l'assemblage visé. */
  adds?: IngredientRef[];
  /** Ingrédients de base retirés (ex. frites maison remplacées par les paysannes). */
  removes?: Id[];
  /** Change le support de l'assemblage visé (ex. pain → tortilla). */
  support?: Id;
  /** Duplique les ingrédients d'une couche (double, triple, « doublez votre viande »). */
  duplicate?: { layer: LayerId; times: number };
  /** Choix coché à l'ouverture. */
  default?: boolean;
  toVerify?: string;
}

export interface Place {
  support: Id;
  defaults: IngredientRef[];
}

export interface Formula {
  /** Ex. "Frites maison incluses · boisson en option". */
  label: string;
  places: Partial<Record<PlaceId, Place>>;
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
  description: string;
  /** Garniture de base (la fiche produit liste ces ingrédients). */
  defaults: IngredientRef[];
  /** Surcharges de la catégorie. */
  support?: Id;
  optionGroups?: Id[];
  formula?: Id | null;
  badges: Badge[];
  source?: Source;
  toVerify?: string;
}

/** Sélections du client : id de groupe → ids des choix cochés (répétés si allowRepeat). */
export type Selections = Record<Id, Id[]>;
