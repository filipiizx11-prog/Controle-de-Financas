import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const salvo = localStorage.getItem('gf_usuario');
    return salvo ? JSON.parse(salvo) : null;
  });
  const [erro, setErro] = useState(null);

  async function login(email, senha) {
    setErro(null);
    try {
      const { data } = await api.post('/auth/login', { email, senha });
      localStorage.setItem('gf_token', data.token);
      localStorage.setItem('gf_usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      return true;
    } catch (e) {
      setErro(e.response?.data?.erro || 'Não foi possível entrar.');
      return false;
    }
  }

  async function registrar(nome, email, senha) {
    setErro(null);
    try {
      const { data } = await api.post('/auth/registrar', { nome, email, senha });
      localStorage.setItem('gf_token', data.token);
      localStorage.setItem('gf_usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      return true;
    } catch (e) {
      setErro(e.response?.data?.erro || 'Não foi possível criar a conta.');
      return false;
    }
  }

  function logout() {
    localStorage.removeItem('gf_token');
    localStorage.removeItem('gf_usuario');
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, registrar, logout, erro }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
