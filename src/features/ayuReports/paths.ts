import type { ReportEntry } from './types.ts';

let missingTriggerWarningShown = false;

const normalizeBaseUrl = (baseUrl: string): string => {
  const normalized = baseUrl.trim() || '/';
  return `/${normalized.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');
};

export const withBaseUrl = (
  relativePath: string,
  baseUrl: string = import.meta.env.BASE_URL
): string => {
  const base = normalizeBaseUrl(baseUrl);
  const relative = relativePath
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/');
  return `${base}${relative}`;
};

export const getReportManifestUrl = (
  baseUrl: string = import.meta.env.BASE_URL
): string => withBaseUrl('reports/manifest.json', baseUrl);

export const getReportUrl = (
  report: ReportEntry,
  baseUrl: string = import.meta.env.BASE_URL
): string => withBaseUrl(report.url, baseUrl);

/**
 * Build the staging Worker entry URL without sending a request from the row.
 * Keeping this as an anchor target preserves popup permissions on mobile and
 * means an unset trigger can safely remove only the generation action.
 */
export const getReportTriggerUrl = (
  runId: string,
  triggerBaseUrl: string = import.meta.env.VITE_AYU_REPORT_TRIGGER_URL
): string | null => {
  const base = triggerBaseUrl?.trim();
  if (!base) {
    const env = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
    if (env?.DEV && !missingTriggerWarningShown) {
      missingTriggerWarningShown = true;
      console.warn(
        '[Ayu Running] VITE_AYU_REPORT_TRIGGER_URL is not configured; generation actions are hidden.'
      );
    }
    return null;
  }
  try {
    const url = new URL(base);
    url.searchParams.set('run_id', runId);
    return url.toString();
  } catch {
    return null;
  }
};
