import { transformationRegistry } from '../Registry';
import { grayscale, sepia, brightness, blur, noise } from './filters';
import { resize, crop, flip, rotate, roundCorners, border } from './geometry';
import { canvasPadding } from './geometry/canvas_padding';
import { smartCrop } from './geometry/smart_crop';
import { cropToFace } from './geometry/crop_to_face';
import { caption, watermark } from './text';
import { exportStep } from './workflow';
import { saveState } from './workflow/save_state';
import { loadState } from './workflow/load_state';
import { autoLevels, tuning, opacity } from './color_correction';
import { sharpen, vignette, pixelate, duotone, posterize, edgeDetection } from './advanced_filters';
import { facePrivacy } from './ai/face_detection';
import { smartRedaction } from './ai/smart_redaction';
import { backgroundRemoval } from './ai/background_removal';
import { stripMetadata } from './metadata/gps';
import { textFill, textCutout } from './creative/typography';
import { outputFolder, outputVideo, outputGif, outputContactSheet } from './output';

export function registerAllTransformations() {
    transformationRegistry.register(grayscale);
    transformationRegistry.register(sepia);
    transformationRegistry.register(brightness);
    transformationRegistry.register(blur);
    transformationRegistry.register(noise);
    transformationRegistry.register(resize);
    transformationRegistry.register(crop);
    transformationRegistry.register(flip);
    transformationRegistry.register(rotate);
    transformationRegistry.register(roundCorners);
    transformationRegistry.register(border);
    transformationRegistry.register(canvasPadding);
    transformationRegistry.register(smartCrop);
    transformationRegistry.register(cropToFace);
    transformationRegistry.register(caption);
    transformationRegistry.register(watermark);
    transformationRegistry.register(exportStep);
    transformationRegistry.register(saveState);
    transformationRegistry.register(loadState);
    transformationRegistry.register(autoLevels);
    transformationRegistry.register(tuning);
    transformationRegistry.register(opacity);
    transformationRegistry.register(sharpen);
    transformationRegistry.register(vignette);
    transformationRegistry.register(pixelate);
    transformationRegistry.register(duotone);
    transformationRegistry.register(posterize);
    transformationRegistry.register(edgeDetection);
    transformationRegistry.register(facePrivacy);
    transformationRegistry.register(smartRedaction);
    transformationRegistry.register(backgroundRemoval);
    transformationRegistry.register(stripMetadata);
    // Typography
    transformationRegistry.register(textFill);
    transformationRegistry.register(textCutout);

    // Output & Aggregation
    transformationRegistry.register(outputFolder);
    transformationRegistry.register(outputVideo);
    transformationRegistry.register(outputGif);
    transformationRegistry.register(outputContactSheet);
}
