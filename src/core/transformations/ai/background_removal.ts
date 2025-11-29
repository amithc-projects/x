import { TransformationDefinition } from '../../types';
import { removeBackground } from '@imgly/background-removal';

export const backgroundRemoval: TransformationDefinition = {
    id: 'ai-background-removal',
    name: 'Remove Background',
    description: 'Automatically remove the background using AI.',
    params: [
        {
            name: 'model',
            label: 'Model Quality',
            type: 'select',
            options: [
                { label: 'Medium', value: 'medium' },
                { label: 'Small', value: 'small' }
            ],
            defaultValue: 'medium'
        }
    ],
    apply: async (ctx, params) => {
        const model = params.model || 'medium';

        // Config for imgly
        const config = {
            debug: true,
            model: model === 'small' ? 'small' : 'medium',
            progress: (key: string, current: number, total: number) => {
                if (key.startsWith('fetch')) return; // Reduce log noise
                console.log(`Downloading ${key}: ${current} of ${total}`);
            }
        };

        try {
            console.log('Calling removeBackground with:', { removeBackground, config });

            // Convert canvas to Blob first - this is often more robust than passing canvas directly
            const blobInput = await new Promise<Blob | null>(resolve => ctx.canvas.toBlob(resolve, 'image/png'));

            if (!blobInput) throw new Error('Failed to create blob from canvas');

            // removeBackground is the default export
            // @ts-ignore - The type definition might be slightly off or missing in the environment
            const blob = await removeBackground(blobInput, config);

            // Convert Blob to ImageBitmap to draw on canvas
            const imageBitmap = await createImageBitmap(blob);

            // Clear the canvas
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // Draw the result
            ctx.drawImage(imageBitmap, 0, 0);

        } catch (error) {
            console.error('Background removal failed:', error);
            throw error;
        }
    }
};
