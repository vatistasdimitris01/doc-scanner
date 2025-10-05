
export {};

export interface JScanify {
  highlightPaper(canvas: HTMLCanvasElement, options?: { color?: string; thickness?: number }): HTMLCanvasElement;
  extractPaper(canvas: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement | null;
}

declare global {
  interface Window {
    jscanify: new () => JScanify;
    cv: any; // OpenCV is a large library, using `any` for simplicity is pragmatic here.
  }
}

export enum AppState {
  LOADING = 'LOADING',
  READY = 'READY',
  SCANNING = 'SCANNING',
  PREVIEW = 'PREVIEW',
  ERROR = 'ERROR',
}
