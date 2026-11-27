import { Children, Fragment, cloneElement, isValidElement, type ReactNode, type TableHTMLAttributes } from 'react';
import { RowActionsMenu } from './RowActionsMenu';

function readText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return Children.toArray(node.props.children).map(readText).join('');
}

function findHeaderRow(node: ReactNode): React.ReactElement | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (child.type === 'tr') return child;
    const nested = findHeaderRow(child.props.children);
    if (nested) return nested;
  }
  return null;
}

function enhanceRows(node: ReactNode, actionIndex: number): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return child;
    if (child.type === 'tr') {
      let cellIndex = 0;
      const cells = Children.map(child.props.children, (cell) => {
        if (!isValidElement<{ children?: ReactNode }>(cell) || cell.type !== 'td') return cell;
        const currentIndex = cellIndex++;
        if (currentIndex !== actionIndex) return cell;
        const alreadyHasMenu = Children.toArray(cell.props.children).some(
          (content) => isValidElement(content) && content.type === RowActionsMenu
        );
        if (alreadyHasMenu) return cell;
        return cloneElement(cell, {
          children: <RowActionsMenu>{cell.props.children}</RowActionsMenu>,
        });
      });
      return cloneElement(child, { children: cells });
    }
    if (child.type === Fragment) {
      return cloneElement(child, { children: enhanceRows(child.props.children, actionIndex) });
    }
    return child;
  });
}

/** Shared table root for HRMS data grids and specialized table views. */
export function HRMSTable({ className = '', ...props }: TableHTMLAttributes<HTMLTableElement>) {
  const headerRow = findHeaderRow(props.children);
  const headerCells = headerRow ? Children.toArray(headerRow.props.children) : [];
  const actionIndex = headerCells.findIndex(
    (cell) => isValidElement<{ children?: ReactNode }>(cell) && /\bactions?\b/i.test(readText(cell.props.children))
  );
  const children = actionIndex < 0
    ? props.children
    : Children.map(props.children, (child) => {
        if (!isValidElement<{ children?: ReactNode }>(child)) return child;
        if (child.type === 'tbody') {
          return cloneElement(child, { children: enhanceRows(child.props.children, actionIndex) });
        }
        return child;
      });

  return <table {...props} className={`hrms-table min-w-full ${className}`}>{children}</table>;
}
