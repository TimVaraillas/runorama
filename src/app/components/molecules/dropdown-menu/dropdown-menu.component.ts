import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';

/**
 * Molecule : menu déroulant générique.
 *
 * Projette un déclencheur via l'attribut `trigger` et le contenu du menu par
 * défaut. L'ouverture se fait au clic sur le déclencheur ; le menu se ferme au
 * clic à l'extérieur, sur la touche Échap ou après sélection d'un élément.
 *
 * ```html
 * <ui-dropdown-menu>
 *   <button trigger>Ouvrir</button>
 *   <ui-dropdown-menu-item (selected)="...">Action</ui-dropdown-menu-item>
 * </ui-dropdown-menu>
 * ```
 */
@Component({
  selector: 'ui-dropdown-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <div class="cursor-pointer" (click)="toggle()">
        <ng-content select="[trigger]" />
      </div>

      @if (open()) {
        <div
          role="menu"
          class="absolute right-0 z-50 mt-2 min-w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          (click)="close()"
        >
          <ng-content />
        </div>
      }
    </div>
  `,
})
export class DropdownMenuComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  /** État d'ouverture du menu. */
  readonly open = signal(false);

  toggle(): void {
    this.open.update((value) => !value);
  }

  close(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }
}
