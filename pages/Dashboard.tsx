
import React, { useEffect, useState } from 'react';
import { dbService } from '../services/dbService';
import { Prestamo } from '../types';

const Dashboard: React.FC<{onNavigate: (p:string) => void}> = ({onNavigate}) => {
  const [stats, setStats] = useState({ recursos: 0, copias: 0, prestados: 0, usuarios: 0 });
  const [prestamosVencidos, setPrestamosVencidos] = useState<Prestamo[]>([]);
  const [libraryName, setLibraryName] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      const recursos = await dbService.listarRecursos();
      const usuarios = await dbService.listarUsuarios();
      const prestamos = await dbService.listarPrestamosActivos();
      const config = await dbService.getConfig();
      
      if (config && config.nombre_biblioteca) {
        setLibraryName(config.nombre_biblioteca);
      }
      
      const totalEjemplares = recursos.reduce((acc, l) => acc + l.ejemplares.length, 0);

      setStats({
        recursos: recursos.length, // Títulos únicos
        copias: totalEjemplares,   // Items físicos
        usuarios: usuarios.length,
        prestados: prestamos.length,
      });

      // Filtrar préstamos que vencen hoy o ya están vencidos
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999); // Final del día de hoy
      
      const vencidos = prestamos.filter(p => {
        const fechaEstimada = new Date(p.fecha_devolucion_estimada);
        return fechaEstimada <= hoy;
      });

      // Ordenar por fecha de devolución (los más antiguos primero)
      vencidos.sort((a, b) => new Date(a.fecha_devolucion_estimada).getTime() - new Date(b.fecha_devolucion_estimada).getTime());

      setPrestamosVencidos(vencidos);
    };
    loadStats();
  }, []);

  const formatFecha = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isVencido = (isoString: string) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(isoString);
    fecha.setHours(0, 0, 0, 0);
    return fecha < hoy;
  };

  return (
    <div className="p-6">
      {/* Banner de Bienvenida con el nombre de la biblioteca */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-2xl shadow-lg text-white mb-8 relative overflow-hidden">
        {/* Adornos decorativos sutiles */}
        <div className="absolute right-0 bottom-0 translate-y-6 translate-x-6 opacity-10 pointer-events-none select-none">
          <span className="text-[120px]">📚</span>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              {libraryName || 'Biblioteca'}
            </h2>
            <p className="text-blue-200 text-sm mt-1.5 max-w-xl">
              Panel de control general de <strong className="text-white">Auralib</strong>. Gestiona de manera ágil tus recursos, usuarios y movimientos.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-blue-300 font-medium uppercase tracking-wider">Estado del Sistema</p>
              <p className="text-sm font-bold text-emerald-400">Listo para operar</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl shadow-inner">
              ⚡
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Tarjeta 1 */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold">Registros</p>
            <p className="text-3xl font-bold text-gray-800">{stats.recursos}</p>
          </div>
          <div className="text-4xl text-blue-200">📂</div>
        </div>

        {/* Tarjeta 1b */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold">Ejemplares</p>
            <p className="text-3xl font-bold text-gray-800">{stats.copias}</p>
          </div>
          <div className="text-4xl text-purple-200">🔢</div>
        </div>

        {/* Tarjeta 2 */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold">En Préstamo</p>
            <p className="text-3xl font-bold text-gray-800">{stats.prestados}</p>
          </div>
          <div className="text-4xl text-yellow-200">🔄</div>
        </div>

        {/* Tarjeta 3 */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold">Usuarios</p>
            <p className="text-3xl font-bold text-gray-800">{stats.usuarios}</p>
          </div>
          <div className="text-4xl text-green-200">👥</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Accesos rápidos</h3>
          <div className="space-y-3">
            <button onClick={() => onNavigate('circulation')} className="w-full flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 font-medium transition">
              <span className="mr-3 text-xl">🚀</span> Nuevo Préstamo
            </button>
            <button onClick={() => onNavigate('circulation-return')} className="w-full flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 font-medium transition">
              <span className="mr-3 text-xl">📥</span> Devolución
            </button>
            <button onClick={() => onNavigate('catalog-new')} className="w-full flex items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 font-medium transition">
              <span className="mr-3 text-xl">➕</span> Nuevo Registro
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <span>⚠️</span> Préstamos por vencer o vencidos
            </h3>
            <p className="text-gray-500 text-xs">
              Listado de préstamos activos que requieren atención o devolución inmediata.
            </p>
          </div>
          
          <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-hidden flex flex-col border border-gray-200">
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {prestamosVencidos.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-4">No hay préstamos vencidos ni por vencer hoy.</p>
              ) : (
                prestamosVencidos.map(p => {
                  const vencido = isVencido(p.fecha_devolucion_estimada);
                  const resourceTitle = p.recurso_titulo || p.libro_titulo || 'Sin título';
                  return (
                    <div key={p.id} className={`p-3 rounded text-sm border-l-4 ${vencido ? 'bg-red-50 border-red-300 text-red-900' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold truncate pr-2 text-gray-800" title={resourceTitle}>{resourceTitle}</span>
                        <span className={`text-xs font-bold whitespace-nowrap ${vencido ? 'text-red-600' : 'text-amber-700'}`}>
                          {vencido ? 'Vencido' : 'Vence hoy'}
                        </span>
                      </div>
                      <div className="flex justify-between items-end text-xs text-gray-500">
                        <span className="truncate pr-2">{p.usuario_nombre}</span>
                        <span className="whitespace-nowrap">{formatFecha(p.fecha_devolucion_estimada)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
