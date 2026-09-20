import Badge from '../components/Badge';
import Table from '../components/Table';
import type { Column } from '../components/Table';

type Status = 'Paid' | 'Sent' | 'Overdue' | 'Draft';

interface Invoice {
  id: string;
  customer: string;
  amount: string;
  date: string;
  status: Status;
}

const statusVariant = {
  Paid: 'success',
  Sent: 'info',
  Overdue: 'danger',
  Draft: 'default',
} as const;

const columns: Column<Invoice>[] = [
  { key: 'id', header: 'ID' },
  { key: 'customer', header: 'Customer' },
  { key: 'amount', header: 'Amount' },
  { key: 'date', header: 'Date' },
  {
    key: 'status',
    header: 'Status',
    render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge>,
  },
];

const rows: Invoice[] = [
  { id: 'INV-001', customer: 'Acme Corp', amount: '$1,250.00', date: '2026-08-02', status: 'Paid' },
  { id: 'INV-002', customer: 'Globex Ltd', amount: '$850.50', date: '2026-08-09', status: 'Paid' },
  { id: 'INV-003', customer: 'Initech', amount: '$2,430.00', date: '2026-08-14', status: 'Overdue' },
  { id: 'INV-004', customer: 'Umbrella Inc', amount: '$5,780.00', date: '2026-08-21', status: 'Paid' },
  { id: 'INV-005', customer: 'Stark Industries', amount: '$12,400.00', date: '2026-09-01', status: 'Sent' },
  { id: 'INV-006', customer: 'Wayne Enterprises', amount: '$3,150.75', date: '2026-09-05', status: 'Sent' },
  { id: 'INV-007', customer: 'Hooli', amount: '$975.00', date: '2026-09-10', status: 'Draft' },
  { id: 'INV-008', customer: 'Soylent Co', amount: '$4,620.00', date: '2026-09-12', status: 'Overdue' },
  { id: 'INV-009', customer: 'Vandelay Industries', amount: '$2,090.25', date: '2026-09-15', status: 'Draft' },
  { id: 'INV-010', customer: 'Pied Piper', amount: '$7,300.00', date: '2026-09-18', status: 'Sent' },
];

export default function InvoicesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Invoices</h1>
      <Table columns={columns} rows={rows} rowKey={(r) => r.id} />
    </div>
  );
}
