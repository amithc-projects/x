import React, { useState, useEffect } from 'react';
import { loadImage } from './core/InputLoaders';
import { Layout } from './components/Layout';
import { LibrarySidebar } from './components/LibrarySidebar';
import { RecipeEditor } from './components/RecipeEditor';
import { TransformationControls } from './components/TransformationControls';
import { PreviewCanvas } from './components/PreviewCanvas';
import { BatchRunner } from './components/BatchRunner';
import { Recipe, RecipeStep } from './core/types';
import { registerAllTransformations } from './core/transformations';
import { transformationRegistry } from './core/Registry';
import { Upload, FolderInput } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';

// Register transformations
registerAllTransformations();

function App() {
  const [recipe, setRecipe] = useState<Recipe>({
    id: 'default',
    name: 'My Recipe',
    steps: [],
  });
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [previewStepId, setPreviewStepId] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);

  const handleAddStep = (transformationId: string) => {
    const def = transformationRegistry.get(transformationId);
    if (!def) return;

    const newStep: RecipeStep = {
      id: crypto.randomUUID(),
      transformationId,
      params: def.params.reduce((acc, param) => {
        acc[param.name] = param.defaultValue;
        return acc;
      }, {} as any),
    };

    setRecipe((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
    // Automatically select new step
    setSelectedStepId(newStep.id);
    // Reset preview mode to see full result including new step
    setPreviewStepId(null);
  };

  const handleRemoveStep = (stepId: string) => {
    setRecipe((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== stepId),
    }));
    if (selectedStepId === stepId) setSelectedStepId(null);
    if (previewStepId === stepId) setPreviewStepId(null);
  };

  const handleReorderSteps = (startIndex: number, endIndex: number) => {
    setRecipe((prev) => ({
      ...prev,
      steps: arrayMove(prev.steps, startIndex, endIndex),
    }));
  };

  const handleUpdateParams = (params: any) => {
    if (!selectedStepId) return;
    setRecipe((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === selectedStepId ? { ...s, params } : s
      ),
    }));
  };

  const handleUpdateCondition = (condition: any) => {
    if (!selectedStepId) return;
    setRecipe((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === selectedStepId ? { ...s, condition } : s
      ),
    }));
  };

  // Toggle Disable/Enable
  const handleToggleStep = (stepId: string) => {
    setRecipe((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId ? { ...s, disabled: !s.disabled } : s
      )
    }));
  };

  // Toggle Partial Preview
  const handlePreviewStep = (stepId: string) => {
    // If clicking the same step that is already previewing, turn off preview mode (show all)
    if (previewStepId === stepId) {
      setPreviewStepId(null);
    } else {
      setPreviewStepId(stepId);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const img = await loadImage(file);
        setOriginalImage(img);
      } catch (e) {
        console.error("Failed to load image", e);
        alert("Failed to load image. It might be an unsupported format.");
      }
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Update filter to include heic
    const imageFiles = files.filter(f => f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.heic'));
    setBatchFiles(imageFiles);

    if (imageFiles.length > 0 && !originalImage) {
      try {
        const img = await loadImage(imageFiles[0]);
        setOriginalImage(img);
      } catch (e) {
        console.error("Failed to load first image", e);
      }
    }
  };

  const handleSaveRecipe = () => {
    const json = JSON.stringify(recipe, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipe.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadRecipe = (newRecipe: Recipe) => {
    setRecipe(newRecipe);
    setSelectedStepId(null);
    setPreviewStepId(null);
  };

  const selectedStep = recipe.steps.find((s) => s.id === selectedStepId) || null;

  // Calculate the index to stop at.
  // If previewStepId is set, stop there. Otherwise undefined (run all).
  const previewStopIndex = previewStepId
    ? recipe.steps.findIndex(s => s.id === previewStepId)
    : undefined;

  return (
    <Layout>
      <LibrarySidebar onAddStep={handleAddStep} />
      <RecipeEditor
        recipe={recipe}
        onRemoveStep={handleRemoveStep}
        onUpdateStep={handleUpdateParams}
        onReorderSteps={handleReorderSteps}
        selectedStepId={selectedStepId}
        onSelectStep={setSelectedStepId}
        onSaveRecipe={handleSaveRecipe}
        onLoadRecipe={handleLoadRecipe}
        // New Props
        previewStepId={previewStepId}
        onPreviewStep={handlePreviewStep}
        onToggleStep={handleToggleStep}
      />
      <div className="main-area">
        <div className="toolbar">
          <label className="btn btn-primary">
            <Upload size={16} style={{ marginRight: '8px' }} />
            Load Image
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </label>
          <label className="btn btn-primary" style={{ marginLeft: '8px' }}>
            <FolderInput size={16} style={{ marginRight: '8px' }} />
            Load Folder
            <input
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              onChange={handleFolderUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        <PreviewCanvas
          originalImage={originalImage}
          recipe={recipe}
          stopAfterStepIndex={previewStopIndex}
        />
        {batchFiles.length > 0 && (
          <BatchRunner files={batchFiles} recipe={recipe} />
        )}
      </div>
      <TransformationControls
        step={selectedStep}
        onUpdateParams={handleUpdateParams}
        onUpdateCondition={handleUpdateCondition}
      />
      <style>{`
        .main-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .toolbar {
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          gap: var(--spacing-md);
        }
      `}</style>
    </Layout>
  );
}

export default App;