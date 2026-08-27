import {
  AfterViewInit,
  Directive,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  booleanAttribute,
  inject,
  input,
  output,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Directive : émet `loadMore` lorsque l'élément hôte (sentinelle) entre dans le
 * viewport. Sert à déclencher le chargement de la page suivante (scroll infini).
 *
 * ```html
 * <div uiInfiniteScroll [disabled]="!hasMore()" (loadMore)="loadMore()"></div>
 * ```
 */
@Directive({
  selector: '[uiInfiniteScroll]',
  standalone: true,
})
export class InfiniteScrollDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);

  /** Marge de déclenchement anticipé (en pixels) sous le viewport. */
  readonly rootMargin = input(200);
  /** Désactive l'observation (ex. pas d'autres pages, chargement en cours). */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Conteneur de défilement à observer (`null` = viewport). */
  readonly root = input<HTMLElement | null>(null);

  readonly loadMore = output<void>();

  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !this.disabled()) {
          this.loadMore.emit();
        }
      },
      { root: this.root(), rootMargin: `0px 0px ${this.rootMargin()}px 0px` },
    );
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
