import { useState } from "react"
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/context/ThemeContext"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
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
  Wallet,
  LogOut,
  Menu,
  Sun,
  Moon,
  Users,
  Package,
  Home,
} from "lucide-react"

const clienteLinks = [
  { path: "/dashboard", label: "Panel", icon: Home },
  { path: "/payments", label: "Pagos", icon: Wallet },
]

const adminLinks = [
  { path: "/dashboard", label: "Panel", icon: Home },
  { path: "/admin", label: "Admin", icon: LayoutDashboard },
  { path: "/admin/users", label: "Clientes", icon: Users },
  { path: "/admin/services", label: "Servicios", icon: Package },
  { path: "/admin/payments", label: "Pagos", icon: Wallet },
]

function SidebarNav({ onClose }) {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const links = isAdmin ? adminLinks : clienteLinks

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {links.map((link) => {
        const Icon = link.icon
        const isActive = location.pathname === link.path
        return (
          <Link
            key={link.path}
            to={link.path}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function MobileNav() {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const links = isAdmin ? adminLinks : clienteLinks

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex justify-around items-center px-2 py-2 border-t bg-background z-40 safe-area-pb">
      {links.map((link) => {
        const Icon = link.icon
        const isActive = location.pathname === link.path
        return (
          <Link
            key={link.path}
            to={link.path}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{link.label}</span>
          </Link>
        )
      })}
      <button
        onClick={() => { signOut(); navigate("/login") }}
        className="flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-muted-foreground"
      >
        <LogOut className="w-5 h-5" />
        <span className="text-[10px] font-medium">Salir</span>
      </button>
    </nav>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-9 h-9">
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  )
}

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { signOut, profile, isAdmin } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-30 border-r bg-card">
        <div className="p-5 border-b">
          <Link to={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Home className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Nilspineda</p>
              <p className="text-[11px] text-muted-foreground">
                {isAdmin ? "Panel Admin" : "Mi Cuenta"}
              </p>
            </div>
          </Link>
        </div>

        <SidebarNav />

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-3 mb-3">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                {profile?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">
                {profile?.name}
              </p>
              <p className="text-xs truncate text-muted-foreground">
                {profile?.name || "Cliente"}
              </p>
            </div>
          </div>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-muted-foreground hover:text-destructive mt-1"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 min-h-screen pb-16 lg:pb-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:justify-end">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <div className="p-5 border-b">
                <Link to={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Home className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Nilspineda</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isAdmin ? "Panel Admin" : "Mi Cuenta"}
                    </p>
                  </div>
                </Link>
              </div>
              <SidebarNav onClose={() => setMobileMenuOpen(false)} />
              <div className="p-4 border-t mt-auto">
                <div className="flex items-center gap-3 px-3 mb-3">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                      {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{profile?.name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <ThemeToggle />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="flex-1"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Salir
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <ThemeToggle />
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

        <div className="p-4 lg:p-6 flex-1">
          <Outlet />
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
