export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-xl font-bold text-slate-900">Simple ERP</div>
            <ul className="flex space-x-4">
              <li>
                <a href="#" className="text-slate-600 hover:text-slate-900">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 hover:text-slate-900">
                  Settings
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Simple ERP</h1>
        <p className="text-lg text-slate-600">
          Welcome to your enterprise resource planning system.
        </p>
      </main>
    </div>
  );
}
