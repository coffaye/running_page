import { getReportManifestUrl } from './paths.ts';
import type { ReportEntry, ReportManifest } from './types.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRelativeReportUrl = (value: string): boolean =>
  !value.startsWith('/') &&
  !/^[a-z][a-z\d+.-]*:/i.test(value) &&
  !/(^|\/)\.\.(?:\/|$)/.test(value);

const parseEntry = (value: unknown): ReportEntry | null => {
  if (!isRecord(value)) return null;
  if (
    typeof value.runId !== 'string' ||
    value.runId.trim() === '' ||
    typeof value.localDate !== 'string' ||
    typeof value.url !== 'string' ||
    value.url.trim() === '' ||
    !isRelativeReportUrl(value.url.trim())
  ) {
    return null;
  }

  const entry: ReportEntry = {
    runId: value.runId,
    localDate: value.localDate,
    url: value.url.trim(),
  };
  const optionalStringFields = [
    'generatedAt',
    'hubVersion',
    'engineVersion',
    'engineCommit',
    'schemaVersion',
    'promptVersion',
    'rendererVersion',
    'model',
    'reasoningEffort',
    'dataSource',
    'skillContractVersion',
    'skillSourceCommit',
    'collectorContractVersion',
  ] as const;
  for (const field of optionalStringFields) {
    const fieldValue = value[field];
    if (typeof fieldValue === 'string') {
      entry[field] = fieldValue;
    }
  }
  return entry;
};

export const parseReportManifest = (value: unknown): ReportManifest | null => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isRecord(value.reports)
  ) {
    return null;
  }

  const reports: Record<string, ReportEntry> = {};
  for (const [key, rawEntry] of Object.entries(value.reports)) {
    const entry = parseEntry(rawEntry);
    if (!entry || key !== entry.runId) continue;
    reports[key] = entry;
  }

  return {
    schemaVersion: 1,
    generatedAt:
      typeof value.generatedAt === 'string' ? value.generatedAt : undefined,
    reports,
  };
};

export const fetchReportManifest = async (
  cacheBuster: number,
  signal?: AbortSignal
): Promise<ReportManifest> => {
  const url = `${getReportManifestUrl()}?ts=${cacheBuster}`;
  const response = await fetch(url, { cache: 'no-store', signal });
  if (!response.ok) {
    throw new Error(`Report manifest request failed: ${response.status}`);
  }
  const parsed = parseReportManifest(await response.json());
  if (!parsed) {
    throw new Error('Report manifest validation failed');
  }
  return parsed;
};
