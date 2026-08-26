import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  faArrowLeft,
  faFlagCheckered,
  faPlus,
  faTrash,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';
import { NutritionService } from '../../../features/nutrition/services/nutrition.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonComponent } from '../../../components/atoms/button/button.component';
import { IconComponent } from '../../../components/atoms/icon/icon.component';
import { TextInputComponent } from '../../../components/atoms/text-input/text-input.component';
import { QuantityStepperComponent } from '../../../components/atoms/quantity-stepper/quantity-stepper.component';
import { RatingInputComponent } from '../../../components/atoms/rating-input/rating-input.component';
import {
  SegmentedChoiceComponent,
  type SegmentedOption,
} from '../../../components/atoms/segmented-choice/segmented-choice.component';
import { PageHeaderComponent } from '../../../components/molecules/page-header/page-header.component';
import { RaceMetricsSummaryComponent } from '../../../components/organisms/race-metrics-summary/race-metrics-summary.component';
import type {
  DigestiveProblem,
  NutritionEvent,
  NutritionEventResult,
  NutritionProduct,
  RaceStatus,
} from '../../../core/models';
import {
  computeRaceComparison,
  plannedQuantitiesByProduct,
  type RaceComparison,
} from '../../../core/utils/race-result.util';

/** Ligne du tableau de consommation (produit + groupe de formulaire associé). */
interface ConsumptionRow {
  product: NutritionProduct;
  group: FormGroup;
}

/** Ligne d'évaluation produit (produit + groupe de formulaire associé). */
interface FeedbackRow {
  product: NutritionProduct;
  group: FormGroup;
}

/**
 * Page Nutrition : finalisation d'une course (`strategies/:id/finalize`).
 *
 * Recueille le bilan de course : déroulé, ressentis, problèmes digestifs,
 * consommation réelle vs prévue, consommations hors plan et évaluation des
 * produits embarqués. Affiche en direct la comparaison prévu/réel.
 */
