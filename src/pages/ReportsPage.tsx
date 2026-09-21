import { useState } from 'react';
import Card from '../components/Card';

type ReportType = 'tax-summary' | 'revenue' | 'outstanding' | 'customer-balance';

const reportList: { type: ReportType; label: string; description: string }[] = [
  { type: 'tax-summary', label: 'Tax Summary', description: 'VAT/sales tax breakdown by rate' },
  { type: 'revenue', label: 'Revenue Report', description: 'Revenue over time (daily/weekly/monthly)' },
  { type: 'outstanding', label: 'Outstanding Invoices', description: 'Unpaid and overdue invoices' },
  { type: 'customer-balance', label: 'Customer Balance', description: 'Per-customer outstanding balance' },
];

const initialFilters: Record<ReportType, Record<string, string>> = {
  'tax-summary': { start_date: '', end_date: '', tax_rate: '' },
  'revenue': { start_date: '', end_date: '', group_by: 'monthly' },
  'outstanding': { days_overdue: '' },
  'customer-balance': {},
};

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters['tax-summary']);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runReport = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/v1/reports/${activeReport}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (resp.ok) setResult(data);
      else alert(data.error?.message || 'Report failed');
    } catch (e) {
      alert('Failed to run report');
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>

      {!activeReport ? (
        <div className="grid gap-4 md:grid-cols-2">
          {reportList.map((r) => (
            <Card key={r.type} className="cursor-pointer hover:shadow-md transition" onClick={() => { setActiveReport(r.type); setFilters(initialFilters[r.type]); setResult(null); }}>
              <h2 className="text-lg font-semibold">{r.label}</h2>
              <p className="text-sm text-gray-600">{r.description}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{reportList.find(r => r.type === activeReport)?.label}</h2>
            <button onClick={() => setActiveReport(null)} className="text-gray-500 hover:text-gray-700">Cancel</button>
          </div>

          {activeReport === 'tax-summary' && (
            <div className="grid gap-3 mb-4">
              <input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} className="border rounded px-3 py-2" placeholder="Start date" />
              <input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} className="border rounded px-3 py-2" placeholder="End date" />
              <input type="number" value={filters.tax_rate} onChange={(e) => setFilters({ ...filters, tax_rate: e.target.value })} className="border rounded px-3 py-2" placeholder="Tax rate (optional)" />
            </div>
          )}

          {activeReport === 'revenue' && (
            <div className="grid gap-3 mb-4">
              <input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} className="border rounded px-3 py-2" />
              <input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} className="border rounded px-3 py-2" />
              <select value={filters.group_by} onChange={(e) => setFilters({ ...filters, group_by: e.target.value })} className="border rounded px-3 py-2">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          {activeReport === 'outstanding' && (
            <div className="grid gap-3 mb-4">
              <input type="number" value={filters.days_overdue} onChange={(e) => setFilters({ ...filters, days_overdue: e.target.value })} className="border rounded px-3 py-2" placeholder="Min days overdue (optional)" />
            </div>
          )}

          <button onClick={runReport} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
            {loading ? 'Running...' : 'Run Report'}
          </button>

          {result && (
            <div className="mt-6">
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
