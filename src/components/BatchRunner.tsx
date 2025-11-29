import React, { useState } from 'react';
import { Recipe } from '../core/types';
import { imageProcessor } from '../core/Processor';
import { loadImage } from '../core/InputLoaders';
import { CSVLogger } from '../core/CSVLogger';
import { Compositor } from '../core/Compositor';
import { extractMetadata } from '../core/MetadataExtractor';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Play, Download, Loader2, FolderOpen } from 'lucide-react';

interface BatchRunnerProps {
    files: File[];
    recipe: Recipe;
}

export const BatchRunner: React.FC<BatchRunnerProps> = ({ files, recipe }) => {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [zipBlob, setZipBlob] = useState<Blob | null>(null);
    const [status, setStatus] = useState<string>('');
    const [outputHandle, setOutputHandle] = useState<FileSystemDirectoryHandle | null>(null);

    const handleSelectFolder = async () => {
        try {
            // @ts-ignore
            const handle = await window.showDirectoryPicker();
            setOutputHandle(handle);
        } catch (e) {
            console.error('Folder selection cancelled or failed', e);
        }
    };

    const runBatch = async () => {
        if (files.length === 0) return;

        setProcessing(true);
        setProgress(0);
        setZipBlob(null);
        setStatus('Initializing...');

        const zip = new JSZip();
        const total = files.length;
        const logger = new CSVLogger();
        const compositor = new Compositor();

        // Map<aggregationStepId, Blob[]>
        const aggregationCaptures = new Map<string, Blob[]>();

        try {
            for (let i = 0; i < total; i++) {
                const file = files[i];
                setStatus(`Processing ${file.name} (${i + 1}/${total})...`);

                // Load image
                const img = await loadImage(file);

                // Extract Metadata
                const metadata = await extractMetadata(file, img);

                // Process
                const context = {
                    originalImage: img,
                    filename: file.name,
                    variables: new Map(),
                    metadata: metadata
                };

                const results = await imageProcessor.process(img, recipe, context);

                // Log Data
                logger.addEntry({
                    filename: file.name,
                    date: metadata.date || new Date().toISOString(),
                    gps: metadata.gps ? `${metadata.gps.lat}, ${metadata.gps.lon}` : '',
                    faceCount: metadata.faceCount || 0,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                });

                // Handle Output
                for (const result of results) {
                    if (result.aggregationId) {
                        // Collect for aggregation
                        if (!aggregationCaptures.has(result.aggregationId)) {
                            aggregationCaptures.set(result.aggregationId, []);
                        }
                        aggregationCaptures.get(result.aggregationId)?.push(result.blob);
                    } else {
                        // Regular file export
                        await saveFile(result.blob, result.filename, result.subfolder, outputHandle, zip);
                    }
                }

                setProgress(((i + 1) / total) * 100);
            }

            // Generate CSV Log
            const csvBlob = logger.getBlob();
            await saveFile(csvBlob, 'batch_log.csv', undefined, outputHandle, zip);

            // Handle Aggregation Generation
            setStatus('Generating Aggregated Outputs...');

            // Iterate through recipe steps to find aggregation steps and process them in order
            for (const step of recipe.steps) {
                if (['output-video', 'output-gif', 'output-contact-sheet'].includes(step.transformationId)) {
                    const blobs = aggregationCaptures.get(step.id);
                    if (blobs && blobs.length > 0) {
                        setStatus(`Generating ${step.transformationId} (${step.id})...`);
                        let resultBlob: Blob | null = null;
                        const filename = step.params.filename || 'output';

                        if (step.transformationId === 'output-video') {
                            resultBlob = await compositor.createVideo(blobs, step.params.secondsPerSlide, step.params.fps);
                        } else if (step.transformationId === 'output-gif') {
                            resultBlob = await compositor.createGIF(blobs, step.params.secondsPerSlide);
                        } else if (step.transformationId === 'output-contact-sheet') {
                            resultBlob = await compositor.createContactSheet(blobs, step.params.columns, step.params.gap);
                        }

                        if (resultBlob) {
                            // We need to know where to save this. 
                            // The aggregation capture happened during processing, which might have had different subfolders.
                            // But usually aggregation output goes to a specific place.
                            // For now, let's save it to the root or if we track the subfolder of the *last* capture?
                            // Or maybe we should have captured the subfolder with the blobs?
                            // Let's assume root or the current outputHandle context.
                            // Actually, let's check if the first blob had a subfolder?
                            // Simpler: Save to root of outputHandle/zip.
                            await saveFile(resultBlob, filename, undefined, outputHandle, zip);
                        }
                    }
                }
            }

            if (!outputHandle) {
                setStatus('Generating ZIP file...');
                const content = await zip.generateAsync({ type: 'blob' });
                setZipBlob(content);
                setStatus('Done! Ready to download.');
            } else {
                setStatus('Done! Files saved to folder.');
            }

        } catch (err) {
            console.error(err);
            setStatus('Error occurred during processing.');
        } finally {
            setProcessing(false);
        }
    };

    const downloadZip = () => {
        if (zipBlob) {
            saveAs(zipBlob, 'processed_images.zip');
        }
    };

    return (
        <div className="batch-runner">
            <div className="batch-header">
                <h3>Batch Processing</h3>
                <span className="file-count">{files.length} files selected</span>
            </div>

            <div className="batch-options">
                <div className="option-group">
                    <label>Output Destination:</label>
                    <button className={`btn ${outputHandle ? 'btn-success' : 'btn-secondary'}`} onClick={handleSelectFolder}>
                        <FolderOpen size={16} style={{ marginRight: '8px' }} />
                        {outputHandle ? 'Folder Selected' : 'Select Output Folder (Optional)'}
                    </button>
                    {outputHandle && <span className="helper-text">Files will be saved directly.</span>}
                </div>
            </div>

            <div className="batch-controls">
                {!processing && !zipBlob && (
                    <button className="btn btn-primary" onClick={runBatch} disabled={files.length === 0}>
                        <Play size={16} style={{ marginRight: '8px' }} />
                        Run Batch
                    </button>
                )}

                {processing && (
                    <div className="processing-state">
                        <Loader2 className="animate-spin" size={20} />
                        <span>{status}</span>
                    </div>
                )}

                {zipBlob && (
                    <button className="btn btn-success" onClick={downloadZip}>
                        <Download size={16} style={{ marginRight: '8px' }} />
                        Download ZIP
                    </button>
                )}
            </div>

            {(processing || zipBlob) && (
                <div className="progress-bar-container">
                    <div
                        className="progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            <style>{`
        .batch-runner {
          padding: var(--spacing-md);
          background: var(--color-bg-secondary);
          border-top: 1px solid var(--color-border);
        }
        .batch-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }
        .batch-header h3 {
          margin: 0;
          font-size: 1rem;
        }
        .file-count {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }
        .batch-options {
            display: flex;
            gap: var(--spacing-lg);
            margin-bottom: var(--spacing-md);
            padding-bottom: var(--spacing-md);
            border-bottom: 1px solid var(--color-border);
        }
        .option-group {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
        }
        .option-group label {
            font-size: 0.8rem;
            color: var(--color-text-secondary);
        }
        .helper-text {
            font-size: 0.75rem;
            color: var(--color-success);
        }
        .batch-controls {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-sm);
        }
        .processing-state {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          color: var(--color-text-accent);
        }
        .progress-bar-container {
          height: 4px;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .progress-bar {
          height: 100%;
          background: var(--color-primary);
          transition: width 0.3s ease;
        }
        .btn-success {
          background-color: var(--color-success);
          color: white;
        }
        .btn-success:hover {
          background-color: #16a34a;
        }
        .btn-secondary {
            background-color: var(--color-bg-tertiary);
            color: var(--color-text-primary);
        }
      `}</style>
        </div>
    );
};

async function saveFile(
    blob: Blob,
    filename: string,
    subfolder: string | undefined,
    outputHandle: FileSystemDirectoryHandle | null,
    zip: JSZip
) {
    const fullPath = subfolder ? `${subfolder}/${filename}` : filename;

    if (outputHandle) {
        try {
            let targetHandle = outputHandle;
            if (subfolder) {
                // Create/Get subfolder
                // @ts-ignore
                targetHandle = await outputHandle.getDirectoryHandle(subfolder, { create: true });
            }

            // @ts-ignore
            const fileHandle = await targetHandle.getFileHandle(filename, { create: true });
            // @ts-ignore
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (e) {
            console.error('Error writing file', e);
            zip.file(fullPath, blob);
        }
    } else {
        zip.file(fullPath, blob);
    }
}
