import { useState, useEffect, useCallback } from "react"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  LayoutDashboard,
  Users,
  Package,
  Wallet,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
} from "lucide-react"

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/users", label: "Usuarios", icon: Users },
  { path: "/admin/services", label: "Servicios", icon: Package },
  { path: "/admin/payments", label: "Pagos", icon: Wallet },
]

function SidebarNav({ collapsed, onClose }) {
  const location = useLocation()

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navItems.map((item) => {
        const isActive =
          item.path === "/admin"
            ? location.pathname === "/admin"
            : location.pathname.startsWith(item.path)
        const Icon = item.icon

        if (collapsed) {
          return (
            <Tooltip key={item.path} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={item.path}
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
                {item.label}
              </TooltipContent>
            </Tooltip>
          )
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function Sidebar({ collapsed, onToggle, onClose }) {
  const { profile, signOut } = useAuth()
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
        {!collapsed && (
          <Link to="/admin" className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-sidebar-accent-foreground truncate">
              Nilspineda
            </span>
          </Link>
        )}
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
          <>
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>Ver como cliente</span>
            </Link>
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Avatar className="w-7 h-7 shrink-0">
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
                className="w-7 h-7 text-sidebar-foreground hover:text-destructive shrink-0"
                onClick={handleSignOut}
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    return saved === "true"
  })
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed)
  }, [collapsed])

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
      <aside className={cn(
        "hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 border-r border-border/50 transition-all duration-300",
        sidebarWidth
      )}>
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
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
        <SheetContent side="left" className="p-0 w-72">
          <Sidebar collapsed={false} onToggle={() => {}} onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className={cn(
        "flex-1 min-h-screen flex flex-col transition-all duration-300",
        sidebarMargin
      )}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-end gap-4 h-16 px-6 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-8 px-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
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

        <div className="p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
