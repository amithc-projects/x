import { TransformationDefinition } from '../types';

export const sharpen: TransformationDefinition = {
    id: 'filter-sharpen',
    name: 'Sharpen',
    description: 'Apply Unsharp Mask to sharpen the image.',
    params: [
        { name: 'amount', label: 'Amount', type: 'range', min: 0, max: 500, defaultValue: 100 },
        { name: 'radius', label: 'Radius', type: 'range', min: 0, max: 20, step: 0.1, defaultValue: 1 },
        { name: 'threshold', label: 'Threshold', type: 'range', min: 0, max: 255, defaultValue: 0 }
    ],
    apply: (ctx, params) => {
        const amount = (params.amount || 100) / 100;
        const radius = params.radius || 1;
        const threshold = params.threshold || 0;

        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // 1. Create a blurred copy
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCtx.filter = `blur(${radius}px)`;
        tempCtx.drawImage(ctx.canvas, 0, 0);
        tempCtx.filter = 'none';

        const originalData = ctx.getImageData(0, 0, width, height);
        const blurredData = tempCtx.getImageData(0, 0, width, height);

        const src = originalData.data;
        const blurred = blurredData.data;

        // 2. Subtract blurred from original (Unsharp Mask)
        for (let i = 0; i < src.length; i += 4) {
            for (let j = 0; j < 3; j++) {
                const org = src[i + j];
                const blur = blurred[i + j];

                if (Math.abs(org - blur) >= threshold) {
                    src[i + j] = org + (org - blur) * amount;
                }
            }
        }

        ctx.putImageData(originalData, 0, 0);
    }
};

export const vignette: TransformationDefinition = {
    id: 'filter-vignette',
    name: 'Vignette',
    description: 'Add a dark vignette effect.',
    params: [
        { name: 'amount', label: 'Amount (%)', type: 'range', min: 0, max: 100, defaultValue: 50 },
        { name: 'radius', label: 'Radius (%)', type: 'range', min: 0, max: 100, defaultValue: 50 }
    ],
    apply: (ctx, params) => {
        const amount = (params.amount || 50) / 100;
        const radius = (params.radius || 50) / 100;
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // Draw a radial gradient
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, Math.max(width, height) * radius * 0.5,
            width / 2, height / 2, Math.max(width, height) * 0.8
        );

        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${amount})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
};

export const pixelate: TransformationDefinition = {
    id: 'filter-pixelate',
    name: 'Pixelate',
    description: 'Pixelate the image.',
    params: [
        { name: 'size', label: 'Pixel Size', type: 'range', min: 2, max: 100, defaultValue: 10 }
    ],
    apply: (ctx, params) => {
        const size = params.size || 10;
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // Downscale
        const w = Math.ceil(width / size);
        const h = Math.ceil(height / size);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Turn off smoothing for pixel art look
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.drawImage(ctx.canvas, 0, 0, w, h);

        // Upscale
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, width, height);
        ctx.imageSmoothingEnabled = true; // Reset
    }
};

export const duotone: TransformationDefinition = {
    id: 'filter-duotone',
    name: 'Duotone',
    description: 'Map luminosity to two colors.',
    params: [
        { name: 'color1', label: 'Dark Color', type: 'color', defaultValue: '#0000ff' },
        { name: 'color2', label: 'Light Color', type: 'color', defaultValue: '#ff0000' }
    ],
    apply: (ctx, params) => {
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 0, g: 0, b: 0 };
        };

        const c1 = hexToRgb(params.color1 || '#0000ff');
        const c2 = hexToRgb(params.color2 || '#ff0000');

        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const t = l / 255;

            data[i] = c1.r + (c2.r - c1.r) * t;
            data[i + 1] = c1.g + (c2.g - c1.g) * t;
            data[i + 2] = c1.b + (c2.b - c1.b) * t;
        }

        ctx.putImageData(imageData, 0, 0);
    }
};

export const posterize: TransformationDefinition = {
    id: 'filter-posterize',
    name: 'Posterize',
    description: 'Reduce the number of colors.',
    params: [
        { name: 'levels', label: 'Levels', type: 'range', min: 2, max: 255, defaultValue: 8 }
    ],
    apply: (ctx, params) => {
        const levels = Math.max(2, Math.min(255, params.levels || 8));
        const step = 255 / (levels - 1);

        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.round(data[i] / step) * step;
            data[i + 1] = Math.round(data[i + 1] / step) * step;
            data[i + 2] = Math.round(data[i + 2] / step) * step;
        }

        ctx.putImageData(imageData, 0, 0);
    }
};

export const edgeDetection: TransformationDefinition = {
    id: 'filter-edge-detection',
    name: 'Edge Detection',
    description: 'Detect edges using Sobel operator.',
    params: [
        { name: 'threshold', label: 'Threshold', type: 'range', min: 0, max: 255, defaultValue: 50 },
        { name: 'composite', label: 'Composite over Original', type: 'boolean', defaultValue: false },
        { name: 'invert', label: 'Invert (Black Edges)', type: 'boolean', defaultValue: true }
    ],
    apply: (ctx, params) => {
        const threshold = params.threshold || 50;
        const composite = params.composite || false;
        const invert = params.invert !== undefined ? params.invert : true;

        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // We need a copy of the original data for the Sobel operator
        const originalData = ctx.getImageData(0, 0, width, height);
        const src = originalData.data;

        const outputData = ctx.createImageData(width, height);
        const dst = outputData.data;

        const w = width;
        const h = height;

        // Sobel kernels
        const kx = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];
        const ky = [
            [-1, -2, -1],
            [0, 0, 0],
            [1, 2, 1]
        ];

        const getPixel = (x: number, y: number) => {
            if (x < 0 || x >= w || y < 0 || y >= h) return 0;
            const i = (y * w + x) * 4;
            // Use luminance
            return 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        };

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let gx = 0;
                let gy = 0;

                for (let ky_y = -1; ky_y <= 1; ky_y++) {
                    for (let kx_x = -1; kx_x <= 1; kx_x++) {
                        const val = getPixel(x + kx_x, y + ky_y);
                        gx += val * kx[ky_y + 1][kx_x + 1];
                        gy += val * ky[ky_y + 1][kx_x + 1];
                    }
                }

                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const isEdge = magnitude > threshold;

                const i = (y * w + x) * 4;

                if (composite) {
                    // If composite, we draw edges on top of original
                    // If it's an edge, draw it (black or white depending on invert)
                    // If not an edge, keep original pixel
                    if (isEdge) {
                        const edgeColor = invert ? 0 : 255;
                        dst[i] = edgeColor;
                        dst[i + 1] = edgeColor;
                        dst[i + 2] = edgeColor;
                        dst[i + 3] = 255;
                    } else {
                        dst[i] = src[i];
                        dst[i + 1] = src[i + 1];
                        dst[i + 2] = src[i + 2];
                        dst[i + 3] = src[i + 3];
                    }
                } else {
                    // Just the edge map
                    let val = isEdge ? 255 : 0;
                    if (invert) val = 255 - val; // Invert: Edges are black (0), background white (255)

                    dst[i] = val;
                    dst[i + 1] = val;
                    dst[i + 2] = val;
                    dst[i + 3] = 255;
                }
            }
        }

        ctx.putImageData(outputData, 0, 0);
    }
};
