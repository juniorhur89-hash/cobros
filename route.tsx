import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, FileText, LayoutDashboard, LogOut, Map, Menu, Users, Wallet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/lotes", label: "Lotes", icon: Map },
  { to: "/contratos", label: "Contratos", icon: FileText },
  { to: "/pagos", label: "Pagos", icon: Wallet },
  { to: "/calendario", label: "Calendario", icon: CalendarDays },
] as const;

function Layout() {
  const { user } = Route.useRouteContext();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-6 py-6 font-display text-xl tracking-wide text-sidebar-accent-foreground">
        CALTIMER <span className="text-sidebar-primary">COBROS</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
          >
            <n.icon className="size-4" /> {n.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="truncate text-xs text-sidebar-foreground/70">{user.email}</div>
        <button onClick={signOut} className="mt-2 flex items-center gap-2 text-sm hover:text-sidebar-primary">
          <LogOut className="size-4" /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>
      <div className={cn("fixed inset-0 z-40 lg:hidden", open ? "block" : "hidden")}>
        <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
        <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
      </div>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
        <div className="font-display text-lg text-primary">CALTIMER <span className="text-gold">COBROS</span></div>
        <button onClick={() => setOpen(!open)} aria-label="Menú">{open ? <X /> : <Menu />}</button>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
