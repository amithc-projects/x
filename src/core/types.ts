export type ParameterType = 'text' | 'number' | 'boolean' | 'select' | 'color' | 'range';

export interface ParameterDefinition {
    name: string;
    label: string;
    type: ParameterType;
    defaultValue?: any;
    options?: { label: string; value: any }[];
    min?: number;
    max?: number;
    step?: number;
}

export interface Condition {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
    value: any;
}

export interface TransformationContext {
    originalImage: HTMLImageElement;
    filename: string;
    metadata?: Record<string, any>;
    variables: Map<string, ImageData>;
    outputSubfolder?: string;
}

export interface ProcessResult {
    blob: Blob;
    filename: string;
    aggregationId?: string; // If present, this is an aggregation capture, not a final file
    subfolder?: string;
}

export interface TransformationDefinition {
    id: string;
    name: string;
    description: string;
    params: ParameterDefinition[];
    apply: (
        ctx: CanvasRenderingContext2D,
        params: Record<string, any>,
        context: TransformationContext
    ) => Promise<void> | void;
}

export interface RecipeStep {
    id: string;
    transformationId: string;
    params: Record<string, any>;
    condition?: Condition;
    disabled?: boolean;
}

export interface Recipe {
    id: string;
    name: string;
    steps: RecipeStep[];
}