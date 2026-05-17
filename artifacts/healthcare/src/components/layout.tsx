import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  Activity,
  Calendar,
  Users,
  Building,
  MessageSquare,
  LogOut,
  Menu,
  Phone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  if (!user) {
    setLocation("/");
    return null;
  }

  const navItems = [
    { title: "Dashboard", href: "/dashboard", icon: Activity },
    { title: "Appointments", href: "/appointments", icon: Calendar },
    { title: "Doctors", href: "/doctors", icon: Users },
    { title: "Patients", href: "/patients", icon: Users },
    { title: "Voice Call", href: "/voice-call", icon: Phone },
    { title: "AI Assistant", href: "/ai-assistant", icon: MessageSquare },
  ];

  if (user.role === "admin") {
    navItems.push({ title: "Tenants", href: "/tenants", icon: Building });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r border-border bg-sidebar">
          <SidebarHeader className="flex h-16 items-center px-4">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Activity className="h-6 w-6" />
              <span>MediFlow</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.href || location.startsWith(item.href + "/")}
                  >
                    <Link href={item.href} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <div className="px-4 py-4">
              <div className="mb-4 flex flex-col space-y-1">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  setLocation("/");
                }}
                className="flex w-full items-center gap-2 rounded-md p-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 bg-background">
          <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-6 lg:hidden">
            <SidebarTrigger />
            <div className="font-semibold text-primary">MediFlow</div>
          </header>
          <div className="h-[calc(100vh-4rem)] lg:h-screen overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
