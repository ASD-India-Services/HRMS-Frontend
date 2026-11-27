import { Children, Fragment, cloneElement, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface RowActionsMenuProps {
  children: ReactNode;
}

function getActionItems(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [child];
    if (child.type === Fragment || child.type === 'div' || child.type === 'span') {
      return getActionItems(child.props.children);
    }

    const props = child.props as Record<string, unknown>;
    const label = String(props.label ?? props['aria-label'] ?? props.title ?? '');
    const componentName = typeof child.type === 'function' ? child.type.name : '';
    const isDanger = /delete|remove|reject|cancel/i.test(`${label} ${componentName}`) || props.color === 'error';
    const className = [
      '!h-12 !w-full !justify-start !rounded-none !border-0 !bg-transparent !px-4 !text-left !shadow-none hover:!bg-surface-neutral',
      isDanger ? '!text-error-main hover:!text-error-dark' : '!text-ink-primary',
      typeof props.className === 'string' ? props.className : '',
    ].join(' ');
    const action = cloneElement(child as React.ReactElement<{ className?: string; children?: ReactNode }>, {
      className,
      ...(props.icon && !props.children && label ? { children: label } : {}),
    });

    // Icon-only actions need a visible label inside the menu.
    return [action];
  });
}

/** Compact per-row menu that reuses the row's existing action controls. */
export function RowActionsMenu({ children }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const actionItems = getActionItems(children).filter((item) => {
    if (!isValidElement(item)) return false;
    const props = item.props as Record<string, unknown>;
    return typeof props.onClick === 'function' || typeof props.href === 'string' || typeof props.to === 'string';
  });

  if (actionItems.length === 0) return <>{children}</>;

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          if (open) {
            setOpen(false);
            return;
          }
          const bounds = event.currentTarget.getBoundingClientRect();
          setMenuPosition({ top: bounds.bottom + 4, left: bounds.right });
          setOpen(true);
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary transition-colors hover:bg-surface-neutral hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-main"
      >
        <span aria-hidden="true" className="flex flex-col items-center justify-center gap-[3px]">
          <span className="h-[3px] w-[3px] rounded-full bg-current" />
          <span className="h-[3px] w-[3px] rounded-full bg-current" />
          <span className="h-[3px] w-[3px] rounded-full bg-current" />
        </span>
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, transform: 'translateX(-100%)' }}
          className="z-[1000] flex min-w-[180px] flex-col overflow-hidden rounded-xl border border-grey-300 bg-surface-paper py-1 shadow-card"
          onClick={(event) => {
            event.stopPropagation();
            if ((event.target as HTMLElement).closest('button, a')) setOpen(false);
          }}
        >
          {actionItems.map((action, index) => (
            <div key={index} role="none" className={index < actionItems.length - 1 ? 'border-b border-grey-300' : ''}>
              {action}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
