import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { TopBar } from './TopBar';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)]">
      {/* Desktop Sidebar */}
      {isDesktop && <Sidebar />}

      {/* Mobile Top Bar */}
      {!isDesktop && <TopBar />}

      {/* Main Content */}
      <main
        className={
          isDesktop
            ? 'ml-[240px] min-h-[100dvh]'
            : 'min-h-[100dvh] pb-[80px] pt-[56px]'
        }
      >
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      {!isDesktop && <MobileNav />}
    </div>
  );
}
