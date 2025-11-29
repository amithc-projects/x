import { TransformationDefinition } from '../../types';
import { getFaceDetector } from '../ai/face_detection';

export const cropToFace: TransformationDefinition = {
    id: 'geometry-crop-to-face',
    name: 'Crop to Face',
    description: 'Automatically crop the image to include all detected faces.',
    params: [
        { name: 'padding', label: 'Padding (px)', type: 'range', min: 0, max: 500, defaultValue: 50 },
        { name: 'confidence', label: 'Confidence Threshold', type: 'range', min: 0.1, max: 1.0, step: 0.1, defaultValue: 0.5 }
    ],
    apply: async (ctx, params) => {
        const detector = await getFaceDetector();
        const padding = params.padding || 50;
        const confidence = params.confidence || 0.5;

        const detectionsResult = detector.detect(ctx.canvas);
        const detections = detectionsResult.detections;

        if (!detections || detections.length === 0) {
            // No faces found, maybe we should just return or perhaps warn?
            // For now, let's just return (no-op)
            return;
        }

        // Calculate bounding box encompassing all faces
        let minX = ctx.canvas.width;
        let minY = ctx.canvas.height;
        let maxX = 0;
        let maxY = 0;
        let facesFound = false;

        detections.forEach(detection => {
            const score = detection.categories[0]?.score ?? 1.0;
            if (score < confidence) return;

            facesFound = true;
            const box = detection.boundingBox;
            if (!box) return;

            minX = Math.min(minX, box.originX);
            minY = Math.min(minY, box.originY);
            maxX = Math.max(maxX, box.originX + box.width);
            maxY = Math.max(maxY, box.originY + box.height);
        });

        if (!facesFound) return;

        // Apply padding
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(ctx.canvas.width, maxX + padding);
        maxY = Math.min(ctx.canvas.height, maxY + padding);

        const cropWidth = maxX - minX;
        const cropHeight = maxY - minY;

        // Create a temporary canvas to hold the cropped image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropWidth;
        tempCanvas.height = cropHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCtx.drawImage(
            ctx.canvas,
            minX, minY, cropWidth, cropHeight, // Source
            0, 0, cropWidth, cropHeight        // Destination
        );

        // Resize the original canvas to match the crop
        ctx.canvas.width = cropWidth;
        ctx.canvas.height = cropHeight;

        // Draw the cropped image back onto the original canvas
        ctx.drawImage(tempCanvas, 0, 0);
    }
};
