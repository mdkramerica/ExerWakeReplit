import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  BarChart3,
  Settings,
  LogOut,
  Activity,
  FileText,
  AlertTriangle,
  Home,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClinicalLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/clinical/dashboard', icon: Home, roles: ['clinician', 'admin', 'researcher'] },
  { name: 'Patients', href: '/clinical/patients', icon: Users, roles: ['clinician', 'admin'] },
  { name: 'Analytics', href: '/clinical/analytics', icon: BarChart3, roles: ['clinician', 'admin', 'researcher'] },
  { name: 'Assessments', href: '/clinical/assessments', icon: Activity, roles: ['clinician', 'admin'] },
  { name: 'Alerts', href: '/clinical/alerts', icon: AlertTriangle, roles: ['clinician', 'admin'] },
  { name: 'Cohorts', href: '/clinical/cohorts', icon: Database, roles: ['admin'] },
  { name: 'Reports', href: '/clinical/reports', icon: FileText, roles: ['clinician', 'admin', 'researcher'] },
  { name: 'Settings', href: '/clinical/settings', icon: Settings, roles: ['admin'] },
];

export default function ClinicalLayout({ children }: ClinicalLayoutProps) {
  const [location] = useLocation();
  const { user, logout, hasRole } = useAuth();

  if (!user) {
    return null;
  }

  const userInitials = `${user.firstName[0]}${user.lastName[0]}`;
  const filteredNavigation = navigation.filter(item => hasRole(item.roles));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <Activity className="h-8 w-8 text-primary" />
          <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">
            Clinical Dashboard
          </span>
        </div>
        
        <nav className="flex-1 space-y-1 px-4 py-4">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + '/');
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5',
                      isActive ? 'text-primary-foreground' : 'text-gray-500 dark:text-gray-400'
                    )}
                  />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Top header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {navigation.find(item => location.startsWith(item.href))?.name || 'Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="capitalize">{user.role}</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}