import Table from '../components/Table';
import type { Column } from '../components/Table';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created: string;
}

const columns: Column<Customer>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'created', header: 'Created' },
];

const rows: Customer[] = [
  { id: 'C-001', name: 'Acme Corp', email: 'billing@acme.example', phone: '555-0101', created: '2026-01-10' },
  { id: 'C-002', name: 'Globex Ltd', email: 'ap@globex.example', phone: '555-0102', created: '2026-02-14' },
  { id: 'C-003', name: 'Initech', email: 'finance@initech.example', phone: '555-0103', created: '2026-03-22' },
  { id: 'C-004', name: 'Umbrella Inc', email: 'accounts@umbrella.example', phone: '555-0104', created: '2026-04-05' },
  { id: 'C-005', name: 'Stark Industries', email: 'pay@stark.example', phone: '555-0105', created: '2026-05-18' },
  { id: 'C-006', name: 'Wayne Enterprises', email: 'ap@wayne.example', phone: '555-0106', created: '2026-06-27' },
  { id: 'C-007', name: 'Hooli', email: 'billing@hooli.example', phone: '555-0107', created: '2026-07-30' },
  { id: 'C-008', name: 'Pied Piper', email: 'finance@piedpiper.example', phone: '555-0108', created: '2026-08-19' },
];

export default function CustomersPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Customers</h1>
      <Table columns={columns} rows={rows} rowKey={(r) => r.id} />
    </div>
  );
}
