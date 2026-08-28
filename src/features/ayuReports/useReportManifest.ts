import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchReportManifest } from './manifest.ts';
import type { ReportEntry } from './types.ts';

interface ReportManifestState {
  reports: Map<string, ReportEntry>;
  status: 'loading' | 'ready' | 'empty';
}

export const useReportManifest = (): ReportManifestState => {
  const timestampRef = useRef(Date.now());
  const [reports, setReports] = useState<Map<string, ReportEntry>>(
    () => new Map()
  );
  const [status, setStatus] =
    useState<ReportManifestState['status']>('loading');

  useEffect(() => {
    const controller = new AbortController();
    fetchReportManifest(timestampRef.current, controller.signal)
      .then((manifest) => {
        setReports(new Map(Object.entries(manifest.reports)));
        setStatus(Object.keys(manifest.reports).length ? 'ready' : 'empty');
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn('Ayu report manifest unavailable', error);
          setReports(new Map());
          setStatus('empty');
        }
      });
    return () => controller.abort();
  }, []);

  return useMemo(() => ({ reports, status }), [reports, status]);
};
