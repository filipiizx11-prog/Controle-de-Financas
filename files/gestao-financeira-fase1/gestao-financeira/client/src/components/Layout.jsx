import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  const hoje = new Date();
  const [periodo, setPeriodo] = useState({ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Topbar mes={periodo.mes} ano={periodo.ano} onMudarPeriodo={(mes, ano) => setPeriodo({ mes, ano })} />
        <main className="p-6">
          <Outlet context={{ periodo }} />
        </main>
      </div>
    </div>
  );
}
