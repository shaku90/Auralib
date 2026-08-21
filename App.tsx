
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Circulation from './pages/Circulation';
import Catalog from './pages/Catalog';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Statistics from './pages/Statistics';
import { dbService } from './services/dbService';
import { Configuracion } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [config, setConfig] = useState<Configuracion | null>(null);

  useEffect(() => {
    dbService.getConfig().then(loadedConfig => {
      if (loadedConfig) {
        setConfig(loadedConfig);
      }
    });

    // Verificar y ejecutar copia de seguridad automática si corresponde
    dbService.verificarYEjecutarBackupAutomatico().then(result => {
      if (result.ejecutado) {
        console.log('[Auralib Backup Auto]:', result.mensaje);
      }
    });
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'circulation':
        return <Circulation />;
      case 'circulation-return':
        return <Circulation initialTab="devolucion" />;
      case 'catalog':
        return <Catalog />;
      case 'catalog-new':
        return <Catalog initialStep="select_type" />;
      case 'users':
        return <Users />;
      case 'settings':
        return <Settings />;
      case 'statistics':
        return <Statistics />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="h-screen w-full bg-gray-200 flex flex-col overflow-hidden">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} libraryName={config?.nombre_biblioteca} />
      <div className="flex-1 overflow-y-auto">
        <main className="max-w-7xl w-full mx-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
