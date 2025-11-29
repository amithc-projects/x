import { TransformationDefinition } from '../types';

export const exportStep: TransformationDefinition = {
    id: 'workflow-export',
    name: 'Export / Save Point',
    description: 'Save the image at this stage',
    params: [
        { name: 'suffix', label: 'Filename Suffix', type: 'text', defaultValue: '_processed' },
        {
            name: 'format', label: 'Format', type: 'select', options: [
                { label: 'JPEG', value: 'image/jpeg' },
                { label: 'PNG', value: 'image/png' },
                { label: 'WEBP', value: 'image/webp' },
                { label: 'AVIF', value: 'image/avif' },
                { label: 'TIFF', value: 'image/tiff' }
            ], defaultValue: 'image/jpeg'
        },
        { name: 'quality', label: 'Quality (1-100)', type: 'range', min: 1, max: 100, step: 1, defaultValue: 90 },
    ],
    apply: () => {
        // No-op for canvas, handled by processor
    },
};
