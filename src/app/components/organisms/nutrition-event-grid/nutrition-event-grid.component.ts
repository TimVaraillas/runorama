import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NutritionEventCardComponent } from '../../molecules/nutrition-event-card/nutrition-event-card.component';
import type { RaceStrategy } from '../../../core/models';

/**
 * Organism : affichage d'une liste de stratégies alimentaires sous forme de
 * grille de cartes.
 */
@Component({
  selector: 'ui-nutrition-event-grid',
  standalone: true,
  imports: [NutritionEventCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      @for (event of events(); track event.id) {
        <ui-nutrition-event-card
          [event]="event"
          (select)="select.emit($event)"
          (edit)="edit.emit($event)"
          (delete)="delete.emit($event)"
        />
      }
    </div>
  `,
})
export class NutritionEventGridComponent {
  /** Évènements à afficher. */
  readonly events = input<RaceStrategy[]>([]);

  readonly select = output<RaceStrategy>();
  readonly edit = output<RaceStrategy>();
  readonly delete = output<RaceStrategy>();
}
