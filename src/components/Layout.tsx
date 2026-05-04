import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/src/contexts/AuthContext';
import { cn } from '@/src/lib/utils';
import { School } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isMobile, setIsMobile] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { profile } = useAuth();

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on route change on mobile
  React.useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  if (!profile) return <>{children}</>;

  const isDashboard = location.pathname === '/dashboard';
  const isCollapsed = isMobile || !isDashboard;

  return (
    <div className="flex min-h-screen bg-white">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={cn(
        "transition-all duration-300 z-40",
        isMobile 
          ? cn("fixed inset-y-0 left-0 transform", isSidebarOpen ? "translate-x-0" : "-translate-x-full")
          : ""
      )}>
        <Sidebar isCollapsed={isCollapsed && !isMobile} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        {isMobile && (
          <header className="h-14 bg-white border-b border-brand-200 flex items-center px-4 sticky top-0 z-20">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-black/40 hover:bg-brand-50 rounded-lg transition-colors"
            >
              <img
                src="https://qaccpjtjwuxhczkyafuo.supabase.co/storage/v1/object/public/Tecnecio%20LOGO/EBD%20Digital.png"
                alt="TC EBD"
                className="h-9 w-auto object-contain"
              />
            </button>
          </header>
        )}

        <main className="flex-1 transition-all duration-300 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
