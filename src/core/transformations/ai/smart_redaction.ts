import { TransformationDefinition } from '../../types';
import Tesseract from 'tesseract.js';

export const smartRedaction: TransformationDefinition = {
    id: 'ai-smart-redaction',
    name: 'Smart Redaction',
    description: 'Detect and blur text.',
    params: [
        { name: 'blurAmount', label: 'Blur Amount', type: 'range', min: 1, max: 20, defaultValue: 5 },
        { name: 'language', label: 'Language', type: 'select', options: [{ label: 'English', value: 'eng' }], defaultValue: 'eng' }
    ],
    apply: async (ctx, params) => {
        const blurAmount = params.blurAmount || 5;
        const lang = params.language || 'eng';

        // Tesseract works best with Data URL or Blob
        const dataUrl = ctx.canvas.toDataURL('image/jpeg');

        const result = await Tesseract.recognize(
            dataUrl,
            lang,
            // { logger: m => console.log(m) }
        );

        const words = result.data.words;
        if (words.length === 0) return;

        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // Create blurred version
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCtx.filter = `blur(${blurAmount}px)`;
        tempCtx.drawImage(ctx.canvas, 0, 0);
        tempCtx.filter = 'none';

        // Clip and draw blurred text regions
        ctx.save();
        ctx.beginPath();
        words.forEach((word: any) => {
            const box = word.bbox;
            // Pad the box slightly
            const padding = 2;
            ctx.rect(box.x0 - padding, box.y0 - padding, (box.x1 - box.x0) + padding * 2, (box.y1 - box.y0) + padding * 2);
        });
        ctx.clip();
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
    }
};
