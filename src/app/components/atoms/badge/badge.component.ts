import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger';

/**
 * Atom : badge/étiquette d'information.
 */
@Component({
  selector: 'ui-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="classes()"><ng-content /></span>`,
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');

  private readonly tones: Record<BadgeTone, string> = {
    neutral: 'bg-slate-100 text-slate-700',
    brand: 'bg-brand-100 text-brand-800',
    accent: 'bg-accent-100 text-accent-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-800',
  };

  readonly classes = computed(
    () =>
      `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${this.tones[this.tone()]}`,
  );
}
