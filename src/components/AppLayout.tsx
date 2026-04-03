import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, TrendingUp, HardHat, FileCheck,
  Upload, Mail, Menu, X
} from "lucide-react";
import logoFeldman from "@/assets/logo-feldman.png";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/lancamentos", label: "Lançamentos", icon: FileText },
  { path: "/fluxo-caixa", label: "Fluxo de Caixa", icon: TrendingUp },
  { path: "/mao-de-obra", label: "Mão de Obra", icon: HardHat },
  { path: "/conciliacao", label: "Conciliação", icon: FileCheck },
  { path: "/documentos", label: "Documentos", icon: Upload },
  { path: "/relatorio", label: "Relatório", icon: Mail },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        flex flex-col
      `}>
        <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded flex items-center justify-center">
            <img src={logoFeldman} alt="Feldman Construções" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-primary text-sm leading-tight tracking-wide">FELDMAN</h1>
            <p className="text-[10px] text-sidebar-muted tracking-editorial uppercase">Construções</p>
          </div>
        </div>

        <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-sidebar-border">
          <p className="text-[11px] text-sidebar-muted">Casa São Lourenço</p>
          <p className="text-[10px] text-sidebar-muted/60">André Gabinio • CAU A116190-3</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-md hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            {navItems.find(n => n.path === location.pathname)?.label || "Dashboard"}
          </h2>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
