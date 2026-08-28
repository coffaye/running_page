export interface ReportEntry {
  runId: string;
  localDate: string;
  url: string;
  generatedAt?: string;
  engineVersion?: string;
  engineCommit?: string;
  schemaVersion?: string;
  promptVersion?: string;
  rendererVersion?: string;
  model?: string;
  reasoningEffort?: string;
}

export interface ReportManifest {
  schemaVersion: number;
  generatedAt?: string;
  reports: Record<string, ReportEntry>;
}
