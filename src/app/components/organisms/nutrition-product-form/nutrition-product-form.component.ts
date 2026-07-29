import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../atoms/button/button.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import { TextInputComponent } from '../../atoms/text-input/text-input.component';
import { ToastService } from '../../../core/services/toast.service';
import type { NutritionCategory, NutritionProduct } from '../../../core/models';
import { faImage, faTrash } from '@fortawesome/free-solid-svg-icons';

/** Dimension maximale (px) de la photo redimensionnée côté client. */
const MAX_IMAGE_SIZE = 400;
/** Qualité JPEG de la photo redimensionnée. */
const IMAGE_QUALITY = 0.8;

/**
 * Organism : formulaire d'ajout/modification d'un produit nutritionnel.
 *
 * Émet `save` avec la charge utile prête pour l'API et `cancel` à l'annulation.
 * Passez un `product` en entrée pour pré-remplir (mode édition).
 */
@Component({
  selector: 'ui-nutrition-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent, TextInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label [class]="labelClass" for="product-category">Catégorie</label>
          <select id="product-category" formControlName="categoryId" [class]="inputClass">
            <option value="" disabled>Choisir une catégorie…</option>
            @for (category of categories(); track category.id) {
              <option [value]="category.id">{{ category.name }}</option>
            }
          </select>
          @if (categories().length === 0) {
            <p class="mt-1 text-xs text-amber-600">
              Créez d'abord une catégorie pour pouvoir ajouter un produit.
            </p>
          }
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <ui-text-input formControlName="brand" label="Marque" placeholder="Ex : Maurten" />
          <ui-text-input
            formControlName="name"
            label="Nom du produit"
            placeholder="Ex : Gel 100"
          />
        </div>

        <div>
          <label [class]="labelClass">Photo (facultative)</label>
          <div class="flex items-center gap-4">
            <div
              class="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-300"
            >
              @if (imagePreview()) {
                <img [src]="imagePreview()!" alt="Aperçu du produit" class="h-full w-full object-cover" />
              } @else {
                <ui-icon [icon]="faImage" size="xl" />
              }
            </div>
            <div class="flex flex-col items-start gap-2">
              <input
                #fileInput
                type="file"
                accept="image/*"
                class="hidden"
                (change)="onFileSelected($event)"
              />
              <ui-button type="button" color="secondary" variant="outlined" size="sm" [icon]="faImage" (clicked)="fileInput.click()">
                {{ imagePreview() ? 'Changer la photo' : 'Ajouter une photo' }}
              </ui-button>
              @if (imagePreview()) {
                <ui-button type="button" color="default" variant="ghost" size="sm" [icon]="faTrash" (clicked)="removeImage(fileInput)">
                  Retirer la photo
                </ui-button>
              }
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-sm font-semibold text-slate-800">Composition (par unité)</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <ui-text-input
            formControlName="unitWeight"
            label="Poids unitaire (g)"
            type="number"
            min="0"
            step="0.1"
          />
          <ui-text-input
            formControlName="energy"
            label="Apport énergétique (kcal)"
            type="number"
            min="0"
            step="1"
          />
          <ui-text-input
            formControlName="carbs"
            label="Glucides (g)"
            type="number"
            min="0"
            step="0.1"
          />
          <ui-text-input
            formControlName="fats"
            label="Lipides (g)"
            type="number"
            min="0"
            step="0.1"
          />
          <ui-text-input
            formControlName="proteins"
            label="Protéines (g)"
            type="number"
            min="0"
            step="0.1"
          />
          <ui-text-input
            formControlName="salt"
            label="Sel (mg)"
            type="number"
            min="0"
            step="1"
          />
        </div>
      </section>

      <div class="flex items-center justify-end gap-3">
        <ui-button type="button" color="default" variant="ghost" (clicked)="cancel.emit()">Annuler</ui-button>
        <ui-button type="submit" [disabled]="form.invalid">
          {{ product() ? 'Enregistrer' : 'Ajouter le produit' }}
        </ui-button>
      </div>
    </form>
  `,
})
export class NutritionProductFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  /** Produit à éditer (mode modification). Absent = création. */
  readonly product = input<NutritionProduct | null>(null);
  /** Catégories disponibles pour le sélecteur. */
  readonly categories = input<NutritionCategory[]>([]);

  readonly save = output<Partial<NutritionProduct>>();
  readonly cancel = output<void>();

  protected readonly faImage = faImage;
  protected readonly faTrash = faTrash;

  /** Aperçu de la photo (data URL) ; `null` si aucune. */
  protected readonly imagePreview = signal<string | null>(null);

  protected readonly labelClass = 'mb-1 block text-xs font-medium text-slate-600';
  protected readonly inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';

  readonly form = this.fb.group({
    categoryId: ['', Validators.required],
    brand: ['', Validators.required],
    name: ['', Validators.required],
    unitWeight: [null as number | null, [Validators.required, Validators.min(0)]],
    energy: [null as number | null, [Validators.required, Validators.min(0)]],
    carbs: [null as number | null, [Validators.required, Validators.min(0)]],
    fats: [null as number | null, [Validators.required, Validators.min(0)]],
    proteins: [null as number | null, [Validators.required, Validators.min(0)]],
    salt: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    // Pré-remplit le formulaire quand un produit à éditer est fourni.
    effect(() => {
      const product = this.product();
      if (product) {
        this.form.reset({
          categoryId: product.categoryId,
          brand: product.brand,
          name: product.name,
          unitWeight: product.unitWeight,
          energy: product.energy,
          carbs: product.carbs,
          fats: product.fats,
          proteins: product.proteins,
          salt: product.salt,
        });
        this.imagePreview.set(product.image ?? null);
      }
    });
  }

  /** Lit le fichier sélectionné, le redimensionne et met à jour l'aperçu. */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.error('Veuillez choisir un fichier image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => this.resizeImage(String(reader.result));
    reader.onerror = () => this.toast.error("Impossible de lire l'image.");
    reader.readAsDataURL(file);
  }

  /** Redimensionne l'image (max {@link MAX_IMAGE_SIZE}px) via un canvas. */
  private resizeImage(dataUrl: string): void {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this.imagePreview.set(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      this.imagePreview.set(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
    };
    img.onerror = () => this.toast.error("Format d'image non pris en charge.");
    img.src = dataUrl;
  }

  /** Retire la photo et réinitialise le champ fichier. */
  removeImage(fileInput: HTMLInputElement): void {
    this.imagePreview.set(null);
    fileInput.value = '';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.save.emit({
      categoryId: value.categoryId!,
      brand: value.brand!.trim(),
      name: value.name!.trim(),
      unitWeight: Number(value.unitWeight),
      energy: Number(value.energy),
      carbs: Number(value.carbs),
      fats: Number(value.fats),
      proteins: Number(value.proteins),
      salt: Number(value.salt),
      // `null` pour permettre de retirer une photo existante lors d'une modification.
      image: this.imagePreview() ?? null,
    } as Partial<NutritionProduct>);
  }
}
