import { TransformationDefinition } from '../../types';
import { FaceDetector, FilesetResolver, Detection } from '@mediapipe/tasks-vision';

let faceDetector: FaceDetector | null = null;
let loadingPromise: Promise<void> | null = null;

const loadModels = async () => {
    if (faceDetector) return;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        faceDetector = await FaceDetector.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
                delegate: "GPU"
            },
            runningMode: "IMAGE"
        });
    })();

    await loadingPromise;
};

// Export the detector loader for other files to use
export const getFaceDetector = async (): Promise<FaceDetector> => {
    await loadModels();
    if (!faceDetector) throw new Error("Failed to load face detector");
    return faceDetector;
};

export const facePrivacy: TransformationDefinition = {
    id: 'ai-face-privacy',
    name: 'Face Privacy',
    description: 'Detect and blur faces.',
    params: [
        { name: 'blurAmount', label: 'Blur Amount', type: 'range', min: 1, max: 20, defaultValue: 10 },
        { name: 'confidence', label: 'Confidence Threshold', type: 'range', min: 0.1, max: 1.0, step: 0.1, defaultValue: 0.5 }
    ],
    apply: async (ctx, params) => {
        const detector = await getFaceDetector();

        const blurAmount = params.blurAmount || 10;
        const confidence = params.confidence || 0.5;

        // MediaPipe works with HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement
        // We need to ensure the canvas is valid for detection
        const detectionsResult = detector.detect(ctx.canvas);
        const detections = detectionsResult.detections;

        if (!detections || detections.length === 0) return;

        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // Create blurred version of the whole image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCtx.filter = `blur(${blurAmount}px)`;
        tempCtx.drawImage(ctx.canvas, 0, 0);
        tempCtx.filter = 'none';

        // For each face, clip the blurred image to the face box and draw over original
        ctx.save();
        ctx.beginPath();

        detections.forEach(detection => {
            // Check confidence if available (MediaPipe returns categories with scores)
            const score = detection.categories[0]?.score ?? 1.0;
            if (score < confidence) return;

            const box = detection.boundingBox;
            if (!box) return;

            // MediaPipe bounding box: originX, originY, width, height
            // We can use an ellipse for a more natural face blur
            const centerX = box.originX + box.width / 2;
            const centerY = box.originY + box.height / 2;
            const radiusX = box.width / 2;
            const radiusY = box.height / 2;

            ctx.moveTo(centerX + radiusX, centerY);
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        });

        ctx.clip();
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
    }
};
