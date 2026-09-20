import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Button from '../components/Button';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/invoices', label: 'Invoices' },
  { to: '/customers', label: 'Customers' },
  { to: '/products', label: 'Products' },
  { to: '/settings', label: 'Settings' },
];

const THEME_KEY = 'theme';

function getInitialDark(): boolean {
  return localStorage.getItem(THEME_KEY) === 'dark';
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // tablet collapse
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform dark:border-slate-700 dark:bg-slate-800 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'md:-translate-x-full lg:translate-x-0' : ''}`}
      >
        <div className="flex h-16 items-center px-6 text-xl font-bold">Simple ERP</div>
        <nav className="space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className={collapsed ? 'lg:pl-64' : 'md:pl-64'}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-700 md:hidden"
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="hidden rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-700 md:block lg:hidden"
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Toggle dark mode"
            >
              {dark ? 'Light' : 'Dark'}
            </button>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-sm font-semibold text-slate-700 dark:bg-slate-600 dark:text-slate-200"
              aria-label="User avatar"
            >
              U
            </div>
            <Button variant="ghost" size="sm">
              Logout
            </Button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
