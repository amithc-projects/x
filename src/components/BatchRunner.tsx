import React, { useState } from 'react';
import { Recipe } from '../core/types';
import { imageProcessor } from '../core/Processor';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Play, Download, Loader2 } from 'lucide-react';

interface BatchRunnerProps {
    files: File[];
    recipe: Recipe;
}

export const BatchRunner: React.FC<BatchRunnerProps> = ({ files, recipe }) => {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [zipBlob, setZipBlob] = useState<Blob | null>(null);
    const [status, setStatus] = useState<string>('');

    const runBatch = async () => {
        if (files.length === 0) return;

        setProcessing(true);
        setProgress(0);
        setZipBlob(null);
        setStatus('Initializing...');

        const zip = new JSZip();
        const total = files.length;

        try {
            for (let i = 0; i < total; i++) {
                const file = files[i];
                setStatus(`Processing ${file.name} (${i + 1}/${total})...`);

                // Load image
                const img = await loadImage(file);

                // Process
                const results = await imageProcessor.process(img, recipe, {
                    originalImage: img,
                    filename: file.name,
                    variables: new Map(),
                });

                // Add to zip
                results.forEach(result => {
                    zip.file(result.filename, result.blob);
                });

                setProgress(((i + 1) / total) * 100);
            }

            setStatus('Generating ZIP file...');
            const content = await zip.generateAsync({ type: 'blob' });
            setZipBlob(content);
            setStatus('Done! Ready to download.');
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
      `}</style>
        </div>
    );
};

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}
