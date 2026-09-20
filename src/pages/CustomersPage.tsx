import { useEffect, useState } from 'react';
import Table from '../components/Table';
import type { Column } from '../components/Table';
import { apiCustomers, Customer } from '../lib/api';

function fmtDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

const columns: Column<Customer>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  {
    key: 'created_at',
    header: 'Created',
    render: (r) => fmtDate(r.created_at),
  },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await apiCustomers.list({ limit: 100 });
        if (!cancelled) setCustomers(data);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="text-fg-muted">Loading customers…</div>;
  if (error) return <div className="text-red-600">Failed to load: {error}</div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Customers</h1>
      <Table columns={columns} rows={customers} rowKey={(r) => r.id} emptyMessage="No customers found" />
    </div>
  );
}
