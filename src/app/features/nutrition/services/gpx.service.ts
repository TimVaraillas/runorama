import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { GpxTrack, GpxUploadResult } from '../../../core/models';

/**
 * Service d'accès à la **trace GPX** (parcours réel) d'une stratégie via l'API
 * REST : import, lecture du profil, suppression et export enrichi des points
 * d'intérêt. Isolé du service nutrition pour séparer les responsabilités
 * (parcours réel vs plan de nutrition).
 */
@Injectable({ providedIn: 'root' })
export class GpxService {
  private readonly http = inject(HttpClient);
  private readonly eventsUrl = '/api/race-strategies';

  /**
   * Importe (ou remplace) la trace GPX d'une stratégie. Le contenu brut est
   * envoyé en texte ; le serveur parse, calcule le D+/D- lissé et stocke la
   * trace. Renvoie la trace prête à l'affichage et les écarts détectés vs
   * l'événement (distance/D+/D-) — sans jamais modifier les données saisies.
   */
  upload(eventId: string, gpx: string, fileName?: string): Observable<GpxUploadResult> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/gpx+xml' });
    let params = new HttpParams();
    if (fileName) params = params.set('fileName', fileName);
    return this.http.post<GpxUploadResult>(`${this.eventsUrl}/${eventId}/gpx`, gpx, {
      headers,
      params,
    });
  }

  /** Charge la trace GPX (points simplifiés pour le profil) d'une stratégie. */
  get(eventId: string): Observable<GpxTrack> {
    return this.http.get<GpxTrack>(`${this.eventsUrl}/${eventId}/gpx`);
  }

  /** Supprime la trace GPX d'une stratégie. */
  remove(eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.eventsUrl}/${eventId}/gpx`);
  }

  /**
   * Exporte la trace GPX enrichie des points d'intérêt (ravitaillements + points
   * de passage). Renvoie la réponse complète (blob + en-têtes) pour récupérer le
   * nom de fichier depuis `Content-Disposition`.
   */
  export(eventId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.eventsUrl}/${eventId}/gpx/export`, {
      responseType: 'blob',
      observe: 'response',
    });
  }
}
