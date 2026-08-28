import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { getReportTriggerUrl, getReportUrl } from './paths.ts';
import type { ReportEntry } from './types.ts';
import styles from './style.module.css';

interface ReportActionMenuProps {
  runId: string;
  report?: ReportEntry;
}

interface MenuPosition {
  left: number;
  top: number;
}

const MENU_WIDTH = 144;
const VIEWPORT_GUTTER = 8;

const positionMenu = (button: HTMLButtonElement): MenuPosition => {
  const rect = button.getBoundingClientRect();
  const left = Math.max(
    VIEWPORT_GUTTER,
    Math.min(
      rect.right - MENU_WIDTH,
      window.innerWidth - MENU_WIDTH - VIEWPORT_GUTTER
    )
  );
  const roomBelow = window.innerHeight - rect.bottom;
  const top =
    roomBelow < 72 ? Math.max(VIEWPORT_GUTTER, rect.top - 72) : rect.bottom + 4;
  return { left, top };
};

const ReportActionMenu = ({ runId, report }: ReportActionMenuProps) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `report-menu-${useId().replace(/:/g, '')}`;
  const triggerUrl = getReportTriggerUrl(runId);

  // No report and no configured trigger means there is no safe action to show.
  // In particular, do not render a dead link or a button that appears to work.
  if (!report && !triggerUrl) return null;

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => {
    if (!buttonRef.current) return;
    setPosition(positionMenu(buttonRef.current));
    setOpen((current) => !current);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        close();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        buttonRef.current?.focus();
      }
    };
    const handleViewportChange = () => {
      if (buttonRef.current) setPosition(positionMenu(buttonRef.current));
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [close, open]);

  const stopRowEvent = (event: SyntheticEvent) => event.stopPropagation();
  const menu =
    open && position ? (
      <div
        ref={menuRef}
        id={menuId}
        className={styles.reportMenu}
        role="menu"
        style={{ left: position.left, top: position.top }}
        onPointerDown={stopRowEvent}
        onClick={stopRowEvent}
      >
        {report && (
          <a
            href={getReportUrl(report)}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={(event) => {
              stopRowEvent(event);
              close();
            }}
          >
            查看日报
          </a>
        )}
        {triggerUrl && (
          <a
            href={triggerUrl}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={(event) => {
              stopRowEvent(event);
              close();
            }}
          >
            生成日报
          </a>
        )}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.reportActionButton}
        aria-label="报告操作"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onPointerDown={stopRowEvent}
        onClick={(event) => {
          stopRowEvent(event);
          toggle();
        }}
        onKeyDown={stopRowEvent}
      >
        ⋮
      </button>
      {typeof document !== 'undefined' && menu
        ? createPortal(menu, document.body)
        : null}
    </>
  );
};

export default ReportActionMenu;
