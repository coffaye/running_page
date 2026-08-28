import assert from 'node:assert/strict';
import test from 'node:test';
import { parseReportManifest } from '../src/features/ayuReports/manifest.ts';
import {
  getReportTriggerUrl,
  withBaseUrl,
} from '../src/features/ayuReports/paths.ts';

test('path helper supports root and GitHub Pages bases without duplicate slashes', () => {
  assert.equal(
    withBaseUrl('/reports/manifest.json', '/'),
    '/reports/manifest.json'
  );
  assert.equal(
    withBaseUrl('//reports//daily//123.html', '/running_page/'),
    '/running_page/reports/daily/123.html'
  );
});

test('manifest parser validates ready entries and string run_id identity', () => {
  const parsed = parseReportManifest({
    schemaVersion: 1,
    reports: {
      '123': {
        runId: '123',
        localDate: '2026-08-26',
        url: 'reports/daily/2026-08-26/123.html',
      },
      bad: { runId: '456', url: '' },
      absolute: {
        runId: 'absolute',
        localDate: '2026-08-26',
        url: 'https://example.com/report.html',
      },
    },
  });
  assert.deepEqual(Object.keys(parsed?.reports ?? {}), ['123']);
  assert.equal(parsed?.reports['123']?.runId, '123');
  assert.equal(parseReportManifest({ schemaVersion: 2, reports: {} }), null);
  assert.equal(parseReportManifest({ schemaVersion: 1, reports: [] }), null);
  assert.equal(parseReportManifest(null), null);
  assert.deepEqual(
    parseReportManifest({ schemaVersion: 1, reports: {} })?.reports,
    {}
  );
});

test('trigger URL carries only the string run_id and preserves other query params', () => {
  assert.equal(
    getReportTriggerUrl(
      '123',
      'https://ayu-running-hub-staging.example.workers.dev/generate?source=table'
    ),
    'https://ayu-running-hub-staging.example.workers.dev/generate?source=table&run_id=123'
  );
  assert.equal(getReportTriggerUrl('123', ''), null);
  assert.equal(getReportTriggerUrl('123', 'not a url'), null);
});
