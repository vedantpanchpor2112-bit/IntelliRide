import { Bell, Bike, Gauge, Map, Moon, Radio, ShieldCheck, Sun, Users } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useEffect, useState, type ReactNode } from 'react';

const navigation = [
  { href: '/', label: 'Track', icon: Map },
  { href: '/speed', label: 'Speed', icon: Gauge },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/contacts', label: 'Contacts', icon: ShieldCheck },
  { href: '/family', label: 'Family', icon: Users },
];

export function AppShell({ children, toast }: { children: ReactNode; toast?: string }) {
  const [location] = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('intelliride-theme') === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    window.localStorage.setItem('intelliride-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <div className="app-root">
      <div className="shell">
        <aside className="desktop-rail">
          <div className="brand-lockup">
            <div className="brand-mark"><Bike size={18} strokeWidth={2.5} /></div>
            <div><div className="brand-name">INTELLIRIDE</div><div className="brand-sub">companion / field mode</div></div>
          </div>
          <nav className="rail-nav" aria-label="Primary navigation">
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item ${location === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase()}`}>
                <Icon className="nav-icon" size={18} /><span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="rail-footer">
            <div className="panel panel-pad">
              <div className="panel-kicker">Helmet link</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12 }}><span className="dot green beacon" />Rider 01 online</div>
              <div className="muted" style={{ fontSize: 10, marginTop: 5 }}>BLE / 82% battery</div>
            </div>
          </div>
        </aside>
        <main className="main-column">
          <header className="topbar">
            <div className="brand-lockup" style={{ display: 'flex' }}>
              <div className="brand-mark"><Bike size={17} strokeWidth={2.5} /></div>
              <div><div className="brand-name">INTELLIRIDE</div><div className="brand-sub">companion / field mode</div></div>
            </div>
            <div className="topbar-actions">
              <span className="status-pill green"><span className="dot" />Live link</span>
              <button className="icon-btn" onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={darkMode} data-testid="button-theme-toggle">
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button className="icon-btn" aria-label="Device status" data-testid="button-device-status"><Radio size={16} /></button>
            </div>
          </header>
          {children}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-item ${location === href ? 'active' : ''}`} data-testid={`link-mobile-nav-${label.toLowerCase()}`}>
            <Icon className="nav-icon" size={18} /><span>{label}</span>
          </Link>
        ))}
      </nav>
      {toast ? <div className="toast" role="status" data-testid="status-toast">{toast}</div> : null}
    </div>
  );
}

export function PageHeader({ eyebrow, title, lede, action }: { eyebrow: string; title: string; lede?: string; action?: ReactNode }) {
  return <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end' }}>
    <div><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1>{lede ? <p className="page-lede">{lede}</p> : null}</div>
    {action}
  </div>;
}