import { useState, useEffect, useCallback } from "react"
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import logoSrc from "@/assets/logo.svg"
import logoMarkSrc from "@/assets/logo-mark.svg"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  Wallet,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  Package,
  Home,
  User,
} from "lucide-react"

const clienteLinks = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/payments", label: "Pagos", icon: Wallet },
  { path: "/profile", label: "Mi Perfil", icon: User },
]

const adminLinks = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/admin/users", label: "Clientes", icon: Users },
  { path: "/admin/services", label: "Servicios", icon: Package },
  { path: "/admin/payments", label: "Pagos", icon: Wallet },
]

function SidebarNav({ collapsed, onClose }) {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const links = isAdmin ? adminLinks : clienteLinks

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {links.map((link) => {
        const Icon = link.icon
        const isActive = location.pathname === link.path

        if (collapsed) {
          return (
            <Tooltip key={link.path} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={link.path}
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-3">
                {link.label}
              </TooltipContent>
            </Tooltip>
          )
        }

        return (
          <Link
            key={link.path}
            to={link.path}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function Sidebar({ collapsed, onToggle, onClose }) {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate("/login")
  }

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className={cn(
        "flex items-center border-b border-border/50 h-16 shrink-0",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        <Link to="/dashboard" className={cn(
          "flex items-center min-w-0",
          collapsed ? "justify-center" : "flex-1 gap-2"
        )}>
          <img
            src={collapsed ? logoMarkSrc : logoSrc}
            alt="Nilspineda"
            className={collapsed ? "w-6 h-6" : "h-6"}
          />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "w-7 h-7 text-sidebar-foreground hover:text-sidebar-accent-foreground",
            collapsed && "w-9 h-9"
          )}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </Button>
      </div>

      <SidebarNav collapsed={collapsed} onClose={onClose} />

      <div className={cn(
        "border-t border-border/50 p-2",
        collapsed && "flex flex-col items-center gap-2"
      )}>
        {collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-10 h-10 rounded-lg p-0">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right">
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                  {profile?.name}
                </p>
                <p className="text-xs text-sidebar-foreground truncate">
                  {isAdmin ? "Admin" : "Cliente"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start text-sidebar-foreground hover:text-destructive px-3"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("dashboard-sidebar-collapsed")
    return saved === "true"
  })
  const [colombiaTime, setColombiaTime] = useState(new Date())
  const navigate = useNavigate()
  const { signOut, profile, isAdmin } = useAuth()

  useEffect(() => {
    localStorage.setItem("dashboard-sidebar-collapsed", collapsed)
  }, [collapsed])

  useEffect(() => {
    const timer = setInterval(() => setColombiaTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate("/login")
  }

  const sidebarWidth = collapsed ? "w-[72px]" : "w-72"
  const sidebarMargin = collapsed ? "ml-[72px]" : "ml-72"

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <TooltipProvider>
        <aside className={cn(
          "hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 border-r border-border/50 transition-all duration-300",
          sidebarWidth
        )}>
          <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
        </aside>
      </TooltipProvider>

      {/* Mobile sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-3 left-3 z-40"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <Sidebar collapsed={false} onToggle={() => {}} onClose={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className={cn(
        "flex-1 min-h-screen flex flex-col transition-all duration-300",
        sidebarMargin
      )}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-end gap-4 h-16 px-6 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">
              {colombiaTime.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="hidden sm:inline">
              {colombiaTime.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-xs text-muted-foreground/60">COL</span>
          </div>
        </header>

        <div className="p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
