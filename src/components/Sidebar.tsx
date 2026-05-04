import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  School, 
  UserPlus, 
  FileText, 
  LogOut,
  Landmark,
  DoorOpen,
  Book
} from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { cn } from '@/src/lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Landmark, label: 'Igrejas', path: '/churches', roles: ['ADMIN_MASTER'] },
  { icon: Landmark, label: 'Minha Igreja', path: '/church', roles: ['ADMIN_APP', 'SECRETARIO'] },
  { icon: DoorOpen, label: 'Salas', path: '/rooms' },
  { icon: Users, label: 'Alunos', path: '/students' },
  { icon: FileText, label: 'Relatórios', path: '/reports' },
  { icon: UserPlus, label: 'Usuários', path: '/users', roles: ['ADMIN_MASTER', 'ADMIN_APP'] },
];

interface SidebarProps {
  isCollapsed?: boolean;
}

export function Sidebar({ isCollapsed = false }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const logo = "https://qaccpjtjwuxhczkyafuo.supabase.co/storage/v1/object/public/Tecnecio%20LOGO/EBD%20Digital.png";

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(profile?.role || '');
  });

  return (
    <aside className={cn(
      "bg-brand-800 border-r border-brand-900 flex flex-col h-full transition-all duration-300 shadow-xl",
      isCollapsed ? "w-[80px]" : "w-[240px]"
    )}>
      <div className={cn(
        "flex items-center gap-3 px-4 py-6 border-b border-brand-900",
        isCollapsed && "justify-center px-0"
      )}>
        <div className="flex items-center justify-center">
          <img
            src={logo}
            className={cn(
              "object-contain transition-all bg-white rounded-xl p-1 shadow-md",
              isCollapsed ? "w-10 h-10" : "w-16 h-16"
            )}
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <React.Fragment key={item.path}>
              <Link
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-xl transition-all duration-200 group",
                  isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                  isActive 
                    ? "bg-brand-700 text-white shadow-lg shadow-brand-700/20" 
                    : "text-brand-100/70 hover:bg-brand-700 hover:text-white"
                )}
              >
                <item.icon size={25} className={cn(
                  "transition-colors shrink-0",
                  isActive ? "text-white" : "text-brand-100/70 group-hover:text-white"
                )} />
                {!isCollapsed && <span className="font-medium text-sm overflow-hidden whitespace-nowrap">{item.label}</span>}
              </Link>
              
              {item.label === 'Relatórios' && (
                <button
                  onClick={handleSignOut}
                  title={isCollapsed ? "Sair" : undefined}
                  className={cn(
                    "w-full flex items-center rounded-xl transition-all duration-200 group",
                    isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                    "text-brand-100/70 hover:bg-red-500/10 hover:text-red-400"
                  )}
                >
                  <LogOut size={25} className="group-hover:text-red-400 transition-colors shrink-0" />
                  {!isCollapsed && <span className="font-medium text-sm">Sair</span>}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="p-4 border-t border-brand-900 opacity-0 pointer-events-none h-0 overflow-hidden">
        {/* Hidden but kept for layout consistency if needed, or just remove if safe */}
      </div>
    </aside>
  );
}
