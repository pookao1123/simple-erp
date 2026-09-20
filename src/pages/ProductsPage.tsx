import { useEffect, useState } from 'react';
import Badge from '../components/Badge';
import Table from '../components/Table';
import type { Column } from '../components/Table';
import { apiProducts, Product } from '../lib/api';

function fmtPrice(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

const columns: Column<Product>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  {
    key: 'price',
    header: 'Price',
    render: (r) => fmtPrice(r.price),
  },
  {
    key: 'category',
    header: 'Category',
    render: (r) => r.category ? <Badge variant="default">{r.category}</Badge> : <span className="text-fg-muted">—</span>,
  },
  {
    key: 'active',
    header: 'Active',
    render: (r) => r.active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>,
  },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await apiProducts.list({ limit: 100, active: true });
        if (!cancelled) setProducts(data);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="text-fg-muted">Loading products…</div>;
  if (error) return <div className="text-red-600">Failed to load: {error}</div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Products</h1>
      <Table columns={columns} rows={products} rowKey={(r) => r.id} emptyMessage="No products found" />
    </div>
  );
}
