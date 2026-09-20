import Badge from '../components/Badge';
import Table from '../components/Table';
import type { Column } from '../components/Table';

interface Product {
  id: string;
  name: string;
  price: string;
  category: 'Electronics' | 'Office' | 'Services';
  stock: number | null;
}

const categoryVariant = {
  Electronics: 'info',
  Office: 'default',
  Services: 'success',
} as const;

function StockBadge({ stock }: { stock: number | null }) {
  if (stock === null) return <span className="text-fg-muted">-</span>;
  if (stock === 0) return <Badge variant="danger">Out of stock</Badge>;
  if (stock < 30) return <Badge variant="warning">Low: {stock}</Badge>;
  return <span>{stock}</span>;
}

const columns: Column<Product>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'price', header: 'Price' },
  {
    key: 'category',
    header: 'Category',
    render: (r) => <Badge variant={categoryVariant[r.category]}>{r.category}</Badge>,
  },
  { key: 'stock', header: 'Stock', render: (r) => <StockBadge stock={r.stock} /> },
];

const rows: Product[] = [
  { id: 'P-001', name: 'Laptop Pro 14', price: '$1,299.00', category: 'Electronics', stock: 35 },
  { id: 'P-002', name: 'Wireless Mouse', price: '$29.99', category: 'Electronics', stock: 210 },
  { id: 'P-003', name: 'USB-C Hub', price: '$49.00', category: 'Electronics', stock: 120 },
  { id: 'P-004', name: 'Standing Desk', price: '$449.00', category: 'Office', stock: 18 },
  { id: 'P-005', name: 'Ergonomic Chair', price: '$329.50', category: 'Office', stock: 27 },
  { id: 'P-006', name: 'A4 Paper (500 sheets)', price: '$6.75', category: 'Office', stock: 940 },
  { id: 'P-007', name: 'IT Support Plan', price: '$99.00', category: 'Services', stock: null },
  { id: 'P-008', name: 'Onboarding Workshop', price: '$750.00', category: 'Services', stock: null },
  { id: 'P-009', name: 'Monitor 27"', price: '$279.00', category: 'Electronics', stock: 64 },
  { id: 'P-010', name: 'Whiteboard Markers', price: '$12.40', category: 'Office', stock: 300 },
];

export default function ProductsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Products</h1>
      <Table columns={columns} rows={rows} rowKey={(r) => r.id} />
    </div>
  );
}
