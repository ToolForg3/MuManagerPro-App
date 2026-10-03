/**
 * FeedbackService.ts
 * Gestor global de suscripción y apertura del modal interactivo de Feedback / Calificación
 * Conecta el ciclo de vida del APK (expiración de demo o apertura manual) con FeedbackModal
 */

export interface FeedbackModalOptions {
  source?: string;
  initialRating?: number;
  title?: string;
  subtitle?: string;
}

type FeedbackListener = (options: FeedbackModalOptions | null) => void;

export class FeedbackService {
  private static listeners: Set<FeedbackListener> = new Set();
  private static currentOptions: FeedbackModalOptions | null = null;

  static show(options?: FeedbackModalOptions) {
    this.currentOptions = options || { source: 'inapp_manual' };
    this.notify();
  }

  static hide() {
    this.currentOptions = null;
    this.notify();
  }

  static subscribe(listener: FeedbackListener): () => void {
    this.listeners.add(listener);
    listener(this.currentOptions);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify() {
    this.listeners.forEach((fn) => fn(this.currentOptions));
  }
}
