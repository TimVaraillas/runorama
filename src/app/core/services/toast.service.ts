import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Type de toast (détermine la couleur et l'icône). */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/** Notification affichée temporairement à l'écran. */
export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
}

/** Options facultatives d'un toast. */
export interface ToastOptions {
  /** Titre optionnel affiché en gras au-dessus du message. */
  title?: string;
  /** Durée d'affichage en ms (0 = permanent jusqu'à fermeture manuelle). */
  duration?: number;
}

/**
 * Service global de notifications (toasts).
 *
 * Expose des raccourcis `success`/`error`/`info`/`warning` et un signal
 * `toasts` consommé par le composant d'affichage `ui-toaster`.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private uid = 0;

  /** Durée d'affichage par défaut (ms). */
  private readonly defaultDuration = 5000;

  private readonly _toasts = signal<Toast[]>([]);
  /** Liste réactive des toasts actuellement affichés. */
  readonly toasts = this._toasts.asReadonly();

  success(message: string, options?: ToastOptions): number {
    return this.show('success', message, options);
  }

  error(message: string, options?: ToastOptions): number {
    return this.show('error', message, { duration: 0, ...options });
  }

  info(message: string, options?: ToastOptions): number {
    return this.show('info', message, options);
  }

  warning(message: string, options?: ToastOptions): number {
    return this.show('warning', message, options);
  }

  /** Retire un toast par son identifiant. */
  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  /** Retire tous les toasts. */
  clear(): void {
    this._toasts.set([]);
  }

  private show(type: ToastType, message: string, options?: ToastOptions): number {
    const id = ++this.uid;
    const toast: Toast = { id, type, message, title: options?.title };
    this._toasts.update((list) => [...list, toast]);

    const duration = options?.duration ?? this.defaultDuration;
    if (this.isBrowser && duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }
}
