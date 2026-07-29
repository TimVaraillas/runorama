import type { NutritionIntake, NutritionProduct } from './nutrition.model';

/** Bord d'une prise saisi lors du redimensionnement. */
export type ResizeEdge = 'top' | 'bottom';

/** Donnée transportée par un élément glissé (produit de palette ou prise). */
export type DragPayload =
  | { kind: 'product'; productId: string }
  | { kind: 'intake'; intakeId: string };

/** Produit de la palette avec son décompte emporté / restant à placer. */
export interface PaletteEntry {
  product: NutritionProduct;
  carried: number;
  remaining: number;
  /** Vrai pour un élément toujours disponible en quantité illimitée (eau). */
  unlimited?: boolean;
}

/** Prise résolue (produit inclus) et positionnée sur la timeline. */
export interface PositionedIntake extends NutritionIntake {
  product: NutritionProduct;
  top: number;
  height: number;
  lane: number;
  endMinute: number;
  /** Vrai si la prise partage son créneau avec l'élément en cours de drag. */
  overlapped: boolean;
}

/** Emplacement fantôme prévisualisé pendant un drag depuis la palette. */
export interface GhostBlock {
  lane: number;
  top: number;
  height: number;
}

/** Repère horaire (glucides / énergie planifiés vs cible). */
export interface PlanHourlyRecap {
  hour: number;
  energy: number;
  targetEnergy: number;
  carbs: number;
  targetCarbs: number;
}

/** Repère de séquence positionné sur la piste (libellé horaire). */
export interface SequenceMark {
  minute: number;
  top: number;
  label: string;
  major: boolean;
}

/** Évènement émis quand une poignée de redimensionnement est saisie. */
export interface ResizeStartEvent {
  event: PointerEvent;
  edge: ResizeEdge;
}

/** Évènement émis quand une prise placée démarre un redimensionnement. */
export interface IntakeResizeStartEvent extends ResizeStartEvent {
  intake: PositionedIntake;
}

/**
 * Fonction contraignant, en direct, la position d'un bloc glissé sur la
 * grille de séquences (signature de `cdkDragConstrainPosition`).
 */
export type PlanConstrainPosition = (
  point: { x: number; y: number },
  drag: unknown,
  dimensions: DOMRect,
  pickup: { x: number; y: number },
) => { x: number; y: number };
