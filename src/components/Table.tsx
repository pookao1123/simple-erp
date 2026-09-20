import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

export default function Table<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No data',
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-surface-muted">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`whitespace-nowrap px-4 py-3 text-left font-semibold text-fg-muted ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-fg-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={rowKey(row)} className="transition-colors hover:bg-secondary-soft/50">
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-fg ${col.className ?? ''}`}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
