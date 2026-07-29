import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { IconComponent } from '../../atoms/icon/icon.component';
import {
  PASSWORD_RULES,
  evaluatePassword,
  type PasswordStrength,
} from '../../../core/utils/password-policy';

/**
 * Molecule : indicateur réactif de robustesse d'un mot de passe.
 *
 * Affiche une jauge de niveau et la liste des règles avec leur état (respectée
 * ou non), mis à jour en direct au fil de la saisie.
 */
@Component({
  selector: 'ui-password-strength',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (value()) {
      <div class="mt-2">
        <!-- Jauge -->
        <div class="flex items-center gap-2">
          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full transition-all duration-300"
              [class]="barClasses()"
              [style.width.%]="fillPercent()"
            ></div>
          </div>
          <span class="text-xs font-medium" [class]="labelColor()">{{ strengthLabel() }}</span>
        </div>

        <!-- Checklist des règles -->
        <ul class="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          @for (rule of rulesState(); track rule.id) {
            <li
              class="flex items-center gap-1.5 text-xs"
              [class]="rule.ok ? 'text-emerald-600' : 'text-slate-400'"
            >
              <ui-icon [icon]="rule.ok ? faCheck : faXmark" size="xs" [fixedWidth]="true" />
              <span>{{ rule.label }}</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
})
export class PasswordStrengthComponent {
  /** Valeur courante du mot de passe. */
  readonly value = input<string>('');

  protected readonly faCheck = faCheck;
  protected readonly faXmark = faXmark;

  /** État de chaque règle pour l'affichage de la checklist. */
  protected readonly rulesState = computed(() => {
    const v = this.value();
    return PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, ok: rule.test(v) }));
  });

  private readonly evaluation = computed(() => evaluatePassword(this.value()));

  /** Pourcentage de remplissage de la jauge. */
  protected readonly fillPercent = computed(() => {
    const { satisfied, total } = this.evaluation();
    return Math.round((satisfied / total) * 100);
  });

  protected readonly strengthLabel = computed(
    () => STRENGTH_LABELS[this.evaluation().strength],
  );

  protected readonly barClasses = computed(() => BAR_CLASSES[this.evaluation().strength]);

  protected readonly labelColor = computed(() => LABEL_COLORS[this.evaluation().strength]);
}

const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  empty: '',
  weak: 'Faible',
  medium: 'Moyen',
  strong: 'Robuste',
};

const BAR_CLASSES: Record<PasswordStrength, string> = {
  empty: 'bg-slate-200',
  weak: 'bg-rose-500',
  medium: 'bg-amber-500',
  strong: 'bg-emerald-500',
};

const LABEL_COLORS: Record<PasswordStrength, string> = {
  empty: 'text-slate-400',
  weak: 'text-rose-600',
  medium: 'text-amber-600',
  strong: 'text-emerald-600',
};
