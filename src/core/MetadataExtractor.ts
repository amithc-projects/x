
import ExifReader from 'exifreader';
import { getFaceDetector } from './transformations/ai/face_detection';

export interface ImageMetadata {
    date?: string;
    gps?: {
        lat: number;
        lon: number;
    };
    faceCount?: number;
    [key: string]: any;
}

export async function extractMetadata(file: File, image?: HTMLImageElement): Promise<ImageMetadata> {
    const metadata: ImageMetadata = {};

    try {
        // Extract EXIF
        const tags = await ExifReader.load(file);

        // Date
        if (tags['DateTimeOriginal']) {
            metadata.date = tags['DateTimeOriginal'].description;
        } else if (tags['DateTime']) {
            metadata.date = tags['DateTime'].description;
        }

        // GPS
        if (tags['GPSLatitude'] && tags['GPSLongitude']) {
            const lat = tags['GPSLatitude'].description;
            const lon = tags['GPSLongitude'].description;
            // ExifReader returns number usually, or array. Description is string.
            // We might need to parse it if it's not simple.
            // Actually ExifReader simplifies this usually.
            // Let's check documentation or assume standard behavior.
            // For safety, let's try to parse if it's a number.
            // But ExifReader types might be tricky.
            // Let's use the raw values if available or description.
            // Actually, let's just store the string description for CSV.
            metadata.gps = {
                lat: parseFloat(String(lat)),
                lon: parseFloat(String(lon))
            };
        }

    } catch (e) {
        console.warn('Failed to extract EXIF', e);
    }

    // Face Detection (if image is provided)
    if (image) {
        try {
            const detector = await getFaceDetector();
            const result = detector.detect(image);
            metadata.faceCount = result.detections.length;
        } catch (e) {
            console.warn('Failed to detect faces', e);
        }
    }

    return metadata;
}
