import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión · CALTIMER COBROS" },
      { name: "description", content: "Accede a tu panel de cobranza de lotes." },
      { property: "og:title", content: "Iniciar sesión · CALTIMER COBROS" },
      { property: "og:description", content: "Accede a tu panel de cobranza de lotes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard", replace: true });
        else {
          toast.success("Revisa tu correo para confirmar tu cuenta.");
          setMode("login");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo continuar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-navy-gradient p-12 text-primary-foreground lg:flex">
        <div className="font-display text-2xl tracking-wide">CALTIMER <span className="text-gold">COBROS</span></div>
        <div>
          <h2 className="font-display text-5xl leading-tight">Cada cuota,<br />en su lugar.</h2>
          <p className="mt-4 max-w-md text-primary-foreground/70">
            Contratos, iniciales, cuotas y pagos de tus clientes de lotes, en un solo panel.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/50">© {new Date().getFullYear()} Caltimer</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden font-display text-2xl text-primary">CALTIMER <span className="text-gold">COBROS</span></div>
          <div>
            <h1 className="font-display text-3xl text-primary">{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? "Ingresa con tu correo y contraseña." : "Registra tu cuenta de administrador."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Procesando…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground hover:text-primary"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
