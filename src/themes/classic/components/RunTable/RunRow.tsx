import type { SyntheticEvent } from 'react';
import {
  formatPace,
  titleForRun,
  formatRunTime,
  Activity,
  RunIds,
} from '../../utils/utils';
import { SHOW_ELEVATION_GAIN } from '../../utils/const';
import { M_TO_DIST, M_TO_ELEV } from '../../utils/utils';
import ReportActionMenu from '@/features/ayuReports/ReportActionMenu';
import type { ReportEntry } from '@/features/ayuReports/types';
import styles from './style.module.css';

interface IRunRowProperties {
  elementIndex: number;
  locateActivity: (_runIds: RunIds) => void;
  run: Activity;
  runIndex: number;
  setRunIndex: (_ndex: number) => void;
  report?: ReportEntry;
}

const RunRow = ({
  elementIndex,
  locateActivity,
  run,
  runIndex,
  setRunIndex,
  report,
}: IRunRowProperties) => {
  const distance = (run.distance / M_TO_DIST).toFixed(2);
  const paceParts = run.average_speed ? formatPace(run.average_speed) : null;
  const heartRate = run.average_heartrate;
  const runTime = formatRunTime(run.moving_time);
  const handleClick = () => {
    if (runIndex === elementIndex) {
      setRunIndex(-1);
      locateActivity([]);
      return;
    }
    setRunIndex(elementIndex);
    locateActivity([run.run_id]);
  };
  const stopRowEvent = (event: SyntheticEvent) => event.stopPropagation();

  return (
    <tr
      className={`${styles.runRow} ${runIndex === elementIndex ? styles.selected : ''}`}
      onClick={handleClick}
      tabIndex={0}
      aria-selected={runIndex === elementIndex}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <td>{titleForRun(run)}</td>
      <td>{distance}</td>
      {SHOW_ELEVATION_GAIN && (
        <td>{((run.elevation_gain ?? 0) * M_TO_ELEV).toFixed(1)}</td>
      )}
      <td>{paceParts ?? '—'}</td>
      <td>{heartRate && heartRate.toFixed(0)}</td>
      <td>{runTime}</td>
      <td className={styles.runDate}>{run.start_date_local}</td>
      <td
        className={styles.reportActionCell}
        onPointerDown={stopRowEvent}
        onClick={stopRowEvent}
        onKeyDown={stopRowEvent}
      >
        <ReportActionMenu runId={String(run.run_id)} report={report} />
      </td>
    </tr>
  );
};

export default RunRow;
