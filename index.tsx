import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CALTIMER COBROS · Cobranza de lotes en cuotas" },
      { name: "description", content: "Administra clientes, contratos, cuotas y pagos de lotes con saldos automáticos." },
      { property: "og:title", content: "CALTIMER COBROS" },
      { property: "og:description", content: "Administra clientes, contratos, cuotas y pagos de lotes con saldos automáticos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-navy-gradient text-primary-foreground">
      <header className="flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="font-display text-xl tracking-wide">CALTIMER <span className="text-gold">COBROS</span></div>
        <Button asChild variant="secondary" size="sm"><Link to="/auth">Iniciar sesión</Link></Button>
      </header>
      <main className="flex flex-1 items-center px-6 sm:px-12">
        <div className="max-w-2xl py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Cobranza de lotes</p>
          <h1 className="mt-4 font-display text-5xl leading-tight sm:text-6xl">Control claro de cada cuota y cada saldo.</h1>
          <p className="mt-6 text-lg text-primary-foreground/70">
            Clientes, contratos, iniciales, planes de cuotas personalizados, pagos parciales y calendario de cobranza.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8"><Link to="/dashboard">Entrar al panel</Link></Button>
        </div>
      </main>
    </div>
  );
}
