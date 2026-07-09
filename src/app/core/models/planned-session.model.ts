import type { Session } from './session.model';

/**
 * Une séance planifiée sur le calendrier.
 * Référence une séance et lui donne une date (et un statut de réalisation).
 */
export type PlannedSessionStatus = 'planned' | 'completed' | 'skipped';

export interface PlannedSession {
  id: string;
  /** Identifiant de la séance associée. */
  sessionId: string;
  /** Séance dénormalisée (optionnelle, pour l'affichage). */
  session?: Session;
  /** Date planifiée au format ISO (YYYY-MM-DD). */
  date: string;
  status: PlannedSessionStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
