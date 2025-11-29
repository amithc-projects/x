
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
// @ts-ignore
import GIF from 'gif.js';

export type CompositeType = 'none' | 'contact-sheet' | 'video' | 'gif';

export interface CompositeOptions {
    type: CompositeType;
    fps?: number; // For video/gif
    columns?: number; // For contact sheet
    gap?: number; // For contact sheet
    width?: number; // Output width (optional, defaults to source or calculated)
}

export class Compositor {
    async createContactSheet(blobs: Blob[], columns = 3, gap = 10): Promise<Blob | null> {
        if (blobs.length === 0) return null;
        const images = await Promise.all(blobs.map(b => this.blobToImage(b)));

        const rows = Math.ceil(images.length / columns);

        // Assume all images are roughly same size or we fit them into a grid cells
        // For simplicity, we'll use the first image's size as the cell size
        const cellWidth = images[0].naturalWidth;
        const cellHeight = images[0].naturalHeight;

        const canvas = document.createElement('canvas');
        canvas.width = (cellWidth * columns) + (gap * (columns - 1));
        canvas.height = (cellHeight * rows) + (gap * (rows - 1));
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Fill background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        images.forEach((img, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            const x = col * (cellWidth + gap);
            const y = row * (cellHeight + gap);

            // Draw image fitting into cell (cover or contain? let's do stretch/fill for now or drawImage default)
            // Better: drawImage with scaling to fit cell if sizes differ
            ctx.drawImage(img, x, y, cellWidth, cellHeight);
        });

        return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    }

    async createVideo(blobs: Blob[], secondsPerSlide = 1, fps = 30): Promise<Blob | null> {
        if (blobs.length === 0) return null;
        const images = await Promise.all(blobs.map(b => this.blobToImage(b)));

        const width = images[0].naturalWidth;
        const height = images[0].naturalHeight;

        const muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
                codec: 'avc',
                width,
                height
            },
            fastStart: 'in-memory',
        });

        const videoEncoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => console.error(e)
        });

        videoEncoder.configure({
            codec: 'avc1.42001f',
            width,
            height,
            bitrate: 2_000_000,
            framerate: fps
        });

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const framesPerSlide = Math.max(1, Math.round(secondsPerSlide * fps));
        const frameDuration = 1_000_000 / fps; // microseconds

        let frameCount = 0;

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            const bitmap = await createImageBitmap(canvas);

            // Repeat frame for duration
            for (let f = 0; f < framesPerSlide; f++) {
                const timestamp = frameCount * frameDuration;
                const frame = new VideoFrame(bitmap, { timestamp });
                videoEncoder.encode(frame, { keyFrame: frameCount % 30 === 0 });
                frame.close();
                frameCount++;
            }
        }

        await videoEncoder.flush();
        muxer.finalize();

        const { buffer } = muxer.target;
        return new Blob([buffer], { type: 'video/mp4' });
    }

    async createGIF(blobs: Blob[], secondsPerSlide = 0.5): Promise<Blob | null> {
        if (blobs.length === 0) return null;
        const images = await Promise.all(blobs.map(b => this.blobToImage(b)));

        return new Promise((resolve) => {
            const gif = new GIF({
                workers: 2,
                quality: 10,
                width: images[0].naturalWidth,
                height: images[0].naturalHeight,
                workerScript: '/gif.worker.js' // We need to ensure this file exists in public
            });

            const delay = secondsPerSlide * 1000;

            images.forEach(img => {
                gif.addFrame(img, { delay });
            });

            gif.on('finished', (blob: Blob) => {
                resolve(blob);
            });

            gif.render();
        });
    }

    private blobToImage(blob: Blob): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }
}
