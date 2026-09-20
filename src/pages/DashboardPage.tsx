import Card from '../components/Card';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const kpis = [
  { label: 'Revenue', value: '$48,250' },
  { label: 'Invoices', value: '24' },
  { label: 'Customers', value: '18' },
  { label: 'Products', value: '42' },
];

const revenueByMonth = [
  { month: 'Apr', revenue: 6200 },
  { month: 'May', revenue: 7450 },
  { month: 'Jun', revenue: 8100 },
  { month: 'Jul', revenue: 7900 },
  { month: 'Aug', revenue: 9300 },
  { month: 'Sep', revenue: 9300 },
];

const invoicesByStatus = [
  { name: 'Draft', value: 3, color: '#94a3b8' },
  { name: 'Sent', value: 6, color: '#3b82f6' },
  { name: 'Paid', value: 12, color: '#22c55e' },
  { name: 'Overdue', value: 3, color: '#ef4444' },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-sm text-fg-muted">{kpi.label}</p>
            <p className="mt-2 text-3xl font-bold">{kpi.value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Revenue by month">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.3} />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(v: number) => `$${v / 1000}k`} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Invoices by status">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={invoicesByStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                  {invoicesByStatus.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
