export {};

declare global {
  interface Window {
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

export interface Point {
  x: number;
  y: number;
}
