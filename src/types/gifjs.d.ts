declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    transparent?: string | null;
    repeat?: number;
    background?: string;
    dither?: boolean | string;
    workerScript?: string;
  }

  interface GIFAddFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
    transparent?: string;
    x?: number;
    y?: number;
  }

  type GIFEvent = 'finished' | 'progress';
  type GIFEventCallback<T extends GIFEvent> =
    T extends 'finished' ? (_blob: Blob) => void : (_progress: number) => void;

  export default class GIF {
    constructor(_options?: GIFOptions);
    addFrame(
      _element:
        | HTMLCanvasElement
        | HTMLImageElement
        | CanvasRenderingContext2D
        | ImageData,
      _options?: GIFAddFrameOptions
    ): void;
    on<T extends GIFEvent>(
      _event: T,
      _callback: GIFEventCallback<T>
    ): void;
    render(): void;
  }
}
