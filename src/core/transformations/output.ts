
import { TransformationDefinition } from '../types';

export const outputFolder: TransformationDefinition = {
    id: 'output-folder',
    name: 'Change Output Folder',
    description: 'Change the subfolder where subsequent files are saved.',
    params: [
        { name: 'folder', label: 'Folder Name', type: 'text', defaultValue: 'output' }
    ],
    apply: (ctx, params, context) => {
        context.outputSubfolder = params.folder;
    }
};

// Aggregation steps don't modify the canvas, but they signal the processor to capture the state
// The actual logic is handled in the Processor loop and BatchRunner
export const outputVideo: TransformationDefinition = {
    id: 'output-video',
    name: 'Create Video (Aggregation)',
    description: 'Combine processed images into a video. (Runs after batch)',
    params: [
        { name: 'filename', label: 'Filename', type: 'text', defaultValue: 'video.mp4' },
        { name: 'secondsPerSlide', label: 'Seconds per Slide', type: 'number', min: 0.1, max: 10, step: 0.1, defaultValue: 1 },
        { name: 'fps', label: 'FPS', type: 'number', min: 1, max: 60, defaultValue: 30 }
    ],
    apply: () => { }
};

export const outputGif: TransformationDefinition = {
    id: 'output-gif',
    name: 'Create GIF (Aggregation)',
    description: 'Combine processed images into a GIF. (Runs after batch)',
    params: [
        { name: 'filename', label: 'Filename', type: 'text', defaultValue: 'animation.gif' },
        { name: 'secondsPerSlide', label: 'Seconds per Slide', type: 'number', min: 0.1, max: 10, step: 0.1, defaultValue: 0.5 }
    ],
    apply: () => { }
};

export const outputContactSheet: TransformationDefinition = {
    id: 'output-contact-sheet',
    name: 'Contact Sheet (Aggregation)',
    description: 'Create a grid of processed images. (Runs after batch)',
    params: [
        { name: 'filename', label: 'Filename', type: 'text', defaultValue: 'contact_sheet.jpg' },
        { name: 'columns', label: 'Columns', type: 'number', min: 1, max: 20, defaultValue: 5 },
        { name: 'gap', label: 'Gap (px)', type: 'number', min: 0, max: 100, defaultValue: 10 }
    ],
    apply: () => { }
};
