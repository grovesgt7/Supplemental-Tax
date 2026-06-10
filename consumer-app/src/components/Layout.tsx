import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/estimate', label: 'Estimate My Taxes' },
  { to: '/check-bill', label: 'Check a Bill' },
  { to: '/annual', label: 'Annual Bill' },
  { to: '/faq', label: 'FAQ' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
              <span className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
                  />
                </svg>
              </span>
              <span className="text-lg font-bold tracking-tight">
                MyTaxBill<span className="text-brand-600">.guide</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>

          {menuOpen && (
            <nav className="md:hidden pb-3 flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-3.5 py-2.5 rounded-lg text-sm font-semibold ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">{children}</div>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-600">Estimates only.</strong> This tool provides educational estimates for
            California property taxes and is not tax, legal, or financial advice. Actual tax rates vary by tax rate
            area within each county, and actual bills are determined by your county assessor and tax collector. Always
            confirm amounts and due dates with your county.
          </p>
          <p className="text-xs text-gray-400">
            Your privacy matters: everything is calculated in your browser. Nothing you enter is stored or sent
            anywhere.
          </p>
        </div>
      </footer>
    </div>
  );
}
