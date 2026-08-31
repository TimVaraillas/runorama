import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RaceStrategyCardComponent } from '../../molecules/race-strategy-card/race-strategy-card.component';
import type { RaceStrategy } from '../../../core/models';

/**
 * Organism : affichage d'une liste de stratégies alimentaires sous forme de
 * grille de cartes.
 */
@Component({
  selector: 'ui-race-strategy-grid',
  standalone: true,
  imports: [RaceStrategyCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      @for (event of events(); track event.id) {
        <ui-race-strategy-card
          [event]="event"
          (select)="select.emit($event)"
          (edit)="edit.emit($event)"
          (delete)="delete.emit($event)"
        />
      }
    </div>
  `,
})
export class RaceStrategyGridComponent {
  /** Évènements à afficher. */
  readonly events = input<RaceStrategy[]>([]);

  readonly select = output<RaceStrategy>();
  readonly edit = output<RaceStrategy>();
  readonly delete = output<RaceStrategy>();
}
