
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Usuario, Recurso, Prestamo, EstadoRecurso } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { ImagenRegistro } from '../components/ImagenRegistro';
import { formatFecha } from '../utils/dateUtils';

interface CirculationProps {
  initialTab?: 'prestamo' | 'devolucion' | 'morosos';
}

const Circulation: React.FC<CirculationProps> = ({ initialTab = 'prestamo' }) => {
  const [activeTab, setActiveTab] = useState<'prestamo' | 'devolucion' | 'morosos'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // --- ESTADO DE PRÉSTAMO ---
  // Paso 0: Buscar Usuario, 1: Confirmar Usuario & Escanear Libro
  const [step, setStep] = useState(0);
  
  // Nuevo estado para búsqueda de usuarios
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<Usuario[]>([]);
  
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [currentLoans, setCurrentLoans] = useState<Prestamo[]>([]);
  const [invInput, setInvInput] = useState('');
  const [currentBook, setCurrentBook] = useState<Recurso | null>(null);
  const [currentCopyIndex, setCurrentCopyIndex] = useState<number>(-1);
  const [loanMessage, setLoanMessage] = useState<{type: 'error'|'success', text: string} | null>(null);
  const [showManualDate, setShowManualDate] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [manualStartDate, setManualStartDate] = useState('');
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

  // --- ESTADO DE DEVOLUCIÓN ---
  const [returnInvInput, setReturnInvInput] = useState('');
  const [returnMessage, setReturnMessage] = useState<{type: 'error'|'success', text: string} | null>(null);

  // --- ESTADO DE MOROSOS ---
  const [overdueLoans, setOverdueLoans] = useState<any[]>([]);
  const [loadingMorosos, setLoadingMorosos] = useState(false);
  const [morososSearch, setMorososSearch] = useState('');
  const [libraryName, setLibraryName] = useState('la Biblioteca');

  // --- ESTADO DE MODAL DE TODOS LOS PRÉSTAMOS ACTIVOS ---
  const [showActiveLoansModal, setShowActiveLoansModal] = useState(false);
  const [allActiveLoans, setAllActiveLoans] = useState<any[]>([]);
  const [loadingActiveLoans, setLoadingActiveLoans] = useState(false);

  const handleOpenActiveLoansModal = async () => {
    setLoadingActiveLoans(true);
    setShowActiveLoansModal(true);
    try {
      const prestamos = await dbService.listarPrestamosActivos();
      setAllActiveLoans(prestamos);
    } catch (error) {
      console.error("Error al cargar préstamos activos:", error);
    } finally {
      setLoadingActiveLoans(false);
    }
  };

  const loadMorososData = async () => {
    setLoadingMorosos(true);
    try {
      const prestamos = (await dbService.listarPrestamosActivos()) as any[];
      const usuarios = await dbService.listarUsuarios();
      const config = await dbService.getConfig();
      if (config.nombre_biblioteca) {
        setLibraryName(config.nombre_biblioteca);
      } else {
        setLibraryName('la Biblioteca');
      }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const individualOverdue = prestamos.map(p => {
        const user = usuarios.find(u => u.id === p.usuario_id);
        const estimada = new Date(p.fecha_devolucion_estimada);
        estimada.setHours(0, 0, 0, 0);
        
        const diffTime = hoy.getTime() - estimada.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...p,
          usuario_nombre: p.usuario_nombre || (user ? `${user.nombre} ${user.apellido}` : 'Desconocido'),
          usuario_telefono: user?.telefono || '',
          usuario_email: user?.email || '',
          usuario_rol: user?.rol || '',
          diasVencidos: diffDays
        };
      }).filter(item => item.diasVencidos > 0);

      // Agrupar por usuario
      const groupedMap = new Map<number, any>();
      individualOverdue.forEach(item => {
        const userId = item.usuario_id;
        if (!groupedMap.has(userId)) {
          groupedMap.set(userId, {
            usuario_id: userId,
            usuario_nombre: item.usuario_nombre,
            usuario_dni: item.usuario_dni,
            usuario_telefono: item.usuario_telefono,
            usuario_email: item.usuario_email,
            usuario_rol: item.usuario_rol,
            prestamos: [],
            maxDiasVencidos: 0
          });
        }
        
        const group = groupedMap.get(userId);
        group.prestamos.push({
          id: item.id,
          recurso_id: item.recurso_id,
          recurso_titulo: item.recurso_titulo || item.libro_titulo || 'Sin título',
          inventario_ejemplar: item.inventario_ejemplar,
          recurso_inventarios: item.recurso_inventarios,
          fecha_salida: item.fecha_salida,
          fecha_devolucion_estimada: item.fecha_devolucion_estimada,
          diasVencidos: item.diasVencidos
        });
        if (item.diasVencidos > group.maxDiasVencidos) {
          group.maxDiasVencidos = item.diasVencidos;
        }
      });

      setOverdueLoans(Array.from(groupedMap.values()));
    } catch (e) {
      console.error('Error al cargar morosos:', e);
    } finally {
      setLoadingMorosos(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'morosos') {
      loadMorososData();
    }
  }, [activeTab]);

  const getWhatsAppLink = (moroso: any) => {
    const rawPhone = moroso.usuario_telefono || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    
    let itemsText = '';
    if (moroso.prestamos.length === 1) {
      const p = moroso.prestamos[0];
      const formattedDate = formatFecha(p.fecha_devolucion_estimada);
      itemsText = `el material "${p.recurso_titulo}" (Ejemplar: ${p.inventario_ejemplar}) cuyo vencimiento fue el ${formattedDate}`;
    } else {
      itemsText = 'los siguientes materiales:\n' + moroso.prestamos.map((p: any) => {
        const formattedDate = formatFecha(p.fecha_devolucion_estimada);
        return `- "${p.recurso_titulo}" (Ejemplar: ${p.inventario_ejemplar}) - Venció: ${formattedDate}`;
      }).join('\n');
    }

    const mensaje = `Hola ${moroso.usuario_nombre}, te escribimos desde ${libraryName} para recordarte que tenés pendiente la devolución de ${itemsText}. ¡Muchas gracias!`;
    
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
  };

  const resetLoan = () => {
    setStep(0);
    setUserSearchTerm('');
    setUserSuggestions([]);
    setCurrentUser(null);
    setCurrentBook(null);
    setCurrentCopyIndex(-1);
    setCurrentLoans([]);
    setLoanMessage(null);
    setShowManualDate(false);
    setManualDate('');
    setManualStartDate('');
  };

  const handleUserSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value;
      setUserSearchTerm(term);
      
      if(term.length > 0) {
          const results = await dbService.buscarUsuarios(term);
          setUserSuggestions(results);
      } else {
          setUserSuggestions([]);
      }
  };

  const handleSelectUser = async (user: Usuario) => {
      setLoanMessage(null);
      if (!user.activo) {
        setLoanMessage({ type: 'error', text: 'El usuario seleccionado está dado de baja.' });
        return;
      }
      setCurrentUser(user);
      const loans = await dbService.listarPrestamosActivos(user.id);
      setCurrentLoans(loans);
      setStep(1);
      setUserSuggestions([]);
  };

  const handleSearchBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoanMessage(null);
    const result = await dbService.buscarRecursoPorInventario(invInput);
    
    if (result) {
      const { recurso, ejemplarIndex } = result;
      const estadoEjemplar = recurso.ejemplares[ejemplarIndex].estado;

      if (estadoEjemplar !== EstadoRecurso.DISPONIBLE) {
        setLoanMessage({ type: 'error', text: `El ítem con inventario ${invInput} no está disponible. Estado: ${estadoEjemplar}` });
        return;
      }
      setCurrentBook(recurso);
      setCurrentCopyIndex(ejemplarIndex);
      setShowManualDate(false);
      setManualDate('');
      setManualStartDate('');
    } else {
      setLoanMessage({ type: 'error', text: 'Recurso no encontrado por inventario.' });
      setCurrentBook(null);
    }
  };

  const handleDoLoan = async () => {
    if (!currentUser || !currentBook || currentCopyIndex === -1) return;
    
    try {
      const config = await dbService.getConfig();
      const dias = config.dias_prestamo !== undefined ? config.dias_prestamo : 7;
      const inventario = currentBook.ejemplares[currentCopyIndex].inventario;

      await dbService.registrarPrestamo(currentUser.id, currentBook.id, inventario, dias);
      setLoanMessage({ type: 'success', text: `Préstamo registrado correctamente. Devolución: en ${dias} días.` });
      // Actualizar los datos del usuario para mostrar el nuevo préstamo en la lista
      const loans = await dbService.listarPrestamosActivos(currentUser.id);
      setCurrentLoans(loans);
      setCurrentBook(null);
      setInvInput('');
      setCurrentCopyIndex(-1);
    } catch (error) {
      setLoanMessage({ type: 'error', text: 'Error al registrar préstamo' });
    }
  };

  const handleToggleManualDate = async () => {
    if (!showManualDate) {
      const hoy = new Date();
      const hoyStr = hoy.toISOString().split('T')[0];
      setManualStartDate(hoyStr);
      
      try {
        const config = await dbService.getConfig();
        const dias = config.dias_prestamo !== undefined ? config.dias_prestamo : 7;
        const devolucion = new Date();
        devolucion.setDate(hoy.getDate() + dias);
        setManualDate(devolucion.toISOString().split('T')[0]);
      } catch (e) {
        const devolucion = new Date();
        devolucion.setDate(hoy.getDate() + 7);
        setManualDate(devolucion.toISOString().split('T')[0]);
      }
    }
    setShowManualDate(!showManualDate);
  };

  const handleDoCustomLoan = async () => {
    if (!currentUser || !currentBook || currentCopyIndex === -1) return;
    if (!manualDate) {
      alert("Por favor, seleccione una fecha de devolución válida.");
      return;
    }
    if (!manualStartDate) {
      alert("Por favor, seleccione una fecha de inicio/salida del préstamo.");
      return;
    }

    try {
      const inventario = currentBook.ejemplares[currentCopyIndex].inventario;
      const start = new Date(manualStartDate);
      start.setHours(12, 0, 0, 0); // Evitar problemas de huso horario

      const end = new Date(manualDate);
      end.setHours(23, 59, 59, 999); // Al final del día elegido

      await dbService.registrarPrestamo(
        currentUser.id, 
        currentBook.id, 
        inventario, 
        0, 
        end.toISOString(),
        start.toISOString()
      );

      // Calcular diferencia de días para el mensaje de éxito
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setLoanMessage({ 
        type: 'success', 
        text: `Préstamo registrado correctamente. Préstamo iniciado el: ${start.toLocaleDateString()}. Devolución: ${end.toLocaleDateString()} (Plazo de ${diffDays} días).` 
      });

      // Actualizar el estado
      const loans = await dbService.listarPrestamosActivos(currentUser.id);
      setCurrentLoans(loans);
      setCurrentBook(null);
      setInvInput('');
      setCurrentCopyIndex(-1);
      setShowManualDate(false);
      setManualDate('');
      setManualStartDate('');
    } catch (error) {
      setLoanMessage({ type: 'error', text: 'Error al registrar préstamo personalizado' });
    }
  };

  const handleReturnFromList = (prestamoId: number) => {
      setConfirmModal({
          isOpen: true,
          title: 'Confirmar Devolución',
          message: '¿Está seguro de que desea confirmar la devolución de este material?',
          onConfirm: async () => {
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
              await dbService.devolverPrestamo(prestamoId);
              if (currentUser) {
                  const loans = await dbService.listarPrestamosActivos(currentUser.id);
                  setCurrentLoans(loans);
              }
              setLoanMessage({ type: 'success', text: 'Devolución registrada exitosamente.' });
          }
      });
  };

  const handleRenewFromList = async (prestamoId: number) => {
      try {
          const config = await dbService.getConfig();
          const dias = config.dias_prestamo !== undefined ? config.dias_prestamo : 7;
          setConfirmModal({
              isOpen: true,
              title: 'Confirmar Renovación',
              message: `¿Está seguro de que desea renovar este préstamo por ${dias} días adicionales?`,
              onConfirm: async () => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  try {
                      await dbService.renovarPrestamo(prestamoId, dias);
                      if (currentUser) {
                          const loans = await dbService.listarPrestamosActivos(currentUser.id);
                          setCurrentLoans(loans);
                      }
                      setLoanMessage({ type: 'success', text: `Préstamo renovado exitosamente por ${dias} días.` });
                  } catch (err: any) {
                      setLoanMessage({ type: 'error', text: err.message || 'Error al renovar el préstamo.' });
                  }
              }
          });
      } catch (err: any) {
          setLoanMessage({ type: 'error', text: 'Error al obtener la configuración del sistema.' });
      }
  };

  const handleQuickReturn = async (e: React.FormEvent) => {
      e.preventDefault();
      setReturnMessage(null);
      try {
          const result = await dbService.devolverPrestamoPorInventario(returnInvInput);
          setReturnMessage({ 
              type: 'success', 
              text: `DEVOLUCIÓN EXITOSA: "${result.titulo}" devuelto por ${result.usuario}. ${result.diasVencidos > 0 ? `(ATENCIÓN: ${result.diasVencidos} días de retraso)` : ''}`
          });
          setReturnInvInput('');
      } catch (error: any) {
          setReturnMessage({ type: 'error', text: error.message || 'Error al procesar devolución' });
      }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Préstamos</h2>
        </div>
        <button
          type="button"
          onClick={handleOpenActiveLoansModal}
          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <span>📋</span> Ver préstamos activos
        </button>
      </div>

      {/* PESTAÑAS */}
      <div className="flex border-b border-gray-300 mb-6">
          <button
              className={`py-3 px-6 font-semibold text-sm focus:outline-none border-b-2 flex items-center gap-2 ${activeTab === 'prestamo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('prestamo')}
          >
              🚀 Prestar
          </button>
          <button
              className={`py-3 px-6 font-semibold text-sm focus:outline-none border-b-2 flex items-center gap-2 ${activeTab === 'devolucion' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('devolucion')}
          >
              📥 Devolver
          </button>
          <button
              className={`py-3 px-6 font-semibold text-sm focus:outline-none border-b-2 flex items-center gap-2 ${activeTab === 'morosos' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('morosos')}
          >
              ⚠️ Morosos
          </button>
      </div>

      {/* --- PESTAÑA: PRÉSTAMO --- */}
      {activeTab === 'prestamo' && (
          <div>
              {/* Mensajes Préstamo */}
              {loanMessage && (
                  <div className={`p-4 mb-4 rounded ${loanMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {loanMessage.text}
                  </div>
              )}

              {/* Paso 0: Buscar Usuario */}
              {step === 0 && (
                  <div className="max-w-2xl mx-auto mt-8">
                      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100 relative">
                          <h3 className="text-lg font-semibold mb-4 text-blue-800">Identificar usuario</h3>
                          <div className="relative">
                              <input
                                type="text"
                                className="w-full border border-gray-300 p-3 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                placeholder="Buscar por apellido, nombre o DNI..."
                                value={userSearchTerm}
                                onChange={handleUserSearchChange}
                                autoFocus
                              />
                          {/* Sugerencias en Tiempo Real */}
                          {userSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-b border border-gray-200 z-10 max-h-60 overflow-y-auto">
                                  {userSuggestions.map(u => (
                                      <div 
                                        key={u.id}
                                        onClick={() => handleSelectUser(u)}
                                        className={`p-3 border-b border-gray-200 last:border-0 cursor-pointer flex justify-between items-center hover:bg-blue-50 transition ${!u.activo ? 'bg-gray-50 text-gray-400' : 'text-gray-800'}`}
                                      >
                                          <div className="flex items-center gap-3">
                                              <UserAvatar dni={u.dni} nombre={u.nombre} apellido={u.apellido} className="w-9 h-9 flex-shrink-0" fallbackSize="text-xs" />
                                              <div>
                                                  <span className="font-bold block">{u.apellido}, {u.nombre}</span>
                                                  <span className="text-sm text-gray-500">DNI: {u.dni}</span>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <span className={`text-xs px-2 py-1 rounded ${u.activo ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                                  {u.rol} {u.activo ? '' : '(BAJA)'}
                                              </span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                          {userSearchTerm.length > 0 && userSuggestions.length === 0 && (
                              <div className="absolute top-full left-0 right-0 bg-white p-4 shadow text-gray-500 text-sm z-10 border border-gray-200 rounded-b">
                                  No se encontraron usuarios coincidentes.
                              </div>
                          )}
                      </div>
                  </div>
              </div>
              )}

              {/* Paso 1: Información de Usuario y Escaneo */}
              {step >= 1 && currentUser && (
                  <div>
                      <div className="flex justify-end mb-4">
                          <button 
                              onClick={resetLoan} 
                              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition flex items-center gap-2"
                          >
                              🔍 Nueva Búsqueda
                          </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Columna Izquierda: Info Usuario */}
                  <div className="col-span-1 space-y-6">
                      <div className="bg-white p-4 rounded-lg shadow border-t-4 border-blue-500">
                        <div className="flex flex-col items-center text-center">
                          <UserAvatar dni={currentUser.dni} nombre={currentUser.nombre} apellido={currentUser.apellido} className="w-24 h-24 shadow-sm border border-gray-200 mb-2" fallbackSize="text-3xl" />
                          <h3 className="font-bold text-lg text-gray-800 leading-tight mb-2">{currentUser.apellido}, {currentUser.nombre}</h3>
                          <p className="text-gray-500 text-sm">DNI {currentUser.dni}</p>
                          <p className="text-gray-500 text-sm mt-1">{currentUser.rol}</p>
                        </div>
                        {currentUser.nota && <p className="mt-2 text-yellow-600 text-sm bg-yellow-50 p-2 rounded">{currentUser.nota}</p>}
                      </div>

                      <div className="bg-white p-4 rounded-lg shadow">
                      <h4 className="font-bold text-gray-700 mb-2">Préstamos activos ({currentLoans.length})</h4>
                      {currentLoans.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">No tiene materiales en su poder.</p>
                      ) : (
                          <ul className="space-y-3">
                          {currentLoans.map(p => (
                              <li key={p.id} className="border-b border-gray-200 pb-3 last:border-0 flex gap-3 items-start">
                              <ImagenRegistro 
                                tipoMaterial="Libro" 
                                titulo={p.recurso_titulo || p.libro_titulo}
                                inventarios={p.recurso_inventarios || [p.inventario_ejemplar]}
                                className="w-10 h-14 border border-gray-100 bg-gray-50 flex-shrink-0"
                                hideFallback={true}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate" title={p.recurso_titulo || p.libro_titulo}>{p.recurso_titulo || p.libro_titulo}</p>
                                <p className="text-xs text-gray-500">Inv: <span className="font-mono">{p.inventario_ejemplar}</span></p>
                                {(() => {
                                  const hoy = new Date();
                                  hoy.setHours(0, 0, 0, 0);
                                  const estimada = new Date(p.fecha_devolucion_estimada);
                                  estimada.setHours(0, 0, 0, 0);
                                  const esVencido = hoy.getTime() > estimada.getTime();
                                  return esVencido ? (
                                    <p className="text-xs text-red-600 font-bold animate-pulse">Venció el: {estimada.toLocaleDateString()}</p>
                                  ) : (
                                    <p className="text-xs text-gray-500">Vence: {estimada.toLocaleDateString()}</p>
                                  );
                                })()}
                                <div className="mt-1.5 flex gap-2">
                                  <button 
                                      onClick={() => handleReturnFromList(p.id)}
                                      className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 transition font-medium"
                                  >
                                      Devolver
                                  </button>
                                  <button 
                                      onClick={() => handleRenewFromList(p.id)}
                                      className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200 transition font-medium"
                                  >
                                      Renovar
                                  </button>
                                </div>
                              </div>
                              </li>
                          ))}
                          </ul>
                      )}
                      </div>
                  </div>

                  {/* Columna Derecha: Acción Préstamo */}
                  <div className="col-span-2">
                      <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-100">
                      <h3 className="text-lg font-semibold mb-4 text-blue-800">Material a prestar</h3>
                      <form onSubmit={handleSearchBook} className="flex gap-4 mb-4">
                          <input
                          type="text"
                          className="flex-1 border border-gray-300 p-3 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="Busca por nro. de inventario..."
                          value={invInput}
                          onChange={(e) => setInvInput(e.target.value)}
                          autoFocus
                          />
                          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 shadow-md transition duration-150 shrink-0">
                          Verificar
                          </button>
                      </form>

                      {currentBook && (
                          <div className="border border-purple-200 bg-purple-50 p-4 rounded-lg flex flex-col gap-4">
                            <div className="flex gap-4 items-start">
                              <ImagenRegistro 
                                tipoMaterial={currentBook.tipo_material} 
                                titulo={currentBook.titulo}
                                inventarios={currentBook.ejemplares.map(e => e.inventario)}
                                className="w-16 h-24 border border-purple-200 bg-white shadow-sm rounded-lg flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-lg md:text-xl text-purple-900 leading-tight truncate" title={currentBook.titulo}>{currentBook.titulo}</h4>
                                <p className="text-purple-700 text-sm mt-0.5">Autor: {currentBook.responsabilidad_principal?.nombre || '—'}</p>
                                <p className="text-xs text-purple-600 mt-1">
                                  Inv: <strong className="font-mono">{currentBook.ejemplares[currentCopyIndex].inventario}</strong>
                                  {currentBook.ejemplares[currentCopyIndex].ubicacion && ` | Ubicación: ${currentBook.ejemplares[currentCopyIndex].ubicacion}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end flex-wrap gap-2 pt-2 border-t border-purple-200/40">
                              <button 
                                onClick={handleDoLoan}
                                className="bg-green-600 text-white px-5 py-2.5 rounded-lg shadow hover:bg-green-700 font-bold"
                              >
                                CONFIRMAR PRÉSTAMO
                              </button>
                              <button 
                                type="button"
                                onClick={handleToggleManualDate}
                                className="bg-white text-blue-600 border border-blue-200 px-5 py-2.5 rounded-lg shadow hover:bg-blue-50 font-bold transition flex items-center gap-1.5"
                              >
                                📅 Préstamo flexible
                              </button>
                            </div>

                            {showManualDate && (
                              <div className="p-5 bg-white border border-blue-100 rounded-xl shadow-md space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Desde</label>
                                    <input 
                                      type="date"
                                      value={manualStartDate}
                                      onChange={(e) => setManualStartDate(e.target.value)}
                                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-sans w-full"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Hasta</label>
                                    <input 
                                      type="date"
                                      value={manualDate}
                                      onChange={(e) => setManualDate(e.target.value)}
                                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-sans w-full"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                  <button
                                    type="button"
                                    onClick={handleDoCustomLoan}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition shadow-md w-full sm:w-auto text-center"
                                  >
                                    Confirmar préstamo con estas fechas
                                  </button>
                                </div>
                                <p className="text-xs text-gray-400">Permite registrar un préstamo realizado en el pasado o definir plazos de devolución flexibles libremente.</p>
                              </div>
                            )}
                          </div>
                      )}
                      </div>
                  </div>
                  </div>
                  </div>
              )}
          </div>
      )}

      {/* --- PESTAÑA: DEVOLUCIÓN RÁPIDA --- */}
      {activeTab === 'devolucion' && (
          <div className="max-w-2xl mx-auto mt-8">
              <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100 relative">
                  <h3 className="text-lg font-semibold mb-4 text-green-800">Buscar material a devolver</h3>
                  
                  <form onSubmit={handleQuickReturn} className="flex gap-4 mb-6">
                      <input
                          type="text"
                          className="flex-1 border border-gray-300 p-3 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                          placeholder="Busca por nro. de inventario..."
                          value={returnInvInput}
                          onChange={(e) => setReturnInvInput(e.target.value)}
                          autoFocus
                      />
                      <button 
                          type="submit" 
                          className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 shadow-md transition duration-150 shrink-0"
                      >
                          Devolver
                      </button>
                  </form>

                  {returnMessage && (
                      <div className={`p-4 rounded-lg ${returnMessage.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                          <p className="text-sm font-medium">{returnMessage.text}</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- PESTAÑA: MOROSOS / VENCIDOS --- */}
      {activeTab === 'morosos' && (
          <div className="mt-6 space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-800 font-sans mb-1 col-span-full">Usuarios con devoluciones pendientes</h3>
                  <p className="text-sm text-gray-500 font-sans mb-6">Listado de usuarios que al día de hoy tienen material prestado vencido con respecto a la fecha establecida de devolución.</p>

                  {/* BÚSQUEDA Y FILTRADO */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                      <div className="flex-1 relative">
                          <input 
                              type="text"
                              className="w-full border border-gray-300 rounded-lg p-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 text-gray-900 font-sans"
                              placeholder="Buscar moroso por apellido, nombre, DNI o material..."
                              value={morososSearch}
                              onChange={(e) => setMorososSearch(e.target.value)}
                          />
                                        {morososSearch && (
                              <button 
                                  onClick={() => setMorososSearch('')}
                                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 font-bold p-1 text-xs"
                              >
                                  ✕
                              </button>
                          )}
                      </div>
                  </div>

                  {/* TARJETAS RESUMEN (estilo Bento) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
                          <div>
                              <span className="text-xs font-semibold text-red-700/80 uppercase tracking-wider font-sans">Total de Deudores</span>
                              <p className="text-2xl font-bold text-red-900 mt-0.5">{overdueLoans.length}</p>
                          </div>
                          <span className="text-3xl">⚠️</span>
                      </div>
                      <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex items-center justify-between">
                          <div>
                              <span className="text-xs font-semibold text-amber-700/80 uppercase tracking-wider font-sans">Mayor Demora</span>
                              <p className="text-2xl font-bold text-amber-900 mt-0.5">
                                  {overdueLoans.length > 0 ? `${Math.max(...overdueLoans.map(o => o.maxDiasVencidos))} días` : '-'}
                              </p>
                          </div>
                          <span className="text-3xl">⏳</span>
                      </div>
                  </div>

                  {loadingMorosos ? (
                      <div className="py-12 text-center text-gray-500 font-sans">
                          <p className="animate-pulse">Cargando listado de deudores...</p>
                      </div>
                  ) : overdueLoans.length === 0 ? (
                      <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <p className="text-2xl mb-2">😌🎉</p>
                          <p className="text-gray-800 font-semibold font-sans mb-1">¡Al día! No hay préstamos vencidos en este momento.</p>
                          <p className="text-xs text-gray-400 font-sans font-sans">Todos los préstamos activos están dentro de los plazos reglamentarios.</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {overdueLoans.filter(m => {
                              const query = morososSearch.toLowerCase().trim();
                              if (!query) return true;
                              return (
                                  (m.usuario_nombre && m.usuario_nombre.toLowerCase().includes(query)) ||
                                  (m.usuario_dni && m.usuario_dni.toLowerCase().includes(query)) ||
                                  m.prestamos.some((p: any) => 
                                      (p.recurso_titulo && p.recurso_titulo.toLowerCase().includes(query)) ||
                                      (p.inventario_ejemplar && p.inventario_ejemplar.toLowerCase().includes(query))
                                  )
                              );
                          }).map((moroso) => {
                              const hasPhone = !!moroso.usuario_telefono;
                              
                              return (
                                  <div 
                                      key={moroso.usuario_id} 
                                      className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-red-200 hover:shadow-md transition duration-150 flex flex-col md:flex-row justify-between items-start gap-4"
                                  >
                                      <div className="flex-1 space-y-3 w-full min-w-0">
                                          {/* Usuario e info básica */}
                                          <div className="flex flex-wrap items-center gap-2">
                                              <UserAvatar 
                                                  dni={moroso.usuario_dni} 
                                                  nombre={moroso.usuario_nombre.split(' ')[0]} 
                                                  apellido={moroso.usuario_nombre.split(' ').slice(1).join(' ')} 
                                                  className="w-8 h-8 flex-shrink-0"
                                                  fallbackSize="text-xs"
                                              />
                                              <span className="font-bold text-gray-900 text-base font-sans">{moroso.usuario_nombre}</span>
                                              <span className="text-sm text-gray-500 font-sans">DNI {moroso.usuario_dni} - {moroso.usuario_rol}</span>
                                              <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded font-sans">
                                                  Máxima demora: {moroso.maxDiasVencidos} {moroso.maxDiasVencidos === 1 ? 'día' : 'días'}
                                              </span>
                                          </div>

                                          {/* Materiales con demora */}
                                          <div className="space-y-2">
                                              {moroso.prestamos.map((p: any) => (
                                                  <div key={p.id} className="p-3 bg-red-50/10 rounded-lg border border-red-100/50 flex gap-3 items-center">
                                                      <ImagenRegistro 
                                                        tipoMaterial="Libro" 
                                                        titulo={p.recurso_titulo}
                                                        inventarios={p.recurso_inventarios || [p.inventario_ejemplar]}
                                                        className="w-10 h-14 border border-red-100 bg-white flex-shrink-0"
                                                        hideFallback={true}
                                                      />
                                                      <div className="flex-1 min-w-0">
                                                          <span className="font-semibold text-gray-800 font-sans block truncate" title={p.recurso_titulo}>{p.recurso_titulo}</span>
                                                          <div className="flex flex-wrap text-xs text-gray-500 gap-x-4 gap-y-1 mt-1 font-sans">
                                                              <span>Nro de Inventario: <strong className="font-mono text-gray-700">{p.inventario_ejemplar}</strong></span>
                                                              <span>Venció el: <strong className="text-gray-700">{new Date(p.fecha_devolucion_estimada).toLocaleDateString()}</strong></span>
                                                              <span className="text-red-600 font-semibold">({p.diasVencidos} {p.diasVencidos === 1 ? 'día' : 'días'} de demora)</span>
                                                          </div>
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>

                                          {/* Datos de Contacto */}
                                          <div className="flex flex-wrap text-xs text-gray-500 gap-x-4 gap-y-1 font-sans">
                                              {moroso.usuario_telefono && (
                                                  <span className="flex items-center gap-1">
                                                      <span>📞</span>  {moroso.usuario_telefono}
                                                  </span>
                                              )}
                                              {moroso.usuario_email && (
                                                  <span className="flex items-center gap-1">
                                                      <span>✉️</span> {moroso.usuario_email}
                                                  </span>
                                              )}
                                              {!moroso.usuario_telefono && !moroso.usuario_email && (
                                                  <span className="text-gray-400 italic">No tiene información de contacto registrada.</span>
                                              )}
                                          </div>
                                      </div>

                                      {/* Acciones para Moroso */}
                                      <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 justify-end self-center">
                                          {hasPhone ? (
                                              <a 
                                                  href={getWhatsAppLink(moroso)}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-transparent bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-sm transition whitespace-nowrap"
                                              >
                                                  <span className="text-base">💬</span> Enviar WhatsApp ({moroso.prestamos.length})
                                              </a>
                                          ) : (
                                              <button 
                                                  disabled
                                                  className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-dashed border-gray-300 bg-gray-50 text-gray-400 rounded-lg text-xs font-bold transition cursor-not-allowed whitespace-nowrap"
                                                  title="El usuario no tiene teléfono registrado"
                                              >
                                                  <span>⚠️</span> Sin Teléfono
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          </div>
      )}
      
      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
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

      {/* MODAL DE PRÉSTAMOS ACTIVOS */}
      {showActiveLoansModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Cabecera */}
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h3 className="text-base font-bold text-gray-800">Préstamos activos ({allActiveLoans.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowActiveLoansModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition text-base leading-none"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Lista Compacta con Scroll */}
            <div className="p-4 overflow-y-auto max-h-[65vh] flex-1 divide-y divide-gray-100">
              {loadingActiveLoans ? (
                <div className="text-center py-10 text-gray-500 text-sm animate-pulse">
                  Cargando préstamos activos...
                </div>
              ) : allActiveLoans.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  No hay préstamos activos en este momento.
                </div>
              ) : (
                allActiveLoans.map((loan) => {
                  const hoy = new Date();
                  hoy.setHours(0, 0, 0, 0);
                  const devEst = new Date(loan.fecha_devolucion_estimada);
                  devEst.setHours(0, 0, 0, 0);
                  const estaVencido = hoy > devEst;

                  const inv = loan.inventario_ejemplar || loan.libro_inventario || '-';
                  const titulo = loan.recurso_titulo || loan.libro_titulo || 'Sin título';
                  const usuario = loan.usuario_nombre || 'Sin usuario';
                  const dni = loan.usuario_dni ? `(DNI: ${loan.usuario_dni})` : '';

                  const rawSalida = loan.fecha_salida || loan.fecha_prestamo;
                  const fPrestamo = rawSalida && !isNaN(new Date(rawSalida).getTime())
                    ? new Date(rawSalida).toLocaleDateString('es-AR')
                    : '-';

                  const rawDevolucion = loan.fecha_devolucion_estimada;
                  const fDevolucion = rawDevolucion && !isNaN(new Date(rawDevolucion).getTime())
                    ? new Date(rawDevolucion).toLocaleDateString('es-AR')
                    : '-';

                  return (
                    <div key={loan.id} className="py-2 flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 text-xs">
                      <div className="text-gray-800 flex-1 min-w-0">
                        <span className="text-gray-500 mr-1.5">
                          Inv: {inv}
                        </span>
                        <strong className="text-gray-900">{titulo}</strong>
                        <span className="text-gray-400 mx-1.5">•</span>
                        <span className="text-gray-600">{usuario} {dni}</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-3 whitespace-nowrap">
                        <span className="text-gray-600">Desde: {fPrestamo}</span>
                        <span className={estaVencido ? 'text-red-600' : 'text-gray-600'}>
                          Hasta: {fDevolucion}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Circulation;
