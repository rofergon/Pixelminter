declare module 'pngjs' {
  export class PNG {
    width: number;
    height: number;
    data: Uint8Array;
    constructor(_options?: { width?: number; height?: number });
    static sync: {
      read(_buffer: Buffer): PNG;
      write(_png: PNG): Buffer;
    };
  }
}
