import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { SidePanelComponent } from '../../molecules/side-panel/side-panel.component';
import { RaceStrategyFormComponent } from '../race-strategy-form/race-strategy-form.component';
import type { RaceStrategy } from '../../../core/models';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

/**
 * Organism : panneau latéral de création/modification d'un évènement.
 *
 * Encapsule le `ui-side-panel`, l'en-tête et le `ui-nutrition-event-form` afin
 * de partager la même expérience d'édition entre la liste des stratégies et la
 * page d'inventaire. Le titre s'adapte selon la présence d'un `event` (édition)
 * ou son absence (création).
 *
 * Émet `save` avec la charge utile du formulaire et `close` à la fermeture.
 */
@Component({
  selector: 'ui-race-strategy-form-panel',
  standalone: true,
  imports: [IconComponent, SidePanelComponent, RaceStrategyFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-side-panel [open]="open()" [ariaLabel]="heading()" (close)="close.emit()">
      @if (open()) {
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <h2 class="font-display text-lg font-bold text-slate-900">{{ heading() }}</h2>
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              (click)="close.emit()"
              aria-label="Fermer"
            >
              <ui-icon [icon]="faXmark" size="lg" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-6">
            <ui-race-strategy-form
              [event]="event()"
              (save)="save.emit($event)"
              (cancel)="close.emit()"
            />
          </div>
        </div>
      }
    </ui-side-panel>
  `,
})
export class RaceStrategyFormPanelComponent {
  /** Ouvre ou ferme le panneau. */
  readonly open = input(false);
  /** Évènement à modifier ; `null` pour une création. */
  readonly event = input<RaceStrategy | null>(null);

  /** Émis avec la charge utile du formulaire lors de l'enregistrement. */
  readonly save = output<Partial<RaceStrategy>>();
  /** Émis lors d'une demande de fermeture. */
  readonly close = output<void>();

  protected readonly faXmark = faXmark;

  protected heading(): string {
    return this.event() ? 'Modifier la course' : 'Nouvelle course';
  }
}
