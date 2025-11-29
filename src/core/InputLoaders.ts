
import heic2any from 'heic2any';

export async function loadImage(file: File): Promise<HTMLImageElement> {
    // Handle HEIC
    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
        try {
            const convertedBlob = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.9
            });

            const blobToLoad = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
            return loadStandardImage(blobToLoad);
        } catch (error) {
            console.error('Error converting HEIC:', error);
            throw new Error('Failed to convert HEIC image');
        }
    }

    // Handle RAW (Placeholder for now)
    // if (file.name.toLowerCase().endsWith('.cr2') || ...) { ... }

    // Standard Image
    return loadStandardImage(file);
}

function loadStandardImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            // We don't revoke immediately because we might need it for a bit, 
            // but in a real app we should manage lifecycle. 
            // For now, let's keep it simple.
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        img.src = url;
    });
}
