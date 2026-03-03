export interface PipelineStep {
  id: string;
  operationId: string;
  config: Record<string, string | number | boolean>;
}

export interface Pipeline {
  id: string;
  name: string;
  steps: PipelineStep[];
}

export interface StepResult {
  index: number;
  operationId: string;
  data: import("../types").PipelineData;
  durationMs: number;
}

export interface PipelineResult {
  output: import("../types").PipelineData;
  steps: StepResult[];
  totalMs: number;
}
