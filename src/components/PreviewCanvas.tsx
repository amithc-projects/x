import React, { useEffect, useState } from 'react';
import { Recipe } from '../core/types';
import { imageProcessor } from '../core/Processor';
import { Loader2, MapPin, X } from 'lucide-react';
import ExifReader from 'exifreader';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface PreviewCanvasProps {
    originalImage: HTMLImageElement | null;
    recipe: Recipe;
    stopAfterStepIndex?: number;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
    originalImage,
    recipe,
    stopAfterStepIndex,
}) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
    const [showMap, setShowMap] = useState(false);

    // Robust GPS Parsing Helper
    const calculateCoordinate = (tags: any, type: 'Lat' | 'Long') => {
        const tagName = `GPS${type}itude`;
        const tagRefName = `GPS${type}itudeRef`;
        const tagVal = tags[tagName];
        const tagRef = tags[tagRefName];

        console.log(`[GPS Parse] Checking ${tagName}:`, tagVal);

        if (!tagVal) return null;

        let decimal: number | null = null;

        // STRATEGY 1: Parse from raw EXIF 'value' array (Most Reliable)
        // Format is typically [[deg, 1], [min, 1], [sec, 1]]
        if (tagVal.value && Array.isArray(tagVal.value) && tagVal.value.length === 3) {
            try {
                const degrees = tagVal.value[0][0] / tagVal.value[0][1];
                const minutes = tagVal.value[1][0] / tagVal.value[1][1];
                const seconds = tagVal.value[2][0] / tagVal.value[2][1];

                decimal = degrees + (minutes / 60) + (seconds / 3600);
                console.log(`[GPS Parse] Calculated from value: ${decimal}`);
            } catch (e) {
                console.warn(`[GPS Parse] Error calculating from value array`, e);
            }
        }

        // STRATEGY 2: Use description if it's already a number (Your case)
        if (decimal === null && typeof tagVal.description === 'number') {
            decimal = tagVal.description;
            console.log(`[GPS Parse] Used numeric description: ${decimal}`);
        }

        // STRATEGY 3: Parse string description (Fallback)
        if (decimal === null && typeof tagVal.description === 'string') {
            const val = parseFloat(tagVal.description);
            if (!isNaN(val)) {
                decimal = val;
                console.log(`[GPS Parse] Parsed string description: ${decimal}`);
            }
        }

        if (decimal === null) return null;

        // Apply Hemisphere (South or West must be negative)
        if (tagRef) {
            const refText = (tagRef.value && tagRef.value[0]) ? tagRef.value[0] : tagRef.description;
            console.log(`[GPS Parse] Ref for ${type}:`, refText);

            if (typeof refText === 'string') {
                const upperRef = refText.trim().toUpperCase();
                // Check if it starts with S or W (e.g. "S", "SOUTH", "W", "WEST")
                if (upperRef.startsWith('S') || upperRef.startsWith('W')) {
                    decimal = decimal * -1;
                }
            }
        }

        return decimal;
    };

    // Extract GPS
    useEffect(() => {
        if (!originalImage) {
            setGps(null);
            return;
        }

        const loadGps = async () => {
            try {
                const res = await fetch(originalImage.src);
                // We use blob first, then try to load it
                const blob = await res.blob();

                // ExifReader.load can take a blob directly or an ArrayBuffer
                // Converting to ArrayBuffer is safest for the browser version
                const buffer = await blob.arrayBuffer();
                const tags = ExifReader.load(buffer);

                // Debugging: Log tags to see if GPS exists
                console.log("Loaded EXIF Tags:", tags);

                const lat = calculateCoordinate(tags, 'Lat');
                const lng = calculateCoordinate(tags, 'Long');

                if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                    console.log(`Found location: ${lat}, ${lng}`);
                    setGps({ lat, lng });
                } else {
                    console.log("No valid GPS tags found");
                    setGps(null);
                }
            } catch (e) {
                console.warn('Failed to load EXIF', e);
                setGps(null);
            }
        };
        loadGps();
    }, [originalImage]);

    // Debounce processing
    useEffect(() => {
        if (!originalImage) {
            setPreviewUrl(null);
            return;
        }

        const process = async () => {
            setLoading(true);
            setError(null);
            try {
                const url = await imageProcessor.processToDataUrl(
                    originalImage,
                    recipe,
                    {
                        originalImage,
                        filename: 'preview.jpg',
                        variables: new Map(),
                    },
                    stopAfterStepIndex
                );
                setPreviewUrl(url);
            } catch (err) {
                console.error(err);
                setError('Failed to process image');
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(process, 500);
        return () => clearTimeout(timer);
    }, [originalImage, recipe, stopAfterStepIndex]);

    // Cleanup URL
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    if (!originalImage) {
        return (
            <div className="preview-empty">
                <p>Select an image to preview the recipe</p>
            </div>
        );
    }

    return (
        <div className="preview-canvas">
            {loading && (
                <div className="preview-loading">
                    <Loader2 className="animate-spin" size={32} />
                </div>
            )}
            {error && <div className="preview-error">{error}</div>}

            <div className="canvas-content" style={{
                display: 'flex',
                width: '100%',
                height: '100%',
                gap: '1rem'
            }}>
                {/* Left Side: Image */}
                <div className="image-wrapper" style={{
                    flex: showMap ? '1' : 'auto',
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: showMap ? '50%' : '100%'
                }}>
                    {previewUrl && (
                        <img src={previewUrl} alt="Preview" className="preview-image" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    )}
                    {/* Toggle Button */}
                    {gps && !showMap && (
                        <button className="map-toggle-btn" onClick={() => setShowMap(true)}>
                            <MapPin size={16} />
                            View on Map
                        </button>
                    )}
                </div>

                {/* Right Side: Map (Only if toggled) */}
                {showMap && gps && (
                    <div className="map-wrapper" style={{
                        flex: '1',
                        width: '50%',
                        position: 'relative',
                        borderLeft: '1px solid var(--color-border)'
                    }}>
                        <MapContainer center={[gps.lat, gps.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <Marker position={[gps.lat, gps.lng]}>
                                <Popup>
                                    Image Location
                                </Popup>
                            </Marker>
                        </MapContainer>
                        <button className="close-map-btn" onClick={() => setShowMap(false)}>
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>

            <style>{`
        .preview-canvas {
          flex: 1;
          background: var(--color-bg-tertiary);
          padding: var(--spacing-md);
          overflow: hidden;
          position: relative;
        }
        .preview-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
          background: var(--color-bg-tertiary);
        }
        .preview-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .preview-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: var(--color-primary);
          background: rgba(0, 0, 0, 0.5);
          padding: var(--spacing-md);
          border-radius: var(--radius-full);
          z-index: 20;
        }
        .preview-error {
          position: absolute;
          bottom: var(--spacing-md);
          left: 50%;
          transform: translateX(-50%);
          background: var(--color-error);
          color: white;
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          z-index: 20;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .map-toggle-btn {
            position: absolute;
            top: var(--spacing-md);
            right: var(--spacing-md);
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            padding: var(--spacing-sm) var(--spacing-md);
            background: var(--color-bg-primary);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            color: var(--color-text-primary);
            z-index: 10;
        }
        .close-map-btn {
            position: absolute;
            top: var(--spacing-sm);
            right: var(--spacing-sm);
            z-index: 1000;
            padding: var(--spacing-xs);
            background: var(--color-bg-primary);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-full);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-text-primary);
        }
        .close-map-btn:hover {
            background: var(--color-bg-secondary);
        }
      `}</style>
        </div>
    );
};