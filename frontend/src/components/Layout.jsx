import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, TrendingDown, Receipt, HandCoins, Target,
  BarChart3, Rocket, CheckSquare, Calendar, FileText, Bell, FileSpreadsheet,
  Settings, LogOut, Menu, X, Moon, Sun, Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import api from "@/lib/api";
import { MONTHS, brl } from "@/lib/format";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/entradas", label: "Entradas", icon: TrendingUp },
  { to: "/saidas", label: "Saídas", icon: TrendingDown },
  { to: "/contas-pagar", label: "Contas a Pagar", icon: Receipt },
  { to: "/contas-receber", label: "Contas a Receber", icon: HandCoins },
  { to: "/planejamento", label: "Planejamento", icon: Target },
  { to: "/graficos", label: "Gráficos", icon: BarChart3 },
  { to: "/gerar-renda", label: "Gerar Renda", icon: Rocket },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { to: "/calendario", label: "Calendário", icon: Calendar },
  { to: "/notas", label: "Notas", icon: FileText },
  { to: "/lembretes", label: "Lembretes", icon: Bell },
  { to: "/relatorios", label: "Relatórios", icon: FileSpreadsheet },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

const HEALTH = {
  positive: { dot: "bg-emerald-500", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  warning: { dot: "bg-amber-500", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  critical: { dot: "bg-rose-500", cls: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { month, setMonth, year, setYear, person, setPerson, refreshKey } = useApp();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    api.get("/dashboard", { params: { person, year, month } }).then((r) => setHealth(r.data)).catch(() => {});
    api.get("/alerts").then((r) => setAlerts(r.data)).catch(() => {});
  }, [person, year, month, refreshKey]);

  useEffect(() => setOpen(false), [location.pathname]);

  const years = [year - 1, year, year + 1];
  const h = health ? HEALTH[health.health] : null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`fixed z-50 inset-y-0 left-0 w-64 bg-[#0D131F] text-slate-300 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center gap-2 px-6 border-b border-white/10">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-heading font-bold text-white text-sm leading-tight">Finanças</p>
            <p className="text-[11px] text-slate-400 leading-tight">Painel do Casal</p>
          </div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase().replace(/ /g, "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-emerald-500 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        <header className="h-16 sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md flex items-center gap-3 px-4 sm:px-6">
          <button className="lg:hidden text-foreground" data-testid="menu-toggle" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[130px] h-9" data-testid="month-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[92px] h-9" data-testid="year-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={person} onValueChange={setPerson}>
            <SelectTrigger className="w-[140px] h-9 hidden sm:flex" data-testid="person-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="eu">Eu</SelectItem>
              <SelectItem value="esposa">Minha Esposa</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            {h && (
              <span
                data-testid="health-pill"
                className={`hidden md:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${h.cls}`}
              >
                <span className={`h-2 w-2 rounded-full ${h.dot}`} />
                {health.health === "positive" ? "Saudável" : health.health === "warning" ? "Atenção" : "Déficit"}
              </span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative h-9 w-9" data-testid="notifications-btn">
                  <Bell className="h-4 w-4" />
                  {alerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">
                      {alerts.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Alertas Financeiros</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {alerts.length === 0 && <div className="px-2 py-4 text-sm text-muted-foreground text-center">Nenhum alerta no momento.</div>}
                {alerts.slice(0, 12).map((a, i) => (
                  <div key={i} className="px-2 py-2 text-sm flex gap-2 items-start">
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${a.level === "critical" ? "bg-rose-500" : a.level === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                    <span className="text-foreground">{a.msg}</span>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="icon" className="h-9 w-9" data-testid="theme-toggle" onClick={() => setDark((d) => !d)}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2" data-testid="user-menu">
                  <div className="h-7 w-7 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-semibold">
                    {(user?.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-sm max-w-[120px] truncate">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/configuracoes")} data-testid="menu-settings">
                  <Settings className="h-4 w-4 mr-2" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} data-testid="logout-btn">
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
