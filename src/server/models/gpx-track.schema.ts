import mongoose, { type InferSchemaType } from 'mongoose';

const { Schema, model, models } = mongoose;

/**
 * Trace GPX importée pour une stratégie (collection `gpx_tracks`).
 *
 * La trace est **stockée à part** du document `nutrition_events` : celui-ci est
 * rechargé et réécrit en entier à chaque édition, alors qu'une trace peut
 * contenir des dizaines de milliers de points. On évite ainsi d'alourdir chaque
 * lecture/écriture de stratégie et le risque d'atteindre la limite BSON (16 Mo).
 *
 * Les points sont conservés en **colonnes parallèles** (`lat[]`, `lon[]`, …)
 * plutôt qu'en tableau d'objets : le BSON est bien plus compact. Deux
 * résolutions coexistent : `full` (pleine résolution, pour les calculs) et
 * `simplified` (réduite via RDP, pour un rendu fluide du profil).
 *
 * Distinction des données : cette trace représente le **parcours réel** (issu du
 * GPX). Elle ne doit pas être mêlée au **plan de course** (temps de passage,
 * arrêts, nutrition) ni à la future **réalité de course**.
 */

/** Jeu de colonnes parallèles décrivant une trace (toutes de même longueur). */
const trackColumnsSchema = new Schema(
  {
    /** Latitudes (degrés). */
    lat: { type: [Number], default: [] },
    /** Longitudes (degrés). */
    lon: { type: [Number], default: [] },
    /** Altitudes lissées (m). */
    ele: { type: [Number], default: [] },
    /** Distances cumulées depuis le départ (km). */
    dist: { type: [Number], default: [] },
    /** Dénivelé positif cumulé depuis le départ (m). */
    dPlus: { type: [Number], default: [] },
    /** Dénivelé négatif cumulé depuis le départ (m). */
    dMinus: { type: [Number], default: [] },
  },
  { _id: false },
);

/** Totaux calculés d'une trace. */
const totalsSchema = new Schema(
  {
    distance: { type: Number, required: true },
    elevationGain: { type: Number, required: true },
    elevationLoss: { type: Number, required: true },
    minAltitude: { type: Number, required: true },
    maxAltitude: { type: Number, required: true },
    pointCount: { type: Number, required: true },
  },
  { _id: false },
);

/** Rectangle englobant de la trace. */
const bboxSchema = new Schema(
  {
    minLat: { type: Number, required: true },
    minLon: { type: Number, required: true },
    maxLat: { type: Number, required: true },
    maxLon: { type: Number, required: true },
  },
  { _id: false },
);

const gpxTrackSchema = new Schema(
  {
    /** Stratégie (évènement) propriétaire de la trace. */
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'RaceStrategy',
      required: true,
      index: true,
    },
    /** Utilisateur propriétaire (portée d'accès). */
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Nom du fichier importé (à titre indicatif). */
    fileName: { type: String, trim: true },
    /** Contenu GPX brut conservé pour un retraitement ultérieur. */
    rawGpx: { type: String, required: true },
    /** Empreinte du contenu (détection de doublon / changement). */
    hash: { type: String, required: true },
    /** Totaux calculés (distance, D+/D-, altitudes, nombre de points). */
    totals: { type: totalsSchema, required: true },
    /** Bounding box de la trace. */
    bbox: { type: bboxSchema, required: true },
    /** Trace pleine résolution (calculs précis). */
    full: { type: trackColumnsSchema, required: true },
    /** Trace simplifiée (RDP) pour le rendu du profil. */
    simplified: { type: trackColumnsSchema, required: true },
  },
  {
    collection: 'gpx_tracks',
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret['id'] = ret['_id'];
        delete ret['_id'];
        return ret;
      },
    },
  },
);

export type GpxTrackDocument = InferSchemaType<typeof gpxTrackSchema>;

export const GpxTrackModel = models['GpxTrack'] ?? model('GpxTrack', gpxTrackSchema);
