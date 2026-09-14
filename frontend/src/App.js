import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import TransactionsPage from "@/pages/TransactionsPage";
import ContasPagar from "@/pages/ContasPagar";
import ContasReceber from "@/pages/ContasReceber";
import Planejamento from "@/pages/Planejamento";
import Graficos from "@/pages/Graficos";
import GerarRenda from "@/pages/GerarRenda";
import Tarefas from "@/pages/Tarefas";
import Calendario from "@/pages/Calendario";
import Notas from "@/pages/Notas";
import Lembretes from "@/pages/Lembretes";
import Relatorios from "@/pages/Relatorios";
import Configuracoes from "@/pages/Configuracoes";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0B0F17] text-slate-400">Carregando...</div>;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

const routes = [
  ["/", <Dashboard />],
  ["/entradas", <TransactionsPage tipo="entrada" />],
  ["/saidas", <TransactionsPage tipo="saida" />],
  ["/contas-pagar", <ContasPagar />],
  ["/contas-receber", <ContasReceber />],
  ["/planejamento", <Planejamento />],
  ["/graficos", <Graficos />],
  ["/gerar-renda", <GerarRenda />],
  ["/tarefas", <Tarefas />],
  ["/calendario", <Calendario />],
  ["/notas", <Notas />],
  ["/lembretes", <Lembretes />],
  ["/relatorios", <Relatorios />],
  ["/configuracoes", <Configuracoes />],
];

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              {routes.map(([path, el]) => (
                <Route key={path} path={path} element={<Protected>{el}</Protected>} />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" richColors />
        </AppProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
