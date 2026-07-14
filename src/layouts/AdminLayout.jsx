import { useState } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard,
  Users,
  Package,
  Wallet,
  LogOut,
  Menu,
  ExternalLink,
  ChevronRight,
} from "lucide-react"

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/users", label: "Usuarios", icon: Users },
  { path: "/admin/services", label: "Servicios", icon: Package },
  { path: "/admin/payments", label: "Pagos", icon: Wallet },
]

function SidebarNav() {
  const location = useLocation()

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const isActive =
          item.path === "/admin"
            ? location.pathname === "/admin"
            : location.pathname.startsWith(item.path)
        const Icon = item.icon
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate("/login")
  }

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="p-5 border-b border-border/10">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-accent-foreground">Nilspineda</p>
            <p className="text-[11px] text-sidebar-foreground">Panel Admin</p>
          </div>
        </Link>
      </div>

      <SidebarNav />

      <div className="p-4 border-t border-border/10">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors mb-2"
        >
          <ExternalLink className="w-4 h-4" />
          Ver como cliente
        </Link>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {profile?.name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
              {profile?.name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-sidebar-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col fixed inset-y-0 left-0 z-30 border-r border-border">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-3 left-3 z-40"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-60">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <main className="flex-1 lg:ml-60 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-end gap-4 px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">
                    {profile?.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-4 lg:p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
