import { useEffect, useState } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import type { Column } from '../components/Table';

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface AuditEntry {
  id: string;
  action: string;
  table_name: string;
  record_no?: string;
  user_name: string;
  created_at: string;
}

const columns: Column<AuditEntry>[] = [
  { key: 'action', header: 'Action', render: (row) => <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{row.action}</span> },
  { key: 'table_name', header: 'Table' },
  { key: 'record_no', header: 'Record', render: (row) => row.record_no ?? <span>—</span> },
  { key: 'user_name', header: 'User' },
  { key: 'created_at', header: 'Date', render: (row) => <span>{fmtDate(row.created_at)}</span> },
];

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tableFilter, setTableFilter] = useState('');

  const fetchEntries = async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (tableFilter) params.set('table', tableFilter);
      const res = await fetch(`/api/v1/audit_log/list?${params}`);
      if (!res.ok) throw new Error('Failed to load audit log');
      const data = await res.json();
      setEntries(data.data);
      setTotal(data.total);
    } catch (e) {
      console.error('Failed to load audit log:', e);
    }
  };

  useEffect(() => { fetchEntries(); }, [page, tableFilter]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Audit Log</h1>
      <Card className="mb-4">
        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder="Filter by table name..."
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="border rounded px-3 py-2 flex-1"
          />
          <button onClick={fetchEntries} className="bg-blue-600 text-white px-4 py-2 rounded">
            Filter
          </button>
        </div>
      </Card>
      {entries.length === 0 ? (
        <p className="text-gray-500">No audit entries found.</p>
      ) : (
        <>
          <Table columns={columns} rows={entries} rowKey={(r) => r.id} />
          <div className="mt-4 flex gap-2">
            {[...Array(Math.ceil(total / 20)).keys()].map((i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded ${page === i + 1 ? 'bg-blue-600 text-white' : 'border'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
