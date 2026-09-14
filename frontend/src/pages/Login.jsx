import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Loader2 } from "lucide-react";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "casal@financas.com", password: "familia123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0B0F17]">
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-[#0D131F] to-[#0f2e24] relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <span className="font-heading font-bold text-white text-xl">Finanças do Casal</span>
        </div>
        <div className="relative z-10">
          <h1 className="font-heading text-4xl xl:text-5xl font-extrabold text-white leading-tight">
            Controle financeiro em <span className="text-emerald-400">poucos segundos.</span>
          </h1>
          <p className="mt-6 text-slate-300 text-lg max-w-md">
            Quanto temos? Quanto vai entrar? O que precisa ser pago? Um painel único para vocês dois organizarem tudo.
          </p>
        </div>
        <div className="text-slate-500 text-sm">Painel de Controle Financeiro e Organização Familiar</div>
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5" data-testid="auth-form">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="h-11 w-11 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-white">
              {mode === "login" ? "Entrar na conta" : "Criar conta"}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {mode === "login" ? "Acesse o painel financeiro do casal." : "Comece a organizar suas finanças."}
            </p>
          </div>

          {mode === "register" && (
            <div className="space-y-2">
              <Label className="text-slate-300">Nome</Label>
              <Input
                data-testid="name-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="bg-white/5 border-white/10 text-white"
                placeholder="Seu nome"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-slate-300">E-mail</Label>
            <Input
              data-testid="email-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="bg-white/5 border-white/10 text-white"
              placeholder="voce@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Senha</Label>
            <Input
              data-testid="password-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              className="bg-white/5 border-white/10 text-white"
              placeholder="••••••"
            />
          </div>

          {error && <p className="text-rose-400 text-sm" data-testid="auth-error">{error}</p>}

          <Button type="submit" disabled={loading} data-testid="submit-btn" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-11">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>

          <p className="text-center text-sm text-slate-400">
            {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              data-testid="toggle-mode"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
