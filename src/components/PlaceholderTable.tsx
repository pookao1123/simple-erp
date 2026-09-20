interface PlaceholderTableProps {
  columns: string[];
  rows: string[][];
}

export default function PlaceholderTable({ columns, rows }: PlaceholderTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-900/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i} className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
