
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Usuario, RolUsuario, Prestamo, EstadoPrestamo } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { normalizarTexto } from '../utils/textUtils';
import { calculateAge } from '../utils/dateUtils';

const Users: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [messageModal, setMessageModal] = useState<{isOpen: boolean, title: string, message: string}>({isOpen: false, title: '', message: ''});
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
  
  // Estado para Creación/Edición
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Usuario>>({
    nombre: '', apellido: '', dni: '', rol: RolUsuario.ALUMNO, activo: true, email: '', telefono: '', fecha_nacimiento: ''
  });

  // Estado para el Historial
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<Usuario | null>(null);
  const [userHistory, setUserHistory] = useState<Prestamo[]>([]);

  // Buscador
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsuarios = usuarios.filter(u => {
    const query = normalizarTexto(searchTerm).trim();
    if (!query) return true;
    const fullNameStr = normalizarTexto(`${u.apellido} ${u.nombre}`);
    const nameFullStr = normalizarTexto(`${u.nombre} ${u.apellido}`);
    const dniStr = normalizarTexto(u.dni);
    return fullNameStr.includes(query) || nameFullStr.includes(query) || dniStr.includes(query);
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const list = await dbService.listarUsuarios();
    setUsuarios(list);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if(formData.nombre && formData.apellido && formData.dni && formData.rol) {
      // Validar DNI duplicado
      const existente = await dbService.buscarUsuarioPorDNI(formData.dni);
      if (existente && existente.id !== editingId) {
          setFormError(`Ya existe un usuario registrado con el DNI ${formData.dni} (${existente.apellido}, ${existente.nombre}).`);
          return;
      }

      if (editingId) {
          // Actualizar
          await dbService.actualizarUsuario({ ...formData, id: editingId } as Usuario);
      } else {
          // Crear
          await dbService.crearUsuario(formData as Omit<Usuario, 'id'>);
      }
      closeModal();
      loadUsers();
    }
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
      setFormError(null);
      setFormData({ nombre: '', apellido: '', dni: '', rol: RolUsuario.ALUMNO, activo: true, email: '', telefono: '', fecha_nacimiento: '' });
  };

  const handleEdit = (user: Usuario) => {
      setEditingId(user.id);
      setFormData(user);
      setIsModalOpen(true);
  };

  const handleDelete = (user: Usuario) => {
      setConfirmModal({
          isOpen: true,
          title: 'Confirmar eliminación',
          message: `¿Está seguro de eliminar al usuario ${user.apellido}, ${user.nombre}? Esta acción no se puede deshacer.`,
          onConfirm: async () => {
              try {
                  await dbService.eliminarUsuario(user.id);
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  await loadUsers(); // Recargar lista
              } catch (error: any) {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  setMessageModal({
                      isOpen: true,
                      title: 'Error al eliminar',
                      message: error.message || "Error al eliminar usuario"
                  });
              }
          }
      });
  };

  const handleViewHistory = async (user: Usuario) => {
      setSelectedUserForHistory(user);
      const history = await dbService.obtenerHistorialPrestamos(user.id);
      setUserHistory(history);
      setHistoryModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Usuarios</h2>
        <div className="flex gap-3">
          <button 
            onClick={() => { closeModal(); setIsModalOpen(true); }}
            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-medium"
          >
            + Nuevo usuario
          </button>
        </div>
      </div>

      {/* BUSCADOR DE USUARIOS */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-400 pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar por apellido, nombre o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 font-sans"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-sm"
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apellido y Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Edad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsuarios.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500 italic">
                  No se encontraron usuarios que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredUsuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-3">
                    <UserAvatar dni={u.dni} nombre={u.nombre} apellido={u.apellido} className="w-9 h-9 flex-shrink-0" fallbackSize="text-xs" />
                    <span>{u.apellido}, {u.nombre}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.dni}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{calculateAge(u.fecha_nacimiento)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.rol}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {u.email && <div className="text-xs">{u.email}</div>}
                  {u.telefono && <div className="text-xs">{u.telefono}</div>}
                  {!u.email && !u.telefono && <span className="text-gray-400">-</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                   {u.activo ? (
                     <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Activo</span>
                   ) : (
                     <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Baja</span>
                   )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                        <button 
                            type="button"
                            onClick={() => handleViewHistory(u)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded hover:bg-blue-100"
                            title="Ver historial de préstamos"
                        >
                            📜
                        </button>
                        <button 
                            type="button"
                            onClick={() => handleEdit(u)}
                            className="text-yellow-600 hover:text-yellow-900 bg-yellow-50 p-2 rounded hover:bg-yellow-100"
                            title="Editar usuario"
                        >
                            ✏️
                        </button>
                        <button 
                            type="button"
                            onClick={() => handleDelete(u)}
                            className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded hover:bg-red-100"
                            title="Eliminar usuario"
                        >
                            🗑️
                        </button>
                    </div>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Cabecera */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800">
                {editingId ? 'Editar usuario' : 'Registrar nuevo usuario'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition text-base leading-none"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Formulario con cuerpo scrolleable y footer fijo */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {formError && (
                  <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded text-sm">
                    {formError}
                  </div>
                )}
                
                {/* Apellido y Nombre */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Apellido *</label>
                    <input required type="text" className="mt-1 w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                    <input required type="text" className="mt-1 w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                  </div>
                </div>

                {/* DNI y Rol */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DNI *</label>
                    <input required type="text" className="mt-1 w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rol *</label>
                    <select className="mt-1 w-full border border-gray-300 p-2 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                      {Object.values(RolUsuario).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {/* Estado y Fecha de Nacimiento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="flex items-center space-x-2 cursor-pointer mt-2 sm:mt-6">
                      <input 
                        type="checkbox" 
                        checked={formData.activo} 
                        onChange={e => setFormData({...formData, activo: e.target.checked})}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="text-gray-700 text-sm font-medium">Usuario Activo</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
                    <input type="date" className="mt-1 w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.fecha_nacimiento || ''} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} />
                  </div>
                </div>

                {/* Contacto */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                    <input type="text" className="mt-1 w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" className="mt-1 w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
                
                {/* Nota / Observación */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nota / Observación</label>
                  <input type="text" className="mt-1 w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.nota || ''} onChange={e => setFormData({...formData, nota: e.target.value})} placeholder="Ej: Profe de Física..." />
                </div>
              </div>

              {/* Pie del modal */}
              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium shadow-sm transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-green-600 rounded-lg text-white hover:bg-green-700 text-sm font-medium shadow-sm transition">
                  {editingId ? 'Guardar Cambios' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORIAL */}
      {historyModalOpen && selectedUserForHistory && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col border border-gray-200">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                      <div className="flex items-center gap-3">
                          <UserAvatar dni={selectedUserForHistory.dni} nombre={selectedUserForHistory.nombre} apellido={selectedUserForHistory.apellido} className="w-10 h-10 flex-shrink-0 shadow-sm" fallbackSize="text-sm" />
                          <h3 className="text-lg font-bold text-gray-800">
                              Historial de préstamos: {selectedUserForHistory.apellido}, {selectedUserForHistory.nombre}
                          </h3>
                      </div>
                      <button 
                          type="button"
                          onClick={() => setHistoryModalOpen(false)} 
                          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition text-base leading-none"
                          title="Cerrar"
                      >
                          ✕
                      </button>
                  </div>
                  
                  <div className="overflow-y-auto flex-1">
                      {userHistory.length === 0 ? (
                          <p className="text-gray-500 italic p-4 text-center">Este usuario no tiene historial de préstamos.</p>
                      ) : (
                          <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0">
                                  <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recurso</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Desde</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hasta</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                  </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                  {userHistory.map(p => (
                                      <tr key={p.id}>
                                          <td className="px-4 py-2 text-sm text-gray-900 font-medium">{(p.recurso_titulo || p.libro_titulo)} <span className="text-xs text-gray-400">({p.inventario_ejemplar})</span></td>
                                          <td className="px-4 py-2 text-sm text-gray-500">{new Date(p.fecha_salida).toLocaleDateString()}</td>
                                          <td className="px-4 py-2 text-sm text-gray-500">
                                              {p.fecha_devolucion_real ? new Date(p.fecha_devolucion_real).toLocaleDateString() : '-'}
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                              {p.estado === EstadoPrestamo.ACTIVO && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Activo</span>}
                                              {p.estado === EstadoPrestamo.VENCIDO && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Vencido</span>}
                                              {p.estado === EstadoPrestamo.DEVUELTO && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Devuelto</span>}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DE MENSAJE */}
      {messageModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl border border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800 border-b border-gray-200 pb-2">{messageModal.title}</h3>
            <p className="text-gray-700 mb-6">{messageModal.message}</p>
            <div className="flex justify-end">
              <button 
                onClick={() => setMessageModal({isOpen: false, title: '', message: ''})} 
                className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700 font-medium"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-fade-in">
                  <div className="p-6">
                      <div className="flex items-center gap-3 text-red-600 mb-3">
                          <span className="text-2xl">⚠️</span>
                          <h3 className="text-xl font-bold text-red-800">{confirmModal.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{confirmModal.message}</p>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2">
                      <button
                          type="button"
                          onClick={() => {
                              if (confirmModal.onConfirm) confirmModal.onConfirm();
                          }}
                          className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded shadow-sm focus:outline-none transition-colors"
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
    </div>
  );
};

export default Users;
