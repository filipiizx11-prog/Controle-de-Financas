import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RotaProtegida from './components/RotaProtegida';
import Layout from './components/Layout';
import Login from './pages/Login';
import Registrar from './pages/Registrar';
import Dashboard from './pages/Dashboard';
import Entradas from './pages/Entradas';
import Saidas from './pages/Saidas';
import ContasAPagar from './pages/ContasAPagar';
import ContasAReceber from './pages/ContasAReceber';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registrar" element={<Registrar />} />

          <Route path="/" element={<RotaProtegida><Layout /></RotaProtegida>}>
            <Route index element={<Dashboard />} />
            <Route path="entradas" element={<Entradas />} />
            <Route path="saidas" element={<Saidas />} />
            <Route path="contas-a-pagar" element={<ContasAPagar />} />
            <Route path="contas-a-receber" element={<ContasAReceber />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
