import React, { useEffect, useState } from 'react';
import { Recurso, Usuario, Prestamo } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { dbService } from '../services/dbService';

interface UserStatItem {
  usuario: Usuario;
  prestamosCount: number;
}

interface BookStatItem {
  recurso: Recurso;
  prestamosCount: number;
}

interface CategoryStatItem {
  category: string;
  count: number;
}

interface MaterialTypeStatItem {
  type: string;
  count: number;
  percentage: number;
}

const AnimatedCounter: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1200 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const startValue = 0;
    const endValue = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      // Easing cúbico suave: 1 - (1 - t)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (endValue - startValue) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, duration]);

  return <span>{displayValue}</span>;
};

const Statistics: React.FC = () => {
  // Datos Generales
  const [recursosCount, setRecursosCount] = useState(0);
  
  // Estadísticas Analíticas
  const [topUsuarios, setTopUsuarios] = useState<UserStatItem[]>([]);
  const [topLibros, setTopLibros] = useState<BookStatItem[]>([]);
  const [topMaterias, setTopMaterias] = useState<CategoryStatItem[]>([]);
  const [materialDist, setMaterialDist] = useState<MaterialTypeStatItem[]>([]);
  
  // Métricas de Circulación
  const [totalPrestamos, setTotalPrestamos] = useState(0);
  const [prestamosMensuales, setPrestamosMensuales] = useState<{ monthYear: string; count: number }[]>([]);
  
  // Métricas de Obsolescencia
  const [edadPromedio, setEdadPromedio] = useState<number | null>(null);
  const [anioPromedio, setAnioPromedio] = useState<number | null>(null);
  const [decadasDist, setDecadasDist] = useState<{ decada: string; count: number }[]>([]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const [messageModal, setMessageModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    const calcularEstadisticas = async () => {
      // 1. Cargar bases de datos usando dbService
      const datos = await dbService.exportarDatos();
      const recursos = datos.recursos || [];
      const usuarios = datos.usuarios || [];
      const prestamos = datos.prestamos || [];

      setRecursosCount(recursos.length);
      setTotalPrestamos(prestamos.length);

      // Crear estructuras Map para búsquedas de alto rendimiento O(1)
      const usuariosMap = new Map<number, Usuario>();
      usuarios.forEach(u => usuariosMap.set(u.id, u));

      const recursosMap = new Map<number, Recurso>();
      recursos.forEach(r => recursosMap.set(r.id, r));

      // --- 2. CÁLCULO DE USUARIOS MÁS LECTORES ---
      const prestamosPorUsuario: Record<number, number> = {};
      prestamos.forEach(p => {
        const uId = Number(p.usuario_id);
        prestamosPorUsuario[uId] = (prestamosPorUsuario[uId] || 0) + 1;
      });

      const stUsuarios = Object.entries(prestamosPorUsuario)
        .map(([id, count]) => {
          const usuario = usuariosMap.get(Number(id));
          return {
            usuario: usuario || { id: Number(id), nombre: 'Usuario', apellido: `Inactivo (ID ${id})`, dni: '-', rol: '-', activo: false },
            prestamosCount: count
          };
        })
        .sort((a, b) => b.prestamosCount - a.prestamosCount)
        .slice(0, 5); // Top 5 lectores

      setTopUsuarios(stUsuarios);

      // --- 3. CÁLCULO DE LIBROS MÁS LEÍDOS ---
      const prestamosPorRecurso: Record<number, number> = {};
      prestamos.forEach(p => {
        const rId = Number(p.recurso_id);
        prestamosPorRecurso[rId] = (prestamosPorRecurso[rId] || 0) + 1;
      });

      const stLibros = Object.entries(prestamosPorRecurso)
        .map(([id, count]) => {
          const recurso = recursosMap.get(Number(id));
          return {
            recurso: recurso || { id: Number(id), titulo: `Recurso Eliminado (ID ${id})`, tipo_material: 'Desconocido', responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Desconocido' }, responsabilidad_secundaria: [], notas: [], temas: [], ejemplares: [] },
            prestamosCount: count
          };
        })
        .sort((a, b) => b.prestamosCount - a.prestamosCount)
        .slice(0, 5); // Top 5 libros

      setTopLibros(stLibros);

      // --- 4. PRESTAMOS POR CATEGORÍAS O GÉNEROS ---
      const conteoMaterias: Record<string, number> = {};
      prestamos.forEach(p => {
        const recurso = recursosMap.get(Number(p.recurso_id));
        if (recurso && recurso.temas) {
          recurso.temas.forEach(tema => {
            const tNorm = tema.trim().toUpperCase();
            if (tNorm) {
              conteoMaterias[tNorm] = (conteoMaterias[tNorm] || 0) + 1;
            }
          });
        }
      });

      const stMaterias = Object.entries(conteoMaterias)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6); // Top 6 materias

      setTopMaterias(stMaterias);



      // --- 6. CANTIDAD Y DISTRIBUCIÓN POR TIPO DE MATERIAL ---
      const conteoTipos: Record<string, number> = {};
      recursos.forEach(r => {
        const tipo = r.tipo_material || 'Libro';
        conteoTipos[tipo] = (conteoTipos[tipo] || 0) + 1;
      });

      const totalRecursos = recursos.length;
      const stMaterialDist = Object.entries(conteoTipos)
        .map(([type, count]) => ({
          type,
          count,
          percentage: totalRecursos > 0 ? parseFloat(((count / totalRecursos) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.count - a.count);

      setMaterialDist(stMaterialDist);

      // --- 7. EVOLUCIÓN MENSUAL DE PRÉSTAMOS ---
      const conteoMensual: Record<string, number> = {};
      // Helper para formatear fecha a formato legible (Mes Año)
      const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      prestamos.forEach(p => {
        if (p.fecha_salida) {
          const d = new Date(p.fecha_salida);
          if (!isNaN(d.getTime())) {
            const claveStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            conteoMensual[claveStr] = (conteoMensual[claveStr] || 0) + 1;
          }
        }
      });

      const stMensual = Object.entries(conteoMensual)
        .map(([key, count]) => {
          const [anio, mes] = key.split('-');
          const mesNom = nombresMeses[parseInt(mes, 10) - 1];
          return {
            rawKey: key, // Para ordenar
            monthYear: `${mesNom} ${anio}`,
            count
          };
        })
        .sort((a, b) => a.rawKey.localeCompare(b.rawKey))
        .slice(-6); // Últimos 6 meses con préstamos

      setPrestamosMensuales(stMensual);

      // --- 8. GRADO DE OBSOLESCENCIA (EDAD PROMEDIO DE LA COLECCIÓN) ---
      let sumAnios = 0;
      let countAnios = 0;
      const conteoDecadas: Record<string, number> = {};

      recursos.forEach(r => {
        if (r.fecha && r.fecha.length > 0) {
          for (const f of r.fecha) {
            const match = f.match(/\d{4}/);
            if (match) {
              const anio = parseInt(match[0], 10);
              // Validar año lógico
              if (anio > 1400 && anio <= 2100) {
                sumAnios += anio;
                countAnios++;

                // Agrupar por década (ej: 1990, 2010)
                const decadaNum = Math.floor(anio / 10) * 10;
                const decadaStr = `${decadaNum}s`;
                conteoDecadas[decadaStr] = (conteoDecadas[decadaStr] || 0) + 1;
                break; // Solo extraemos un año representativo por recurso
              }
            }
          }
        }
      });

      if (countAnios > 0) {
        const promedio = Math.round(sumAnios / countAnios);
        setAnioPromedio(promedio);
        // Considerando el año local activo según metadatos (2026)
        const edad = 2026 - promedio;
        setEdadPromedio(Math.max(edad, 0));
      } else {
        setAnioPromedio(null);
        setEdadPromedio(null);
      }

      const stDecadas = Object.entries(conteoDecadas)
        .map(([decada, count]) => ({ decada, count }))
        .sort((a, b) => a.decada.localeCompare(b.decada));

      setDecadasDist(stDecadas);
    };

    calcularEstadisticas();
  }, []);

  // Simular préstamos adicionales con fines demostrativos si la base está muy vacía
  const ejecutarInyeccion = async () => {
    // Obtener listas actuales para usar IDs reales
    const datos = await dbService.exportarDatos();
    const recursos: Recurso[] = datos.recursos || [];
    const usuarios: Usuario[] = datos.usuarios || [];

    if (recursos.length === 0 || usuarios.length === 0) {
      setMessageModal({
        isOpen: true,
        title: "Falta de Datos",
        message: "Por favor asegúrate de tener al menos algunos recursos y usuarios registrados en el sistema."
      });
      return;
    }

    // Crear un pool de préstamos ficticios ya devueltos de los últimos meses
    const mockPrestamos: Prestamo[] = [];
    const hoy = new Date();
    
    // 35 Préstamos ficticios
    for (let i = 0; i < 35; i++) {
      const uAleatorio = usuarios[Math.floor(Math.random() * usuarios.length)];
      const rAleatorio = recursos[Math.floor(Math.random() * recursos.length)];
      
      const diasAtras = Math.floor(Math.random() * 150) + 5; // hasta 5 meses de antiguedad
      const fechaSalida = new Date(hoy.getTime() - diasAtras * 86400000);
      const fechaRetornoEstimado = new Date(fechaSalida.getTime() + 10 * 86400000);
      const fechaRetornoReal = new Date(fechaSalida.getTime() + (Math.floor(Math.random() * 8) + 4) * 86400000);

      mockPrestamos.push({
        id: 1000 + i,
        usuario_id: uAleatorio.id,
        recurso_id: rAleatorio.id,
        inventario_ejemplar: rAleatorio.ejemplares && rAleatorio.ejemplares[0] ? rAleatorio.ejemplares[0].inventario : '0001',
        fecha_salida: fechaSalida.toISOString(),
        fecha_devolucion_estimada: fechaRetornoEstimado.toISOString(),
        fecha_devolucion_real: fechaRetornoReal.toISOString(),
        estado: 'Devuelto' as any
      });
    }

    // Mezclar con los activos reales si existiesen
    const prestamosActuales: Prestamo[] = datos.prestamos || [];
    const prestamosFusiles = [...prestamosActuales, ...mockPrestamos];

    await dbService.importarDatos({
      ...datos,
      prestamos: prestamosFusiles
    });
    window.location.reload();
  };

  const inyectarHistorialDemo = () => {
    setConfirmModal({
      isOpen: true,
      title: "¿Deseas simular historial de préstamos demo?",
      message: "Esto inyectará un historial ficticio de préstamos ya devueltos para que puedas visualizar gráficos e indicadores estadísticos realistas sin alterar la disponibilidad física de tus libros reales.",
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        ejecutarInyeccion();
      }
    });
  };

  // Análisis del grado de obsolescencia
  const getObsolescenceLabel = (edad: number | null) => {
    if (edad === null) return 'Sin datos de año de publicación.';
    if (edad <= 5) return 'Moderno y actualizado. Excelente para ciencia e informática.';
    if (edad <= 12) return 'Colección intermedia. Estable, con buen nivel de vigencia.';
    if (edad <= 22) return 'Envejecimiento leve .Varios libros clásicos o literatura general.';
    return 'Nivel de obsolescencia alto. Se sugiere renovación tecnológica/científica).';
  };

  const getObsolescenceColor = (edad: number | null) => {
    if (edad === null) return 'text-gray-500 bg-gray-100';
    if (edad <= 5) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (edad <= 12) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (edad <= 22) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 tracking-tight">
            <span>📊</span> Estadísticas y analítica
          </h2>
        </div>
      </div>

      {/* CATEGORÍA 1: CIRCULACIÓN */}
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 px-6 py-4 text-white rounded-lg shadow">
          <h3 className="text-lg font-bold text-white tracking-tight">Circulación</h3>
        </div>

        {/* Fila 1: KPI Préstamos Totales + Tendencias de Préstamo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. PRÉSTAMOS TOTALES */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow transition duration-200">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2 flex items-center justify-between">
              <span>🔄 Préstamos totales</span>
            </h4>
            <div className="mt-2">
              <p className="text-5xl font-extrabold text-blue-950">
                <AnimatedCounter value={totalPrestamos} />
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Total histórico de préstamos.</p>
            </div>
          </div>

          {/* 2. TENDENCIAS DE PRÉSTAMO */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center justify-between border-b border-gray-200 pb-2">
              <span>📊 Tendencias de Préstamo</span>
              <span className="text-xs normal-case text-gray-400 font-normal">Suma de préstamos mensuales</span>
            </h4>
            
            {prestamosMensuales.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-gray-400 italic text-sm">
                Sin datos suficientes para proyectar el gráfico de tendencias.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-6 h-36 items-end gap-3 pt-6 px-2">
                  {prestamosMensuales.map((item, idx) => {
                    const maxVal = Math.max(...prestamosMensuales.map(m => m.count), 1);
                    const pct = (item.count / maxVal) * 100;
                    return (
                      <div key={idx} className="flex flex-col items-center group relative h-full justify-end">
                        <div className="absolute -top-6 text-xs text-blue-900 font-bold bg-blue-50 px-1 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                          {item.count} prest.
                        </div>
                        <div 
                          className="bg-blue-500 rounded-t-md hover:bg-blue-600 transition duration-350 cursor-pointer w-[70%]" 
                          style={{ height: `${pct}%` }}
                        />
                        <span className="text-[10px] md:text-xs text-gray-500 mt-2 truncate max-w-full font-medium">{item.monthYear}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-400 text-center italic mt-2">
                  La altura refleja la densidad de préstamos realizados por período.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fila 2: Bento Grid con Materiales más solicitados + Usuarios + Preferencia de temas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda (2 cols): 3. Materiales más solicitados + 4. Usuarios con mayor circulación */}
          <div className="lg:col-span-2 space-y-6">
            {/* 3. MATERIALES MÁS SOLICITADOS (TOP HISTÓRICO) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2 flex items-center justify-between">
                <span>🏆 Materiales más solicitados (top histórico)</span>
              </h4>
              
              {topLibros.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-6">No se registraron préstamos de recursos en el catálogo aún.</p>
              ) : (
                <div className="space-y-3">
                  {topLibros.map((item, index) => {
                    const maxCount = topLibros[0]?.prestamosCount || 1;
                    const pct = (item.prestamosCount / maxCount) * 100;
                    return (
                      <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between p-2.5 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition">
                        <div className="flex gap-3 items-center min-w-0 flex-1">
                          <div className="w-6 h-6 bg-blue-900 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                            {index + 1}
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-semibold text-gray-800 truncate" title={item.recurso.titulo}>
                              {item.recurso.titulo}
                            </p>
                            <p className="text-xs text-gray-400 font-medium truncate">
                              {item.recurso.responsabilidad_principal?.nombre || 'Sin autor registrado'} • <span className="bg-gray-100 rounded text-[10px] px-1 py-0.2">{item.recurso.tipo_material}</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full sm:w-[40%] text-right shrink-0">
                          <div className="hidden sm:block flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-blue-950 bg-blue-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                            {item.prestamosCount} {item.prestamosCount === 1 ? 'préstamo' : 'préstamos'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. USUARIOS CON MAYOR CIRCULACIÓN ACTIVA */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center justify-between border-b border-gray-200 pb-2">
                <span>👥 Usuarios con mayor circulación activa</span>
                <span className="text-xs normal-case text-gray-400 font-normal">Préstamos totales</span>
              </h4>

              {topUsuarios.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-6">No se registran transacciones correspondientes a usuarios válidos.</p>
              ) : (
                <div className="space-y-3">
                  {topUsuarios.map((item, index) => {
                    const rankColors = [
                      {
                        numberClass: 'text-[#22092C]',
                        cardClass: 'bg-gradient-to-r from-[#22092C] via-[#350F43] to-[#451457] border-[#22092C]/40',
                      },
                      {
                        numberClass: 'text-[#872341]',
                        cardClass: 'bg-gradient-to-r from-[#872341] via-[#9B2749] to-[#AD2E53] border-[#872341]/40',
                      },
                      {
                        numberClass: 'text-[#BE3144]',
                        cardClass: 'bg-gradient-to-r from-[#BE3144] via-[#CE374C] to-[#DC3F53] border-[#BE3144]/40',
                      },
                      {
                        numberClass: 'text-[#D84542]',
                        cardClass: 'bg-gradient-to-r from-[#D84542] via-[#E44F42] to-[#EE5741] border-[#D84542]/40',
                      },
                      {
                        numberClass: 'text-[#F05941]',
                        cardClass: 'bg-gradient-to-r from-[#F05941] via-[#F46B52] to-[#F77C65] border-[#F05941]/40',
                      }
                    ];
                    const colorConfig = rankColors[index % rankColors.length];
                    
                    return (
                      <div key={index} className="flex items-center gap-2 sm:gap-3 group">
                        {/* Número gigante de ranking a la izquierda con el color del paso */}
                        <div className={`text-6xl sm:text-7xl md:text-8xl font-black ${colorConfig.numberClass} select-none w-8 sm:w-12 md:w-14 text-right pr-1 tracking-tighter shrink-0 transition-transform group-hover:scale-105 duration-300`}>
                          {index + 1}
                        </div>

                        {/* Contenedor de tarjeta con fondo degradado y textos claros */}
                        <div className={`flex-1 ${colorConfig.cardClass} border rounded-2xl py-2 px-3 sm:py-2.5 sm:px-4 md:py-3 md:px-5 flex items-center justify-between shadow-sm hover:shadow-md transition duration-300`}>
                          {/* Sección izquierda: Avatar e información */}
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <UserAvatar 
                              dni={item.usuario.dni} 
                              nombre={item.usuario.nombre} 
                              apellido={item.usuario.apellido} 
                              className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 shrink-0 shadow-sm border border-white/40"
                              fallbackSize="text-xs sm:text-sm"
                            />
                            <div className="min-w-0">
                              <p className="text-sm sm:text-base font-bold text-white truncate" title={`${item.usuario.apellido}, ${item.usuario.nombre}`}>
                                {item.usuario.apellido}, {item.usuario.nombre}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-x-2 sm:gap-y-0 mt-0.5 sm:mt-1 text-xs">
                                <span className="bg-white/20 text-white font-medium px-2 py-0.5 rounded text-[10px] sm:text-[11px] shrink-0 border border-white/30">
                                  DNI {item.usuario.dni}
                                </span>
                                <span className="hidden sm:inline text-white/60">•</span>
                                <span className="bg-white/20 text-white font-medium px-2 py-0.5 rounded text-[10px] sm:text-[11px] truncate max-w-[120px] sm:max-w-none border border-white/30" title={item.usuario.rol}>
                                  {item.usuario.rol}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Sección derecha: Cantidad directa de préstamos en texto blanco */}
                          <div className="flex flex-col items-center justify-center shrink-0 text-white transition-transform group-hover:scale-105 duration-300 mr-2">
                            <span className="text-xl sm:text-2xl md:text-3xl font-black font-mono leading-none text-white">{item.prestamosCount}</span>
                            <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-0.5 text-white/90">Préstamos</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha (1 col): 5. PREFERENCIA DE TEMAS */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2 flex items-center justify-between">
                <span>📖 Preferencia de temas</span>
                <span className="text-xs normal-case text-gray-400 font-normal">Préstamos</span>
              </h4>
              
              {topMaterias.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-6">No hay suficientes registros categorizados con temas o materias.</p>
              ) : (
                <div className="space-y-3">
                  {topMaterias.map((item, index) => {
                    const maxCount = topMaterias[0]?.count || 1;
                    const pct = Math.min((item.count / maxCount) * 100, 100);
                    const colors = [
                      'bg-purple-600', 'bg-indigo-600', 'bg-indigo-500', 
                      'bg-pink-500', 'bg-blue-500', 'bg-purple-400'
                    ];
                    const col = colors[index % colors.length];

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-gray-700">
                          <span className="truncate max-w-[80%]" title={item.category}>{item.category}</span>
                          <span className="text-gray-500 whitespace-nowrap">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className={`${col} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORÍA 2: COLECCIÓN */}
      <div className="space-y-6 pt-4">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 px-6 py-4 text-white rounded-lg shadow">
          <h3 className="text-lg font-bold text-white tracking-tight">Colección</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. ANTIGÜEDAD DE LA COLECCIÓN */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow transition duration-200">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2 flex items-center justify-between">
              <span>📅 Antigüedad de la colección</span>
            </h4>
            <div className="mt-2">
              <p className="text-5xl font-extrabold text-emerald-700">
                {edadPromedio !== null ? `${edadPromedio} años` : 'S/D'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Promedio por año de publicación.
              </p>
            </div>
          </div>

          {/* 2. DESGASTE Y OBSOLESCENCIA */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center justify-between">
              <span>⏳ Desgaste y Obsolescencia</span>
            </h4>
            
            <div className={`p-4 border rounded-xl text-xs space-y-2 leading-relaxed ${getObsolescenceColor(edadPromedio)}`}>
              <p className="font-bold uppercase tracking-wider text-[10px]">Diagnóstico clínico del catálogo:</p>
              <p className="font-medium text-sm">{getObsolescenceLabel(edadPromedio)}</p>
            </div>

            {decadasDist.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">Distribución por décadas de edición:</p>
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  {decadasDist.map((item, index) => (
                    <div key={index} className="flex items-center text-xs justify-between gap-4">
                      <span className="font-semibold text-gray-600 w-10 shrink-0">{item.decada}</span>
                      <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full" 
                          style={{ width: `${recursosCount > 0 ? Math.min((item.count / recursosCount) * 100, 100) : 0}%` }} 
                        />
                      </div>
                      <span className="text-gray-400 text-right w-6 shrink-0">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. DISTRIBUCIÓN DEL CATÁLOGO */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2 flex items-center justify-between">
              <span>📦 Distribución del Catálogo</span>
              <span className="text-xs normal-case text-gray-400 font-normal">Cantidad</span>
            </h4>

            {materialDist.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-6">Colección vacía. Ingresa recursos en el catálogo.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {materialDist.map((item, index) => {
                  const colors = [
                    'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 
                    'bg-orange-500', 'bg-pink-500', 'bg-teal-500', 
                    'bg-indigo-500', 'bg-red-500'
                  ];
                  const col = colors[index % colors.length];
                  
                  return (
                    <div key={index} className="p-2 border border-gray-100 hover:border-gray-200 rounded-lg flex items-center justify-between text-xs transition bg-gray-50/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-3 h-3 rounded-full shrink-0 ${col}`} />
                        <span className="font-semibold text-gray-700 truncate">{item.type}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-gray-800">{item.count}</span>{' '}
                        <span className="text-gray-400 font-medium font-mono">({item.percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-fade-in">
                  <div className="p-6">
                      <div className="flex items-center gap-3 text-yellow-600 mb-3">
                          <span className="text-2xl">⚠️</span>
                          <h3 className="text-xl font-bold text-gray-800">{confirmModal.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{confirmModal.message}</p>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2">
                      <button
                          type="button"
                          onClick={() => {
                              if (confirmModal.onConfirm) confirmModal.onConfirm();
                          }}
                          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm focus:outline-none transition-colors"
                      >
                          Confirmar
                      </button>
                      <button
                          type="button"
                          onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded shadow-sm focus:outline-none transition-colors"
                      >
                          Cancelar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DE MENSAJE */}
      {messageModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-fade-in">
                  <div className="p-6">
                      <div className="flex items-center gap-3 text-red-600 mb-3">
                          <span className="text-2xl">ℹ️</span>
                          <h3 className="text-xl font-bold text-gray-800">{messageModal.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{messageModal.message}</p>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse">
                      <button
                          type="button"
                          onClick={() => setMessageModal(prev => ({ ...prev, isOpen: false }))}
                          className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded shadow-sm focus:outline-none transition-colors"
                      >
                          Cerrar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Statistics;
