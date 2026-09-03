export interface ReportEntry {
  runId: string;
  localDate: string;
  url: string;
  generatedAt?: string;
  hubVersion?: string;
  engineVersion?: string;
  engineCommit?: string;
  schemaVersion?: string;
  promptVersion?: string;
  rendererVersion?: string;
  model?: string;
  reasoningEffort?: string;
  dataSource?: string;
  skillContractVersion?: string;
  skillSourceCommit?: string;
  collectorContractVersion?: string;
}

export interface ReportManifest {
  schemaVersion: number;
  generatedAt?: string;
  reports: Record<string, ReportEntry>;
}
