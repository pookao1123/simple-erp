import { useEffect, useState } from 'react';
import Badge from '../components/Badge';
import Table from '../components/Table';
import type { Column } from '../components/Table';
import { apiInvoices, Invoice } from '../lib/api';

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function fmtDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

const statusVariant: Record<Invoice['status'], string> = {
  draft: 'default',
  sent: 'info',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'default',
};

const columns: Column<Invoice>[] = [
  { key: 'invoice_no', header: 'Invoice #' },
  {
    key: 'customer',
    header: 'Customer',
    render: (r) => r.customer?.name ?? '—',
  },
  {
    key: 'total',
    header: 'Amount',
    render: (r) => fmtCurrency(r.total),
  },
  {
    key: 'date',
    header: 'Date',
    render: (r) => fmtDate(r.date),
  },
  {
    key: 'status',
    header: 'Status',
    render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge>,
  },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await apiInvoices.list({ limit: 100 });
        if (!cancelled) setInvoices(data);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="text-fg-muted">Loading invoices…</div>;
  if (error) return <div className="text-red-600">Failed to load: {error}</div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Invoices</h1>
      <Table columns={columns} rows={invoices} rowKey={(r) => r.id} emptyMessage="No invoices found" />
    </div>
  );
}
