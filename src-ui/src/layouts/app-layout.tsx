import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  FileText,
  FileDown,
  User,
  Briefcase,
  Globe,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Menu,
} from 'lucide-react';

const navItems = [
  { to: '/app/documents', label: 'Documents', icon: FileText },
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/job-postings', label: 'Job Postings', icon: Briefcase },
  { to: '/app/sites', label: 'Sites', icon: Globe },
  { to: '/app/resumes', label: 'Resumes', icon: FileDown },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(next)} title={`Theme: ${theme}`}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function SidebarNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="p-6">
        <h1 className="text-lg font-semibold tracking-tight">Vitae Admin</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm text-muted-foreground">
            {user?.email}
          </span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <SidebarNav />
      </div>

      {/* Mobile sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center border-b bg-card p-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarNav />
          </SheetContent>
        </Sheet>
        <h1 className="ml-3 text-lg font-semibold">Vitae Admin</h1>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-16">
        <div className="mx-auto max-w-5xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
