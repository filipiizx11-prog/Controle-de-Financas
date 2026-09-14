import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Registrar() {
  const { registrar, erro } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(e) {
    e.preventDefault();
    setCarregando(true);
    const ok = await registrar(nome, email, senha);
    setCarregando(false);
    if (ok) navigate('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-marca-900 px-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Criar conta</h1>
        <p className="text-sm text-gray-500 mb-6">Cadastre você ou seu cônjuge para acessar o sistema</p>

        {erro && <div className="bg-critico-light text-critico-dark text-sm rounded-lg p-3 mb-4">{erro}</div>}

        <form onSubmit={aoEnviar} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Nome</label>
            <input className="input mt-1" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">E-mail</label>
            <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Senha (mín. 6 caracteres)</label>
            <input className="input mt-1" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
          </div>
          <button className="btn-primary w-full mt-2" disabled={carregando}>
            {carregando ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-5 text-center">
          Já tem conta? <Link to="/login" className="text-marca-500 font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