@Component({
  selector: 'app-nutrition-race-finalize-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    IconComponent,
    TextInputComponent,
    QuantityStepperComponent,
    RatingInputComponent,
    SegmentedChoiceComponent,
    PageHeaderComponent,
    RaceMetricsSummaryComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <ui-page-header
        [title]="event()?.name ?? 'Finaliser la course'"
        subtitle="Comment s'est déroulée la course ? Renseignez votre bilan."
      >
        <ui-button
          actions
          color="primary"
          variant="full"
          size="sm"
          [icon]="faFlagCheckered"
          [disabled]="!event() || saving()"
          (clicked)="save()"
        >
          {{ saving() ? 'Enregistrement…' : 'Enregistrer le bilan' }}
        </ui-button>
        <ui-button
          actions
          color="default"
          variant="ghost"
          size="sm"
          [icon]="faArrowLeft"
          (clicked)="goBack()"
          tooltipContent="Retour à la stratégie"
        />
      </ui-page-header>

      @if (event(); as ev) {
        <form [formGroup]="form" class="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div class="space-y-6">
            <!-- 1. Déroulé de la course -->
            <fieldset class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <legend class="px-1 text-base font-semibold text-slate-800">Déroulé de la course</legend>
              <div>
                <span class="mb-1.5 block text-sm font-medium text-slate-700">Résultat</span>
                <ui-segmented-choice
                  formControlName="status"
                  [options]="statusOptions"
                  ariaLabel="Résultat de la course"
                />
              </div>
              <div>
                <span class="mb-1.5 block text-sm font-medium text-slate-700">Ressenti général</span>
                <ui-rating-input formControlName="overallRating" showValue />
              </div>
              <ui-text-input
                formControlName="actualDurationMinutes"
                type="number"
                label="Durée réelle (minutes)"
                placeholder="Ex : 540"
              />
            </fieldset>

            <!-- 2. Nutrition -->
            <fieldset
              class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              formGroupName="nutrition"
            >
              <legend class="px-1 text-base font-semibold text-slate-800">Nutrition</legend>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <span class="mb-1.5 block text-sm font-medium text-slate-700">Ressenti global</span>
                  <ui-rating-input formControlName="overallRating" showValue />
                </div>
                <div>
                  <span class="mb-1.5 block text-sm font-medium text-slate-700">Énergie</span>
                  <ui-rating-input formControlName="energyRating" showValue />
                </div>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <span class="mb-1.5 block text-sm font-medium text-slate-700">Faim</span>
                  <ui-segmented-choice
                    formControlName="hunger"
                    [options]="frequencyOptions"
                    ariaLabel="Fréquence de la faim"
                  />
                </div>
                <div>
                  <span class="mb-1.5 block text-sm font-medium text-slate-700">Soif</span>
                  <ui-segmented-choice
                    formControlName="thirst"
                    [options]="frequencyOptions"
                    ariaLabel="Fréquence de la soif"
                  />
                </div>
              </div>
            </fieldset>

            <!-- 3. Problèmes digestifs -->
            <fieldset
              class="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              formGroupName="digestive"
            >
              <legend class="px-1 text-base font-semibold text-slate-800">Problèmes digestifs</legend>
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" formControlName="none" class="h-4 w-4 rounded border-slate-300" (change)="onNoneChange()" />
                Aucun problème
              </label>
              <div class="grid gap-2 sm:grid-cols-2" formGroupName="problems">
                @for (problem of digestiveProblems; track problem.key) {
                  <label class="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      [formControlName]="problem.key"
                      class="h-4 w-4 rounded border-slate-300"
                      (change)="onProblemChange()"
                    />
                    {{ problem.label }}
                  </label>
                }
              </div>
              <ui-text-input
                formControlName="otherDetail"
                label="Autres problèmes : précisez"
                placeholder="Ex : points de côté persistants"
              />
            </fieldset>

            <!-- 4. Consommation réelle -->
            <fieldset class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <legend class="px-1 text-base font-semibold text-slate-800">Consommation réelle</legend>
              @if (consumptionRows().length === 0) {
                <p class="text-sm text-slate-400">Aucun produit dans l'inventaire de cette stratégie.</p>
              } @else {
                <div class="space-y-2">
                  @for (row of consumptionRows(); track row.product.id) {
                    <div
                      class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
                      [formGroup]="row.group"
                    >
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-slate-800">{{ row.product.name }}</p>
                        <p class="truncate text-xs text-slate-400">{{ row.product.brand }}</p>
                      </div>
                      <div class="flex items-center gap-4">
                        <div class="text-right">
                          <span class="block text-[11px] uppercase tracking-wide text-slate-400">Prévu</span>
                          <span class="text-sm font-semibold tabular-nums text-slate-500">
                            {{ row.group.get('plannedQuantity')?.value }}
                          </span>
                        </div>
                        <div>
                          <span class="mb-0.5 block text-[11px] uppercase tracking-wide text-slate-400">Réel</span>
                          <ui-quantity-stepper
                            [min]="0"
                            [value]="row.group.get('actualQuantity')?.value ?? 0"
                            (valueChange)="row.group.get('actualQuantity')?.setValue($event)"
                          />
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
              <div class="grid gap-4 sm:grid-cols-2">
                <ui-text-input
                  formControlName="plannedWaterMl"
                  type="number"
                  label="Eau prévue (ml)"
                  placeholder="Ex : 3000"
                />
                <ui-text-input
                  formControlName="actualWaterMl"
                  type="number"
                  label="Eau réelle (ml)"
                  placeholder="Ex : 2500"
                />
              </div>
            </fieldset>

            <!-- 5. Consommations hors plan -->
            <fieldset class="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <legend class="px-1 text-base font-semibold text-slate-800">Hors plan</legend>
              <p class="text-sm text-slate-500">
                Ajoutez ce que vous avez consommé en plus du plan (ravitaillements, imprévus). Les
                macros sont facultatives, mais améliorent les calculs.
              </p>
              @for (group of offPlanControls; track group; let i = $index) {
                <div class="space-y-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3" [formGroup]="group">
                  <div class="flex items-center gap-2">
                    <div class="flex-1">
                      <ui-text-input formControlName="label" placeholder="Ex : Sandwich jambon" />
                    </div>
                    <ui-button
                      color="danger"
                      variant="ghost"
                      size="sm"
                      [icon]="faTrash"
                      (clicked)="removeOffPlan(i)"
                      tooltipContent="Retirer"
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <ui-text-input formControlName="energy" type="number" label="kcal" />
                    <ui-text-input formControlName="carbs" type="number" label="Glucides (g)" />
                    <ui-text-input formControlName="sodium" type="number" label="Sodium (mg)" />
                    <ui-text-input formControlName="fats" type="number" label="Lipides (g)" />
                    <ui-text-input formControlName="proteins" type="number" label="Protéines (g)" />
                    <ui-text-input formControlName="waterMl" type="number" label="Eau (ml)" />
                  </div>
                </div>
              }
              <ui-button color="secondary" variant="outlined" size="sm" [icon]="faPlus" (clicked)="addOffPlan()">
                Ajouter une consommation
              </ui-button>
            </fieldset>

            <!-- 6. Évaluation des produits -->
            @if (feedbackRows().length > 0) {
              <fieldset class="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <legend class="px-1 text-base font-semibold text-slate-800">Évaluation des produits</legend>
                @for (row of feedbackRows(); track row.product.id) {
                  <div class="space-y-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3" [formGroup]="row.group">
                    <p class="text-sm font-medium text-slate-800">
                      {{ row.product.name }}
                      <span class="font-normal text-slate-400">· {{ row.product.brand }}</span>
                    </p>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <div>
                        <span class="mb-1 block text-xs font-medium text-slate-500">Goût</span>
                        <ui-rating-input formControlName="taste" size="sm" />
                      </div>
                      <div>
                        <span class="mb-1 block text-xs font-medium text-slate-500">Tolérance digestive</span>
                        <ui-rating-input formControlName="tolerance" size="sm" />
                      </div>
                    </div>
                    <ui-text-input formControlName="comment" placeholder="Commentaire (facultatif)" />
                  </div>
                }
              </fieldset>
            }
          </div>

          <!-- Colonne latérale : métriques en direct -->
          <aside class="lg:sticky lg:top-6 lg:self-start">
            <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Prévu vs réel
            </h2>
            @if (comparison(); as c) {
              <ui-race-metrics-summary [comparison]="c" />
            } @else {
              <p class="text-sm text-slate-400">
                Renseignez la durée réelle pour visualiser les apports horaires.
              </p>
            }
          </aside>
        </form>
      } @else if (notFound()) {
        <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div class="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
            <ui-icon [icon]="faUtensils" size="xl" />
          </div>
          <p class="text-slate-600">Cette stratégie est introuvable.</p>
          <ui-button color="secondary" variant="outlined" [icon]="faArrowLeft" (clicked)="goBack()">
            Retour aux stratégies
          </ui-button>
        </div>
      } @else {
        <p class="text-slate-400">Chargement de la stratégie…</p>
      }
    </section>
  `,
})
export class NutritionRaceFinalizePage implements OnInit {
  private readonly service = inject(NutritionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  /** Identifiant de l'évènement, lié au paramètre de route `:id`. */
  readonly id = input.required<string>();

  protected readonly faArrowLeft = faArrowLeft;
  protected readonly faFlagCheckered = faFlagCheckered;
  protected readonly faUtensils = faUtensils;
  protected readonly faPlus = faPlus;
  protected readonly faTrash = faTrash;

  protected readonly statusOptions: SegmentedOption<RaceStatus>[] = [
    { value: 'finished', label: 'Terminée' },
    { value: 'dnf_abandon', label: 'Abandon' },
    { value: 'dnf_medical', label: 'DNF médical' },
    { value: 'dnf_nutrition', label: 'DNF nutrition' },
    { value: 'dnf_other', label: 'Autre' },
  ];
  protected readonly frequencyOptions: SegmentedOption[] = [
    { value: 'never', label: 'Jamais' },
    { value: 'sometimes', label: 'Parfois' },
    { value: 'often', label: 'Souvent' },
  ];
  protected readonly digestiveProblems: { key: DigestiveProblem; label: string }[] = [
    { key: 'nausea', label: 'Nausées' },
    { key: 'vomiting', label: 'Vomissements' },
    { key: 'bloating', label: 'Ballonnements' },
    { key: 'diarrhea', label: 'Diarrhée' },
    { key: 'reflux', label: 'Reflux gastrique' },
    { key: 'cramps', label: 'Crampes abdominales' },
    { key: 'other', label: 'Autres problèmes' },
  ];

  protected readonly event = signal<NutritionEvent | null>(null);
  protected readonly notFound = signal(false);
  protected readonly saving = signal(false);
  protected readonly consumptionRows = signal<ConsumptionRow[]>([]);
  protected readonly feedbackRows = signal<FeedbackRow[]>([]);

  /** Valeur courante du formulaire (rafraîchie à chaque modification). */
  private readonly formValue = signal<Record<string, unknown> | null>(null);

  /** Comparaison prévu/réel dérivée en direct du formulaire. */
  protected readonly comparison = computed<RaceComparison | null>(() => {
    const ev = this.event();
    const raw = this.formValue();
    if (!ev || !raw) return null;
    const duration = Number(raw['actualDurationMinutes']);
    if (!Number.isFinite(duration) || duration <= 0) return null;
    return computeRaceComparison(ev, this.buildResult(raw));
  });

  protected readonly form = this.fb.group({
    status: this.fb.control<RaceStatus>('finished', { validators: [Validators.required] }),
    overallRating: this.fb.control<number>(0),
    actualDurationMinutes: this.fb.control<number | null>(null),
    nutrition: this.fb.group({
      overallRating: this.fb.control<number>(0),
      energyRating: this.fb.control<number>(0),
      hunger: this.fb.control<string | null>(null),
      thirst: this.fb.control<string | null>(null),
    }),
    digestive: this.fb.group({
      none: this.fb.control<boolean>(false),
      problems: this.fb.group(
        this.digestiveProblems.reduce(
          (acc, p) => ({ ...acc, [p.key]: this.fb.control<boolean>(false) }),
          {} as Record<DigestiveProblem, ReturnType<FormBuilder['control']>>,
        ),
      ),
      otherDetail: this.fb.control<string>(''),
    }),
    plannedWaterMl: this.fb.control<number | null>(null),
    actualWaterMl: this.fb.control<number | null>(null),
    offPlan: this.fb.array<FormGroup>([]),
  });

  protected get offPlanArray(): FormArray<FormGroup> {
    return this.form.get('offPlan') as FormArray<FormGroup>;
  }

  protected get offPlanControls(): FormGroup[] {
    return this.offPlanArray.controls;
  }

  ngOnInit(): void {
    this.service.getEvent(this.id()).subscribe({
      next: (event) => {
        this.event.set(event);
        this.hydrate(event);
      },
      error: () => this.notFound.set(true),
    });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.formValue.set(this.currentRaw());
    });
  }

  /** Construit les tableaux et pré-remplit le formulaire depuis l'évènement. */
  private hydrate(event: NutritionEvent): void {
    const result = event.result;
    const items = event.items ?? [];
    const plannedByProduct = plannedQuantitiesByProduct(event);

    const consumptionRows: ConsumptionRow[] = [];
    const feedbackRows: FeedbackRow[] = [];
    for (const item of items) {
      const product = item.product;
      if (!product) continue;
      const planned = plannedByProduct.get(item.productId) ?? item.quantity ?? 0;
      const existingC = result?.consumption?.find((c) => c.productId === item.productId);
      consumptionRows.push({
        product,
        group: this.fb.group({
          productId: this.fb.control(item.productId),
          plannedQuantity: this.fb.control(existingC?.plannedQuantity ?? planned),
          actualQuantity: this.fb.control(existingC?.actualQuantity ?? planned),
        }),
      });

      const existingF = result?.productFeedback?.find((p) => p.productId === item.productId);
      feedbackRows.push({
        product,
        group: this.fb.group({
          productId: this.fb.control(item.productId),
          taste: this.fb.control(existingF?.taste ?? product.taste ?? 0),
          tolerance: this.fb.control(existingF?.tolerance ?? product.tolerance ?? 0),
          comment: this.fb.control(existingF?.comment ?? ''),
        }),
      });
    }
    this.consumptionRows.set(consumptionRows);
    this.feedbackRows.set(feedbackRows);

    if (result) {
      this.form.patchValue({
        status: result.status,
        overallRating: result.overallRating ?? 0,
        actualDurationMinutes: result.actualDurationMinutes ?? event.targetTimeMinutes ?? null,
        nutrition: {
          overallRating: result.nutrition?.overallRating ?? 0,
          energyRating: result.nutrition?.energyRating ?? 0,
          hunger: result.nutrition?.hunger ?? null,
          thirst: result.nutrition?.thirst ?? null,
        },
        digestive: {
          none: result.digestive?.none ?? false,
          otherDetail: result.digestive?.otherDetail ?? '',
        },
        plannedWaterMl: result.plannedWaterMl ?? null,
        actualWaterMl: result.actualWaterMl ?? null,
      });
      const problemsGroup = this.form.get('digestive.problems') as FormGroup;
      for (const problem of result.digestive?.problems ?? []) {
        problemsGroup.get(problem)?.setValue(true);
      }
      for (const off of result.offPlan ?? []) {
        this.offPlanArray.push(this.createOffPlanGroup(off));
      }
    } else {
      this.form.get('actualDurationMinutes')?.setValue(event.targetTimeMinutes ?? null);
    }

    this.formValue.set(this.currentRaw());
  }

  private currentRaw(): Record<string, unknown> {
    return {
      ...this.form.getRawValue(),
      consumption: this.consumptionRows().map((r) => r.group.getRawValue()),
      productFeedback: this.feedbackRows().map((r) => r.group.getRawValue()),
    };
  }

  protected addOffPlan(): void {
    this.offPlanArray.push(this.createOffPlanGroup());
    this.formValue.set(this.currentRaw());
  }

  protected removeOffPlan(index: number): void {
    this.offPlanArray.removeAt(index);
    this.formValue.set(this.currentRaw());
  }

  private createOffPlanGroup(off?: {
    label?: string;
    quantity?: number;
    energy?: number;
    carbs?: number;
    fats?: number;
    proteins?: number;
    sodium?: number;
    waterMl?: number;
  }): FormGroup {
    return this.fb.group({
      label: this.fb.control(off?.label ?? ''),
      energy: this.fb.control<number | null>(off?.energy ?? null),
      carbs: this.fb.control<number | null>(off?.carbs ?? null),
      fats: this.fb.control<number | null>(off?.fats ?? null),
      proteins: this.fb.control<number | null>(off?.proteins ?? null),
      sodium: this.fb.control<number | null>(off?.sodium ?? null),
      waterMl: this.fb.control<number | null>(off?.waterMl ?? null),
    });
  }

  /** Décoche tous les problèmes lorsque « Aucun problème » est activé. */
  protected onNoneChange(): void {
    if (this.form.get('digestive.none')?.value) {
      const problemsGroup = this.form.get('digestive.problems') as FormGroup;
      for (const problem of this.digestiveProblems) {
        problemsGroup.get(problem.key)?.setValue(false);
      }
    }
  }

  /** Décoche « Aucun problème » dès qu'un problème est signalé. */
  protected onProblemChange(): void {
    const problemsGroup = this.form.get('digestive.problems') as FormGroup;
    const anyChecked = this.digestiveProblems.some((p) => problemsGroup.get(p.key)?.value);
    if (anyChecked) {
      this.form.get('digestive.none')?.setValue(false, { emitEvent: false });
    }
  }

  /** Transforme la valeur brute du formulaire en bilan de course. */
  private buildResult(raw: Record<string, unknown>): NutritionEventResult {
    const nutrition = (raw['nutrition'] ?? {}) as Record<string, unknown>;
    const digestive = (raw['digestive'] ?? {}) as Record<string, unknown>;
    const problemsMap = (digestive['problems'] ?? {}) as Record<string, boolean>;
    const none = Boolean(digestive['none']);
    const problems = none
      ? []
      : this.digestiveProblems.filter((p) => problemsMap[p.key]).map((p) => p.key);

    const toNumber = (value: unknown): number | undefined => {
      const n = Number(value);
      return Number.isFinite(n) && value !== null && value !== '' ? n : undefined;
    };

    const consumption = ((raw['consumption'] as Record<string, unknown>[]) ?? []).map((c) => ({
      productId: String(c['productId']),
      plannedQuantity: Number(c['plannedQuantity']) || 0,
      actualQuantity: Number(c['actualQuantity']) || 0,
    }));

    const offPlan = ((raw['offPlan'] as Record<string, unknown>[]) ?? [])
      .filter((o) => String(o['label'] ?? '').trim())
      .map((o) => ({
        label: String(o['label']).trim(),
        energy: toNumber(o['energy']),
        carbs: toNumber(o['carbs']),
        fats: toNumber(o['fats']),
        proteins: toNumber(o['proteins']),
        sodium: toNumber(o['sodium']),
        waterMl: toNumber(o['waterMl']),
      }));

    const productFeedback = ((raw['productFeedback'] as Record<string, unknown>[]) ?? [])
      .map((p) => ({
        productId: String(p['productId']),
        taste: Number(p['taste']) || undefined,
        tolerance: Number(p['tolerance']) || undefined,
        comment: String(p['comment'] ?? '').trim() || undefined,
      }))
      .filter((p) => p.taste != null || p.tolerance != null || p.comment != null);

    const freq = (value: unknown): 'never' | 'sometimes' | 'often' | undefined =>
      value === 'never' || value === 'sometimes' || value === 'often' ? value : undefined;

    return {
      status: raw['status'] as RaceStatus,
      overallRating: Number(raw['overallRating']) || undefined,
      actualDurationMinutes: toNumber(raw['actualDurationMinutes']),
      nutrition: {
        overallRating: Number(nutrition['overallRating']) || undefined,
        energyRating: Number(nutrition['energyRating']) || undefined,
        hunger: freq(nutrition['hunger']),
        thirst: freq(nutrition['thirst']),
      },
      digestive: {
        problems,
        none,
        otherDetail: String(digestive['otherDetail'] ?? '').trim(),
      },
      consumption,
      plannedWaterMl: toNumber(raw['plannedWaterMl']),
      actualWaterMl: toNumber(raw['actualWaterMl']),
      offPlan,
      productFeedback,
    } as NutritionEventResult;
  }

  protected save(): void {
    if (this.form.invalid || !this.event()) {
      this.form.markAllAsTouched();
      this.toast.error('Veuillez indiquer le résultat de la course.');
      return;
    }
    this.saving.set(true);
    const result = this.buildResult(this.currentRaw());
    this.service.saveEventResult(this.id(), result).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Bilan de course enregistré.');
        this.router.navigate(['/nutrition/strategies', this.id()]);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Impossible d\u2019enregistrer le bilan. Veuillez réessayer.');
      },
    });
  }

  protected goBack(): void {
    this.router.navigate(['/nutrition/strategies', this.id()]);
  }
}

export default NutritionRaceFinalizePage;
