import {
  DEFAULT_GPX_OPTIONS,
  GpxError,
  accumulateElevation,
  fillMissingElevations,
  haversineMeters,
  interpolateAtDistance,
  movingAverage,
  parseGpx,
  processGpx,
  simplifyForDisplay,
  simplifyProfileIndices,
  type ProcessedTrackPoint,
} from './gpx.util';

/** Construit un contenu GPX minimal à partir d'une liste de points. */
function gpxFrom(points: Array<{ lat: number; lon: number; ele?: number | null }>): string {
  const trkpts = points
    .map((p) => {
      const ele = p.ele === undefined || p.ele === null ? '' : `<ele>${p.ele}</ele>`;
      return `<trkpt lat="${p.lat}" lon="${p.lon}">${ele}<time>2024-01-01T00:00:00Z</time></trkpt>`;
    })
    .join('\n');
  return `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>${trkpts}</trkseg></trk></gpx>`;
}

describe('gpx.util', () => {
  describe('parseGpx', () => {
    it('lève EMPTY sur un contenu vide', () => {
      expect(() => parseGpx('   ')).toThrowError(GpxError);
      try {
        parseGpx('');
      } catch (e) {
        expect((e as GpxError).code).toBe('EMPTY');
      }
    });

    it('lève INVALID quand ce n\u2019est pas un GPX', () => {
      try {
        parseGpx('<html><body>nope</body></html>');
      } catch (e) {
        expect((e as GpxError).code).toBe('INVALID');
      }
    });

    it('lève NO_TRACKPOINTS quand aucun point de trace', () => {
      try {
        parseGpx('<gpx version="1.1"><trk><trkseg></trkseg></trk></gpx>');
      } catch (e) {
        expect((e as GpxError).code).toBe('NO_TRACKPOINTS');
      }
    });

    it('extrait lat/lon/ele et ignore le temps', () => {
      const points = parseGpx(
        gpxFrom([
          { lat: 45.0, lon: 6.0, ele: 1000 },
          { lat: 45.001, lon: 6.001, ele: 1010 },
        ]),
      );
      expect(points).toHaveLength(2);
      expect(points[0]).toEqual({ lat: 45.0, lon: 6.0, ele: 1000 });
      expect(points[1].ele).toBe(1010);
    });

    it('accepte les points sans altitude (ele null)', () => {
      const points = parseGpx(gpxFrom([{ lat: 45, lon: 6 }]));
      expect(points[0].ele).toBeNull();
    });

    it('ignore les coordonnées hors bornes', () => {
      const points = parseGpx(gpxFrom([{ lat: 200, lon: 6, ele: 10 }, { lat: 45, lon: 6, ele: 10 }]));
      expect(points).toHaveLength(1);
    });
  });

  describe('haversineMeters', () => {
    it('renvoie 0 pour deux points identiques', () => {
      expect(haversineMeters(45, 6, 45, 6)).toBeCloseTo(0, 5);
    });

    it('calcule ~111 km pour 1° de latitude', () => {
      const d = haversineMeters(45, 6, 46, 6);
      expect(d).toBeGreaterThan(110_000);
      expect(d).toBeLessThan(112_000);
    });
  });

  describe('fillMissingElevations', () => {
    it('lève NO_ALTITUDE si aucune altitude', () => {
      try {
        fillMissingElevations([{ lat: 0, lon: 0, ele: null }]);
      } catch (e) {
        expect((e as GpxError).code).toBe('NO_ALTITUDE');
      }
    });

    it('interpole les trous internes et reporte aux bords', () => {
      const eles = fillMissingElevations([
        { lat: 0, lon: 0, ele: null },
        { lat: 0, lon: 0, ele: 100 },
        { lat: 0, lon: 0, ele: null },
        { lat: 0, lon: 0, ele: 200 },
      ]);
      expect(eles[0]).toBe(100); // report arrière
      expect(eles[1]).toBe(100);
      expect(eles[2]).toBe(100); // report avant (dernière connue)
      expect(eles[3]).toBe(200);
    });
  });

  describe('movingAverage', () => {
    it('renvoie les valeurs inchangées pour une fenêtre <= 1', () => {
      expect(movingAverage([1, 2, 3], 1)).toEqual([1, 2, 3]);
    });

    it('lisse le bruit', () => {
      const smoothed = movingAverage([0, 10, 0, 10, 0], 3);
      // Le point central doit être proche de la moyenne locale, pas 0/10.
      expect(smoothed[2]).toBeCloseTo(6.6667, 2);
    });
  });

  describe('accumulateElevation', () => {
    it('ignore les micro-variations sous le seuil (bruit GPS)', () => {
      // Oscillations de +/-1 m autour de 100 avec un seuil de 3 m.
      const smoothed = [100, 101, 99, 100, 101, 99];
      const { gain, loss } = accumulateElevation(smoothed, 3);
      expect(gain[gain.length - 1]).toBe(0);
      expect(loss[loss.length - 1]).toBe(0);
    });

    it('comptabilise une vraie montée puis une vraie descente', () => {
      const smoothed = [100, 110, 120, 100];
      const { gain, loss } = accumulateElevation(smoothed, 3);
      expect(gain[gain.length - 1]).toBe(20);
      expect(loss[loss.length - 1]).toBe(20);
    });

    it('accumule de façon monotone croissante', () => {
      const { gain } = accumulateElevation([0, 5, 10, 15], 3);
      for (let i = 1; i < gain.length; i++) {
        expect(gain[i]).toBeGreaterThanOrEqual(gain[i - 1]);
      }
    });
  });

  describe('processGpx', () => {
    it('calcule distance, D+/D- et totaux', () => {
      const result = processGpx(
        gpxFrom([
          { lat: 45.0, lon: 6.0, ele: 1000 },
          { lat: 45.01, lon: 6.0, ele: 1050 },
          { lat: 45.02, lon: 6.0, ele: 1000 },
        ]),
        { smoothingWindow: 1, elevationThreshold: 3 },
      );
      expect(result.points).toHaveLength(3);
      expect(result.totals.distance).toBeGreaterThan(0);
      expect(result.totals.elevationGain).toBe(50);
      expect(result.totals.elevationLoss).toBe(50);
      expect(result.totals.minAltitude).toBe(1000);
      expect(result.totals.maxAltitude).toBe(1050);
      expect(result.totals.pointCount).toBe(3);
    });

    it('la distance cumulée est croissante', () => {
      const result = processGpx(
        gpxFrom([
          { lat: 45.0, lon: 6.0, ele: 1000 },
          { lat: 45.01, lon: 6.01, ele: 1010 },
          { lat: 45.02, lon: 6.02, ele: 1020 },
        ]),
      );
      const d = result.points.map((p) => p.distance);
      expect(d[0]).toBe(0);
      expect(d[1]).toBeGreaterThan(d[0]);
      expect(d[2]).toBeGreaterThan(d[1]);
    });

    it('lisse le bruit d\u2019altitude pour ne pas gonfler le D+', () => {
      // Trace globalement plate mais très bruitée.
      const pts = Array.from({ length: 40 }, (_, i) => ({
        lat: 45 + i * 0.001,
        lon: 6,
        ele: 1000 + (i % 2 === 0 ? 2 : -2),
      }));
      const result = processGpx(gpxFrom(pts), DEFAULT_GPX_OPTIONS);
      expect(result.totals.elevationGain).toBeLessThan(10);
    });
  });

  describe('simplifyProfileIndices / simplifyForDisplay', () => {
    const line: ProcessedTrackPoint[] = Array.from({ length: 100 }, (_, i) => ({
      lat: 45 + i * 0.001,
      lon: 6,
      ele: 1000 + i, // pente parfaitement linéaire
      distance: i * 0.1,
      elevationGain: i,
      elevationLoss: 0,
    }));

    it('réduit une droite à ses extrémités', () => {
      const indices = simplifyProfileIndices(line, 5);
      expect(indices[0]).toBe(0);
      expect(indices[indices.length - 1]).toBe(99);
      expect(indices.length).toBeLessThan(10);
    });

    it('renvoie tous les points sous le plafond (fidélité maximale)', () => {
      expect(simplifyForDisplay(line, 1, 4000)).toHaveLength(100);
    });

    it('préserve les sommets malgré la simplification', () => {
      // Trace globalement plate avec un pic marqué au milieu.
      const withPeak: ProcessedTrackPoint[] = Array.from({ length: 3000 }, (_, i) => ({
        lat: 45,
        lon: 6,
        ele: i === 1500 ? 1500 : 1000,
        distance: i * 0.05,
        elevationGain: 0,
        elevationLoss: 0,
      }));
      const simplified = simplifyForDisplay(withPeak, 1, 500);
      expect(simplified.length).toBeLessThanOrEqual(500);
      expect(Math.max(...simplified.map((p) => p.ele))).toBe(1500);
    });

    it('conserve toujours départ et arrivée et plafonne le nombre de points', () => {
      const zigzag: ProcessedTrackPoint[] = Array.from({ length: 5000 }, (_, i) => ({
        lat: 45,
        lon: 6,
        ele: 1000 + (i % 2) * 100,
        distance: i * 0.01,
        elevationGain: i,
        elevationLoss: 0,
      }));
      const simplified = simplifyForDisplay(zigzag, 1, 500);
      expect(simplified.length).toBeLessThanOrEqual(501);
      expect(simplified[0].distance).toBe(0);
      expect(simplified[simplified.length - 1].distance).toBe(zigzag[zigzag.length - 1].distance);
    });
  });

  describe('interpolateAtDistance', () => {
    const track: ProcessedTrackPoint[] = [
      { lat: 45, lon: 6, ele: 1000, distance: 0, elevationGain: 0, elevationLoss: 0 },
      { lat: 46, lon: 6, ele: 1200, distance: 10, elevationGain: 200, elevationLoss: 0 },
    ];

    it('interpole altitude et D+ à mi-distance', () => {
      const point = interpolateAtDistance(track, 5);
      expect(point?.ele).toBe(1100);
      expect(point?.elevationGain).toBe(100);
      expect(point?.lat).toBeCloseTo(45.5, 5);
    });

    it('borne aux extrémités', () => {
      expect(interpolateAtDistance(track, -1)?.distance).toBe(0);
      expect(interpolateAtDistance(track, 999)?.distance).toBe(10);
    });

    it('renvoie null pour une trace vide', () => {
      expect(interpolateAtDistance([], 5)).toBeNull();
    });
  });
});
