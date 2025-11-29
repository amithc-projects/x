import { Recipe, TransformationContext, Condition, ProcessResult } from './types';
import { transformationRegistry } from './Registry';

export class ImageProcessor {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.createElement('canvas');
        const ctx = this.canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        this.ctx = ctx;
    }

    private evaluateCondition(condition: Condition, context: TransformationContext, canvas: HTMLCanvasElement): boolean {
        let value: any;

        // Resolve field value
        if (condition.field === 'width') value = canvas.width;
        else if (condition.field === 'height') value = canvas.height;
        else if (condition.field === 'aspectRatio') value = canvas.width / canvas.height;
        else if (condition.field.startsWith('metadata.')) {
            const key = condition.field.split('.')[1];
            value = context.metadata?.[key];
        } else {
            return false; // Unknown field
        }

        // Compare
        switch (condition.operator) {
            case 'eq': return value == condition.value;
            case 'neq': return value != condition.value;
            case 'gt': return value > condition.value;
            case 'lt': return value < condition.value;
            case 'gte': return value >= condition.value;
            case 'lte': return value <= condition.value;
            case 'contains': return String(value).includes(String(condition.value));
            default: return false;
        }
    }

    async process(
        image: HTMLImageElement,
        recipe: Recipe,
        context: TransformationContext,
        stopAfterStepIndex?: number
    ): Promise<ProcessResult[]> {
        // Reset canvas to image size
        this.canvas.width = image.naturalWidth;
        this.canvas.height = image.naturalHeight;

        // Draw initial image
        this.ctx.drawImage(image, 0, 0);

        // Initialize variables if not present (though caller should usually provide)
        if (!context.variables) {
            context.variables = new Map();
        }

        const results: ProcessResult[] = [];

        // Apply steps
        for (let i = 0; i < recipe.steps.length; i++) {
            const step = recipe.steps[i];

            // Check if disabled
            if (step.disabled) {
                // Even if disabled, we still respect the stop index loop
                if (stopAfterStepIndex !== undefined && i === stopAfterStepIndex) {
                    break;
                }
                continue;
            }

            // Check condition
            if (step.condition) {
                if (!this.evaluateCondition(step.condition, context, this.canvas)) {
                    continue;
                }
            }

            if (step.transformationId === 'workflow-export') {
                const suffix = step.params.suffix || '';
                const format = step.params.format || 'image/jpeg';
                const quality = step.params.quality !== undefined ? step.params.quality / 100 : 0.95;

                let blob: Blob | null = null;

                if (format === 'image/tiff') {
                    try {
                        const UTIF = (await import('utif')).default;
                        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                        const tiffData = UTIF.encodeImage(new Uint8Array(imageData.data.buffer), imageData.width, imageData.height);
                        blob = new Blob([tiffData], { type: 'image/tiff' });
                    } catch (e) {
                        console.warn('TIFF export failed, falling back to JPEG', e);
                        blob = await new Promise<Blob | null>((resolve) => {
                            this.canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
                        });
                    }
                } else {
                    blob = await new Promise<Blob | null>((resolve) => {
                        this.canvas.toBlob((b) => resolve(b), format, quality);
                    });
                }

                if (blob) {
                    const nameParts = context.filename.split('.');
                    const ext = nameParts.pop();
                    const base = nameParts.join('.');
                    // Determine extension
                    let newExt = 'jpg';
                    if (format === 'image/webp') newExt = 'webp';
                    else if (format === 'image/avif') newExt = 'avif';
                    else if (format === 'image/png') newExt = 'png';
                    else if (format === 'image/tiff') newExt = 'tiff';

                    results.push({
                        blob,
                        filename: `${base}${suffix}.${newExt}`,
                        subfolder: context.outputSubfolder
                    });
                }
            } else if (['output-video', 'output-gif', 'output-contact-sheet'].includes(step.transformationId)) {
                // Aggregation Step: Capture current state
                // We capture as JPEG for speed/size, or maybe PNG for quality?
                // Let's use JPEG 0.9 for now
                const blob = await new Promise<Blob | null>((resolve) => {
                    this.canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
                });

                if (blob) {
                    results.push({
                        blob,
                        filename: `capture_${step.id}.jpg`, // Temporary name
                        aggregationId: step.id,
                        subfolder: context.outputSubfolder // Store where this capture "belongs" if needed
                    });
                }
            } else {
                const transformation = transformationRegistry.get(step.transformationId);
                if (transformation) {
                    await transformation.apply(this.ctx, step.params, context);
                } else {
                    console.warn(`Transformation ${step.transformationId} not found`);
                }
            }

            // Stop if we reached the requested step index (for partial preview)
            if (stopAfterStepIndex !== undefined && i === stopAfterStepIndex) {
                break;
            }
        }

        // ... (rest of the function logic for preview if needed, but we return results)

        // If no exports defined, or if we stopped early (and thus might have skipped exports),
        // we might want to return the current state.
        const hasExports = recipe.steps.some(s => s.transformationId === 'workflow-export' || ['output-video', 'output-gif', 'output-contact-sheet'].includes(s.transformationId));

        if (!hasExports && stopAfterStepIndex === undefined) {
            const blob = await new Promise<Blob | null>((resolve) => {
                this.canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
            });
            if (blob) {
                results.push({ blob, filename: context.filename, subfolder: context.outputSubfolder });
            }
        }

        return results;
    }

    // Helper to get Data URL for preview
    async processToDataUrl(
        image: HTMLImageElement,
        recipe: Recipe,
        context: TransformationContext,
        stopAfterStepIndex?: number
    ): Promise<string> {
        // We call process mainly to run the side effects on the canvas
        await this.process(image, recipe, context, stopAfterStepIndex);

        return new Promise((resolve) => {
            this.canvas.toBlob((blob) => {
                if (blob) resolve(URL.createObjectURL(blob));
                else resolve('');
            }, 'image/jpeg', 0.95);
        });
    }
}


export const imageProcessor = new ImageProcessor();
