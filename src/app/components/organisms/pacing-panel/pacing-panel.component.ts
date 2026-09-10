import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../../atoms/button/button.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { AidStation, GpxTrack, PacingPlan, RaceStrategy, RouteWaypoint } from '../../../core/models';
import {
  buildPacingSegments,
  createAutomaticPacingPlan,
  PACING_TERRAIN_LABELS,
  type PacingSegment,
} from '../../../core/utils/pacing.util';
import { formatPassageTime } from '../../../core/utils/passage-time.util';
import { faBolt, faLock, faLockOpen, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'ui-pacing-panel',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (track(); as route) {
      <div class="space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div class="grid gap-3 sm:grid-cols-3">
            <div><p class="text-xs font-medium uppercase tracking-wide text-slate-400">Chrono cible</p><p class="font-semibold tabular-nums text-slate-900">{{ durationLabel(targetTime()) }}</p></div>
            <div><p class="text-xs font-medium uppercase tracking-wide text-slate-400">En course</p><p class="font-semibold tabular-nums text-slate-900">{{ durationLabel(runningMinutes()) }}</p></div>
            <div><p class="text-xs font-medium uppercase tracking-wide text-slate-400">Arrêts</p><p class="font-semibold tabular-nums text-slate-900">{{ durationLabel(stopMinutes()) }}</p></div>
          </div>
          <div class="flex flex-wrap gap-2">
            @for (option of strategies; track option.value) {
              <ui-button size="sm" color="default" variant="outlined" [icon]="faWandMagicSparkles" (clicked)="applyAutomatic(option.value)">{{ option.label }}</ui-button>
            }
          </div>
        </div>

        @if (warning()) { <p class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{{ warning() }}</p> }

        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table class="min-w-250 w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
              <th class="px-3 py-3 font-medium">Segment</th><th class="px-3 py-3 text-right font-medium">Dist. / D+ / D-</th><th class="px-3 py-3 font-medium">Terrain</th><th class="px-3 py-3 text-right font-medium">Temps</th><th class="px-3 py-3 text-right font-medium">Allure</th><th class="px-3 py-3 text-right font-medium">Vitesse</th><th class="px-3 py-3 text-right font-medium">Arrivée</th><th class="px-3 py-3"></th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100">
              @for (segment of segments(); track segment.id) {
                <tr class="align-middle">
                  <td class="px-3 py-3"><span class="font-semibold text-slate-800">{{ segment.fromLabel }}</span><span class="mx-1 text-slate-300">→</span><span class="font-semibold text-slate-800">{{ segment.toLabel }}</span></td>
                  <td class="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-600">{{ segment.distance.toFixed(1) }} km · +{{ round(segment.elevationGain) }} / -{{ round(segment.elevationLoss) }}</td>
                  <td class="px-3 py-3"><select class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs" [value]="segment.terrain" (change)="setTerrain(segment.id, $any($event.target).value)">@for (terrain of terrains; track terrain) { <option [value]="terrain">{{ terrainLabel(terrain) }}</option> }</select></td>
                  <td class="px-3 py-3 text-right"><input class="w-16 rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums" type="number" min="0" [value]="segment.durationMinutes" (change)="setDuration(segment.id, $any($event.target).valueAsNumber)" /> <span class="text-xs text-slate-400">min</span></td>
                  <td class="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-700">{{ paceLabel(segment) }}</td>
                  <td class="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-700">{{ speedLabel(segment) }}</td>
                  <td class="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-slate-800">{{ arrivalLabel(segment) }}</td>
                  <td class="px-3 py-3"><button type="button" class="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100" [attr.aria-label]="segment.locked ? 'Déverrouiller le segment' : 'Verrouiller le segment'" (click)="toggleLock(segment.id)"><ui-icon [icon]="segment.locked ? faLock : faLockOpen" size="sm" /></button></td>
                </tr>
                @if (segment.stopMinutes > 0) { <tr class="bg-amber-50/60 text-xs text-amber-800"><td class="px-3 py-2 font-medium" colspan="6">Arrêt à {{ segment.toLabel }}</td><td class="px-3 py-2 text-right tabular-nums">{{ segment.stopMinutes }} min · départ {{ formatTime(segment.arrivalMinutes + segment.stopMinutes) }}</td><td></td></tr> }
              }
            </tbody>
          </table>
        </div>
      </div>
    } @else { <div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Importez une trace GPX pour planifier les allures.</div> }
  `,
})
export class PacingPanelComponent {
  readonly event = input.required<RaceStrategy>();
  readonly track = input<GpxTrack | null>(null);
  readonly save = output<Pick<RaceStrategy, 'pacingPlan' | 'targetTimeMinutes'>>();
  protected readonly faWandMagicSparkles = faWandMagicSparkles;
  protected readonly faLock = faLock;
  protected readonly faLockOpen = faLockOpen;
  protected readonly terrains = Object.keys(PACING_TERRAIN_LABELS) as PacingSegment['terrain'][];
  protected readonly strategies = [{ value: 'CAUTIOUS', label: 'Prudent' }, { value: 'BALANCED', label: 'Équilibré' }, { value: 'AGGRESSIVE', label: 'Offensif' }, { value: 'NEGATIVE_SPLIT', label: 'Negative split' }] as const;
  protected readonly draft = signal<PacingPlan | undefined>(undefined);
  protected readonly warning = signal<string | null>(null);
  private readonly currentPlan = computed(() => this.draft() ?? this.event().pacingPlan);
  protected readonly targetTime = computed(() => this.event().targetTimeMinutes ?? 0);
  protected readonly segments = computed(() => {
    const track = this.track();
    return track ? buildPacingSegments(track, this.event().aidStations ?? [], this.event().waypoints ?? [], this.currentPlan(), this.targetTime()) : [];
  });
  protected readonly stopMinutes = computed(() => this.segments().reduce((sum, segment) => sum + segment.stopMinutes, 0));
  protected readonly runningMinutes = computed(() => this.segments().reduce((sum, segment) => sum + segment.durationMinutes, 0));
  protected applyAutomatic(strategy: NonNullable<PacingPlan['strategy']>): void {
    const track = this.track();
    if (!track || !this.targetTime()) return;
    const plan = createAutomaticPacingPlan(track, this.event().aidStations ?? [], this.event().waypoints ?? [], this.targetTime(), this.currentPlan(), strategy);
    if (!plan) { this.warning.set('Les segments verrouillés et les arrêts dépassent le chrono cible.'); return; }
    this.warning.set(null); this.draft.set(plan); this.save.emit({ pacingPlan: plan, targetTimeMinutes: this.targetTime() });
  }
  protected setDuration(id: string, value: number): void {
    if (!Number.isFinite(value) || value < 0) return;
    const plan = { ...(this.currentPlan() ?? { segmentDurations: {} }), segmentDurations: { ...(this.currentPlan()?.segmentDurations ?? {}), [id]: value }, strategy: 'CUSTOM' as const };
    const targetTimeMinutes = this.stopMinutes() + this.segments().reduce((sum, segment) => sum + (segment.id === id ? value : segment.durationMinutes), 0);
    this.draft.set(plan); this.save.emit({ pacingPlan: plan, targetTimeMinutes });
  }
  protected setTerrain(id: string, terrain: PacingSegment['terrain']): void { const plan = { ...(this.currentPlan() ?? { segmentDurations: {} }), terrains: { ...(this.currentPlan()?.terrains ?? {}), [id]: terrain } }; this.draft.set(plan); this.save.emit({ pacingPlan: plan, targetTimeMinutes: this.targetTime() }); }
  protected toggleLock(id: string): void { const locks = new Set(this.currentPlan()?.lockedSegmentIds ?? []); locks.has(id) ? locks.delete(id) : locks.add(id); const plan = { ...(this.currentPlan() ?? { segmentDurations: {} }), lockedSegmentIds: [...locks] }; this.draft.set(plan); this.save.emit({ pacingPlan: plan, targetTimeMinutes: this.targetTime() }); }
  protected terrainLabel(terrain: PacingSegment['terrain']): string { return PACING_TERRAIN_LABELS[terrain]; }
  protected paceLabel(segment: PacingSegment): string { if (!segment.distance || !segment.durationMinutes) return '—'; const minutes = Math.floor(segment.durationMinutes / segment.distance); const seconds = Math.round(((segment.durationMinutes / segment.distance) % 1) * 60); return `${minutes}:${seconds.toString().padStart(2, '0')}/km`; }
  protected speedLabel(segment: PacingSegment): string { return segment.durationMinutes ? `${(segment.distance / segment.durationMinutes * 60).toFixed(1)} km/h` : '—'; }
  protected arrivalLabel(segment: PacingSegment): string { return this.formatTime(segment.arrivalMinutes); }
  protected formatTime(minutes: number): string { return formatPassageTime(this.event().startTime, minutes); }
  protected durationLabel(minutes: number): string { return `${Math.floor(minutes / 60)}h${Math.round(minutes % 60).toString().padStart(2, '0')}`; }
  protected round(value: number): number { return Math.round(value); }
}
