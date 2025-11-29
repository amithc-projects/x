
declare module 'utif' {
    const UTIF: {
        encodeImage(rgba: Uint8Array, w: number, h: number, metadata?: any): ArrayBuffer;
        encode(rgba: Uint8Array, w: number, h: number, metadata?: any): ArrayBuffer;
        decode(buffer: ArrayBuffer): any[];
        toRGBA8(ifd: any): Uint8Array;
    };
    export default UTIF;
}

declare module 'gif.js' {
    export default class GIF {
        constructor(options: any);
        addFrame(image: HTMLImageElement | HTMLCanvasElement | ImageData, options?: any): void;
        on(event: string, callback: (blob: Blob) => void): void;
        render(): void;
    }
}
