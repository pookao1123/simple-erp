import { useEffect, useState } from 'react';
import Card from '../components/Card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { apiDashboard } from '../lib/api';

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

interface KPICard {
  label: string;
  value: string;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPICard[]>([]);
  const [byMonth, setByMonth] = useState<{ month: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [k, m] = await Promise.all([
          apiDashboard.kpis(),
          apiDashboard.invoicesByMonth(6),
        ]);
        if (cancelled) return;
        setKpis([
          { label: 'Revenue (all time)', value: fmtCurrency(k.revenue) },
          { label: 'Revenue this month', value: fmtCurrency(k.revenue_this_month) },
          { label: 'Invoices', value: String(k.invoices_count) },
          { label: 'Customers', value: String(k.customers_count) },
          { label: 'Products', value: String(k.products_count) },
          { label: 'Overdue amount', value: fmtCurrency(k.overdue_amount) },
        ]);
        setByMonth(
          m.data.map((r) => ({
            month: r.month.slice(5), // MM
            revenue: r.total_amount,
          })),
        );
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Card><p className="text-fg-muted">Loading dashboard…</p></Card>;
  if (error) return <Card><p className="text-red-600">Failed to load: {error}</p></Card>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-sm text-fg-muted">{kpi.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{kpi.value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <Card title="Revenue by month (cash basis)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth}>
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [fmtCurrency(Number(v)), 'Revenue']} />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
