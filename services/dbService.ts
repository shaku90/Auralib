
import { Recurso, Usuario, Prestamo, Configuracion, EstadoRecurso, EstadoPrestamo, BackupData } from '../types';
import { CURRENT_SEED_VERSION, RECURSOS_SEMILLA, USUARIOS_SEMILLA, PRESTAMOS_SEMILLA, INDICES_SEMILLA } from './seedData';
import { normalizarTexto } from '../utils/textUtils';

/**
 * SERVICIO DE BASE DE DATOS LOCAL (localStorage)
 */

const STORAGE_KEYS = {
  RECURSOS: 'sigb_recursos',
  USUARIOS: 'sigb_usuarios',
  PRESTAMOS: 'sigb_prestamos',
  AUTORIDADES: 'sigb_autoridades',
  INDICES: 'sigb_indices',
  CONFIG: 'sigb_config'
};

// Datos semilla
const seedData = () => {
  const SEED_VERSION_KEY = 'sigb_seed_version';
  const rawRecursos = localStorage.getItem(STORAGE_KEYS.RECURSOS);
  const seedVersion = localStorage.getItem(SEED_VERSION_KEY);
  
  let shouldSeed = (rawRecursos === null || seedVersion !== CURRENT_SEED_VERSION);
  if (rawRecursos && !shouldSeed) {
    try {
      JSON.parse(rawRecursos);
    } catch (e) {
      shouldSeed = true;
    }
  }

  if (shouldSeed) {
    // Limpiar datos obsoletos para forzar la recreación con datos semilla ricos
    localStorage.removeItem(STORAGE_KEYS.RECURSOS);
    localStorage.removeItem(STORAGE_KEYS.USUARIOS);
    localStorage.removeItem(STORAGE_KEYS.PRESTAMOS);
    localStorage.removeItem(STORAGE_KEYS.INDICES);
    localStorage.removeItem(STORAGE_KEYS.AUTORIDADES);

    localStorage.setItem(STORAGE_KEYS.RECURSOS, JSON.stringify(RECURSOS_SEMILLA));
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(USUARIOS_SEMILLA));
    localStorage.setItem(STORAGE_KEYS.PRESTAMOS, JSON.stringify(PRESTAMOS_SEMILLA));
    localStorage.setItem(STORAGE_KEYS.INDICES, JSON.stringify(INDICES_SEMILLA));

    const autoresSemilla = Array.from(new Set(RECURSOS_SEMILLA.flatMap(r => {
      const list = [];
      if (r.responsabilidad_principal?.nombre) {
        list.push(r.responsabilidad_principal.nombre.trim());
      }
      if (r.responsabilidad_secundaria) {
        r.responsabilidad_secundaria.forEach(sec => {
          if (sec.nombre) list.push(sec.nombre.trim());
        });
      }
      return list;
    }))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
    localStorage.setItem(STORAGE_KEYS.AUTORIDADES, JSON.stringify(autoresSemilla));

    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION);
  }
};

seedData();

// Helpers de simulación
const getList = <T>(key: string): T[] => {
  const rawData = localStorage.getItem(key);
  if (!rawData) return [];
  try {
    const list = JSON.parse(rawData);
    if (!Array.isArray(list)) return [];
    if (key === STORAGE_KEYS.USUARIOS) {
      return list.map((u: any) => {
        if (u && u.curso_rol && !u.rol) {
          const { curso_rol, ...rest } = u;
          return { ...rest, rol: curso_rol };
        }
        return u;
      }) as T[];
    }
    return list as T[];
  } catch (error) {
    console.error("Error al parsear clave de localStorage:", key, error);
    return [];
  }
};
const saveList = (key: string, data: any[]) => localStorage.setItem(key, JSON.stringify(data));

// Actualización automática de autoridades y términos de indización al guardar recursos
const registrarAutoresYTemas = async (recurso: Partial<Recurso>) => {
  // 1. Temas de indización
  if (recurso.temas && recurso.temas.length > 0) {
    const indicesActuales = getList<string>(STORAGE_KEYS.INDICES);
    const setIndices = new Set([...indicesActuales, ...recurso.temas.map(t => t.toUpperCase().trim())]);
    saveList(STORAGE_KEYS.INDICES, Array.from(setIndices).sort((a, b) => a.localeCompare(b, 'es')));
  }

  // 2. Autoridades de autores
  const autores: string[] = [];
  if (recurso.responsabilidad_principal?.nombre) {
    autores.push(recurso.responsabilidad_principal.nombre.trim());
  }
  if (recurso.responsabilidad_secundaria) {
    recurso.responsabilidad_secundaria.forEach(sec => {
      if (sec.nombre) autores.push(sec.nombre.trim());
    });
  }
  if (autores.length > 0) {
    const autoresActuales = await dbService.listarAutoridades();
    const lowerActuales = new Set(autoresActuales.map(a => a.toLowerCase().trim()));
    const nuevosAutores = [...autoresActuales];
    autores.forEach(a => {
      if (a && !lowerActuales.has(a.toLowerCase().trim())) {
        nuevosAutores.push(a);
        lowerActuales.add(a.toLowerCase().trim());
      }
    });
    saveList(STORAGE_KEYS.AUTORIDADES, nuevosAutores.sort((a, b) => a.localeCompare(b, 'es')));
  }
};

export const dbService = {
  // --- SISTEMA Y BACKUP ---
  resetearBaseDeDatos: async (): Promise<void> => {
    localStorage.removeItem(STORAGE_KEYS.RECURSOS);
    localStorage.removeItem(STORAGE_KEYS.USUARIOS);
    localStorage.removeItem(STORAGE_KEYS.PRESTAMOS);
    localStorage.removeItem(STORAGE_KEYS.INDICES);
    localStorage.removeItem(STORAGE_KEYS.AUTORIDADES);
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
    seedData();
  },
  vaciarBaseDeDatos: async (): Promise<void> => {
    localStorage.setItem(STORAGE_KEYS.RECURSOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PRESTAMOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INDICES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUTORIDADES, JSON.stringify([]));
    
    const defaultConfig: Configuracion = {
      nombre_biblioteca: '',
      dias_prestamo: 7
    };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(defaultConfig));
    localStorage.setItem('sigb_seed_version', CURRENT_SEED_VERSION);
  },
  getConfig: async (): Promise<Configuracion> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (!raw) return { nombre_biblioteca: '', dias_prestamo: 7 };
      return JSON.parse(raw);
    } catch (e) {
      return { nombre_biblioteca: '', dias_prestamo: 7 };
    }
  },
  saveConfig: async (config: Configuracion): Promise<void> => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },
  exportarDatos: async (): Promise<BackupData> => {
    return {
      recursos: getList<Recurso>(STORAGE_KEYS.RECURSOS),
      usuarios: getList<Usuario>(STORAGE_KEYS.USUARIOS),
      prestamos: getList<Prestamo>(STORAGE_KEYS.PRESTAMOS),
      indices: getList<string>(STORAGE_KEYS.INDICES),
      autoridades: await dbService.listarAutoridades(),
      config: await dbService.getConfig(),
      timestamp: new Date().toISOString()
    };
  },
  importarDatos: async (data: BackupData): Promise<void> => {
    if (!data.recursos || !data.usuarios) throw new Error("Formato de backup inválido");
    
    localStorage.setItem(STORAGE_KEYS.RECURSOS, JSON.stringify(data.recursos));
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(data.usuarios));
    localStorage.setItem(STORAGE_KEYS.PRESTAMOS, JSON.stringify(data.prestamos));
    localStorage.setItem(STORAGE_KEYS.INDICES, JSON.stringify(data.indices || []));
    localStorage.setItem(STORAGE_KEYS.AUTORIDADES, JSON.stringify(data.autoridades || []));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data.config || {}));
    localStorage.setItem('sigb_seed_version', CURRENT_SEED_VERSION);
  },

  verificarYEjecutarBackupAutomatico: async (forzar: boolean = false): Promise<{ ejecutado: boolean; mensaje?: string }> => {
    const config = await dbService.getConfig();
    if (!config.backup_auto_habilitado && !forzar) {
      return { ejecutado: false };
    }

    const diasIntervalo = config.backup_intervalo_dias || 7;
    const ultimaFechaStr = config.ultimo_backup_fecha;

    let correspondeBackup = false;
    if (forzar || !ultimaFechaStr) {
      correspondeBackup = true;
    } else {
      const ultimaFecha = new Date(ultimaFechaStr);
      const ahora = new Date();
      const diferenciaMs = ahora.getTime() - ultimaFecha.getTime();
      const diasPasados = diferenciaMs / (1000 * 60 * 60 * 24);
      if (diasPasados >= diasIntervalo) {
        correspondeBackup = true;
      }
    }

    if (!correspondeBackup) {
      return { ejecutado: false };
    }

    const backupData = await dbService.exportarDatos();
    const fechaHoyStr = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `auralib_backup_auto_${fechaHoyStr}.json`;
    const jsonContent = JSON.stringify(backupData, null, 2);

    const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

    if (isElectron && config.backup_dir) {
      try {
        const res = await (window as any).electronAPI.invoke('save-backup-file', {
          folderPath: config.backup_dir,
          filename: nombreArchivo,
          content: jsonContent
        });

        if (res && res.success) {
          config.ultimo_backup_fecha = new Date().toISOString();
          await dbService.saveConfig(config);
          return { ejecutado: true, mensaje: `Copia de seguridad guardada en: ${res.fullPath}` };
        } else {
          console.warn('Error al guardar respaldo automático en Electron:', res?.error);
          return { ejecutado: false, mensaje: res?.error || 'No se pudo guardar el archivo de respaldo.' };
        }
      } catch (err: any) {
        console.error('Excepción guardando respaldo automático en Electron:', err);
        return { ejecutado: false, mensaje: err.message };
      }
    } else if (!isElectron && (config.backup_auto_habilitado || forzar)) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonContent);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", nombreArchivo);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();

      config.ultimo_backup_fecha = new Date().toISOString();
      await dbService.saveConfig(config);
      return { ejecutado: true, mensaje: `Copia de seguridad descargada: ${nombreArchivo}` };
    }

    return { ejecutado: false };
  },

  // --- USUARIOS ---
  buscarUsuarioPorDNI: async (dni: string): Promise<Usuario | undefined> => {
    const usuarios = getList<Usuario>(STORAGE_KEYS.USUARIOS);
    return usuarios.find(u => u.dni === dni);
  },
  
  // NUEVO METODO DE BÚSQUEDA FLEXIBLE
  buscarUsuarios: async (termino: string): Promise<Usuario[]> => {
      const usuarios = getList<Usuario>(STORAGE_KEYS.USUARIOS);
      if(!termino) return [];
      const t = normalizarTexto(termino);
      
      return usuarios.filter(u => 
        normalizarTexto(u.dni).includes(t) || 
        normalizarTexto(u.nombre).includes(t) || 
        normalizarTexto(u.apellido).includes(t)
      );
  },

  crearUsuario: async (usuario: Omit<Usuario, 'id'>): Promise<Usuario> => {
    const usuarios = getList<Usuario>(STORAGE_KEYS.USUARIOS);
    const newId = (Math.max(...usuarios.map(u => u.id), 0) || 0) + 1;
    const nuevo = { ...usuario, id: newId };
    usuarios.push(nuevo);
    saveList(STORAGE_KEYS.USUARIOS, usuarios);
    return nuevo;
  },
  crearUsuariosMasivo: async (nuevosUsuarios: Omit<Usuario, 'id'>[]): Promise<void> => {
    const usuarios = getList<Usuario>(STORAGE_KEYS.USUARIOS);
    let currentId = (Math.max(...usuarios.map(u => u.id), 0) || 0) + 1;
    
    for (const u of nuevosUsuarios) {
      usuarios.push({ ...u, id: currentId++ });
    }
    
    saveList(STORAGE_KEYS.USUARIOS, usuarios);
  },
  actualizarUsuario: async (usuario: Usuario): Promise<void> => {
    const usuarios = getList<Usuario>(STORAGE_KEYS.USUARIOS);
    const index = usuarios.findIndex(u => u.id === usuario.id);
    if (index !== -1) {
      usuarios[index] = usuario;
      saveList(STORAGE_KEYS.USUARIOS, usuarios);
    }
  },
  eliminarUsuario: async (id: number): Promise<void> => {
      // Verificar si tiene préstamos activos
      const prestamos = getList<Prestamo>(STORAGE_KEYS.PRESTAMOS);
      // Usar igualdad flexible (==) para manejar posibles discrepancias de tipo string/number en localStorage
      const tienePendientes = prestamos.some(p => p.usuario_id == id && p.estado === EstadoPrestamo.ACTIVO);
      
      if(tienePendientes) {
          throw new Error("No se puede eliminar el usuario porque tiene libros pendientes de devolución.");
      }
      
      let usuarios = getList<Usuario>(STORAGE_KEYS.USUARIOS);
      const initialLength = usuarios.length;
      
      // Filtrar usando desigualdad flexible para mayor seguridad con datos de localStorage
      usuarios = usuarios.filter(u => u.id != id);
      
      if (usuarios.length === initialLength) {
        console.warn('Advertencia: No se encontró el usuario con ID ' + id + ' para eliminar.');
      }
      
      saveList(STORAGE_KEYS.USUARIOS, usuarios);
  },
  listarUsuarios: async (): Promise<Usuario[]> => {
    return getList<Usuario>(STORAGE_KEYS.USUARIOS);
  },

  // --- RECURSOS ---
  buscarRecursoPorInventario: async (inventario: string): Promise<{recurso: Recurso, ejemplarIndex: number} | undefined> => {
    const recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);
    for (let i = 0; i < recursos.length; i++) {
      const recurso = recursos[i];
      const ejemplarIndex = recurso.ejemplares.findIndex(e => e.inventario === inventario);
      if (ejemplarIndex !== -1) {
        return { recurso, ejemplarIndex };
      }
    }
    return undefined;
  },
  
  crearRecurso: async (recurso: Omit<Recurso, 'id'>): Promise<Recurso> => {
    const recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);
    const newId = (Math.max(...recursos.map(r => r.id), 0) || 0) + 1;
    const nuevo = { ...recurso, id: newId };
    recursos.push(nuevo);
    saveList(STORAGE_KEYS.RECURSOS, recursos);

    await registrarAutoresYTemas(recurso);

    return nuevo;
  },

  actualizarRecurso: async (recurso: Recurso): Promise<void> => {
    const recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);
    const index = recursos.findIndex(r => r.id === recurso.id);
    if (index !== -1) {
      recursos[index] = recurso;
      saveList(STORAGE_KEYS.RECURSOS, recursos);

      await registrarAutoresYTemas(recurso);
    }
  },
  
  listarRecursos: async (filtro?: string): Promise<Recurso[]> => {
    let recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);
    
    if (filtro) {
       const f = normalizarTexto(filtro);
       const matchArrayOrString = (val: string | string[] | undefined): boolean => {
         if (!val) return false;
         if (Array.isArray(val)) {
           return val.some(i => normalizarTexto(i).includes(f));
         }
         return normalizarTexto(val).includes(f);
       };

       return recursos.filter(r => 
         normalizarTexto(r.titulo).includes(f) || 
         (r.titulo_uniforme && normalizarTexto(r.titulo_uniforme).includes(f)) ||
         (r.titulo_clave && normalizarTexto(r.titulo_clave).includes(f)) ||
         normalizarTexto(r.responsabilidad_principal.nombre).includes(f) ||
         (r.responsabilidad_secundaria && r.responsabilidad_secundaria.some(sec => sec.nombre && normalizarTexto(sec.nombre).includes(f))) ||
         r.temas.some(t => normalizarTexto(t).includes(f)) ||
         r.ejemplares.some(e => normalizarTexto(e.inventario).includes(f) || (e.ubicacion && normalizarTexto(e.ubicacion).includes(f))) ||
         (r.contenido && r.contenido.some(c => normalizarTexto(c).includes(f))) ||
         matchArrayOrString(r.numero_normalizado) ||
         matchArrayOrString((r as any).numero_nomalizado) ||
         matchArrayOrString(r.coleccion)
       );
    }
    return recursos;
  },

  eliminarRecurso: async (id: number): Promise<void> => {
    const prestamos = getList<Prestamo>(STORAGE_KEYS.PRESTAMOS);
    // Verificar si tiene préstamos activos para este recurso
    const tienePendientes = prestamos.some(p => p.recurso_id == id && (p.estado === EstadoPrestamo.ACTIVO || p.estado === EstadoPrestamo.VENCIDO));
    
    if (tienePendientes) {
      throw new Error("No se puede eliminar el recurso porque tiene ejemplares actualmente en préstamo.");
    }
    
    let recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);
    recursos = recursos.filter(r => r.id != id);
    saveList(STORAGE_KEYS.RECURSOS, recursos);
  },

  actualizarEstadoEjemplar: async (recursoId: number, inventario: string, estado: EstadoRecurso): Promise<void> => {
      const recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);
      const recursoIdx = recursos.findIndex(r => r.id === recursoId);
      if (recursoIdx >= 0) {
          const ejemplarIdx = recursos[recursoIdx].ejemplares.findIndex(e => e.inventario === inventario);
          if (ejemplarIdx >= 0) {
             recursos[recursoIdx].ejemplares[ejemplarIdx].estado = estado;
             saveList(STORAGE_KEYS.RECURSOS, recursos);
          }
      }
  },

  // --- PRESTAMOS ---
  registrarPrestamo: async (usuarioId: number, recursoId: number, inventario: string, dias: number, fechaEstimadaISO?: string, fechaSalidaISO?: string): Promise<void> => {
    const prestamos = getList<Prestamo>(STORAGE_KEYS.PRESTAMOS);
    const fechaSalida = fechaSalidaISO ? new Date(fechaSalidaISO) : new Date();
    let fechaEstimada: Date;
    if (fechaEstimadaISO) {
      fechaEstimada = new Date(fechaEstimadaISO);
    } else {
      fechaEstimada = new Date(fechaSalida);
      fechaEstimada.setDate(fechaSalida.getDate() + dias);
    }

    const nuevo: Prestamo = {
      id: (Math.max(...prestamos.map(p => p.id), 0) || 0) + 1,
      usuario_id: usuarioId,
      recurso_id: recursoId,
      inventario_ejemplar: inventario,
      fecha_salida: fechaSalida.toISOString(),
      fecha_devolucion_estimada: fechaEstimada.toISOString(),
      estado: EstadoPrestamo.ACTIVO
    };
    
    prestamos.push(nuevo);
    saveList(STORAGE_KEYS.PRESTAMOS, prestamos);
    await dbService.actualizarEstadoEjemplar(recursoId, inventario, EstadoRecurso.PRESTADO);
  },

  devolverPrestamo: async (prestamoId: number): Promise<void> => {
      const prestamos = getList<Prestamo>(STORAGE_KEYS.PRESTAMOS);
      const idx = prestamos.findIndex(p => p.id === prestamoId);
      if(idx >= 0) {
          prestamos[idx].estado = EstadoPrestamo.DEVUELTO;
          prestamos[idx].fecha_devolucion_real = new Date().toISOString();
          saveList(STORAGE_KEYS.PRESTAMOS, prestamos);
          await dbService.actualizarEstadoEjemplar(prestamos[idx].recurso_id, prestamos[idx].inventario_ejemplar, EstadoRecurso.DISPONIBLE);
      }
  },

  renovarPrestamo: async (prestamoId: number, dias: number): Promise<void> => {
      const prestamos = getList<Prestamo>(STORAGE_KEYS.PRESTAMOS);
      const idx = prestamos.findIndex(p => p.id === prestamoId);
      if(idx >= 0) {
          const nuevaFechaEstimada = new Date();
          nuevaFechaEstimada.setDate(nuevaFechaEstimada.getDate() + dias);
          
          prestamos[idx].fecha_devolucion_estimada = nuevaFechaEstimada.toISOString();
          prestamos[idx].estado = EstadoPrestamo.ACTIVO;
          
          saveList(STORAGE_KEYS.PRESTAMOS, prestamos);
          await dbService.actualizarEstadoEjemplar(prestamos[idx].recurso_id, prestamos[idx].inventario_ejemplar, EstadoRecurso.PRESTADO);
      }
  },

  devolverPrestamoPorInventario: async (inventario: string): Promise<{titulo: string, usuario: string, diasVencidos: number}> => {
      const prestamos = getList<Prestamo>(STORAGE_KEYS.PRESTAMOS);
      const prestamoActivo = prestamos.find(p => p.inventario_ejemplar === inventario && (p.estado === EstadoPrestamo.ACTIVO || p.estado === EstadoPrestamo.VENCIDO));
      
      if (!prestamoActivo) {
          throw new Error("No se encontró un préstamo activo para este inventario.");
      }

      const recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);
      const usuarios = getList<Usuario>(STORAGE_KEYS.USUARIOS);
      
      const recurso = recursos.find(r => r.id === prestamoActivo.recurso_id);
      const usuario = usuarios.find(u => u.id === prestamoActivo.usuario_id);

      // Realizar devolución
      await dbService.devolverPrestamo(prestamoActivo.id);

      // Calcular si estaba vencido (simple diff en días)
      const hoy = new Date();
      const fechaEstimada = new Date(prestamoActivo.fecha_devolucion_estimada);
      const diffTime = hoy.getTime() - fechaEstimada.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      return {
          titulo: recurso?.titulo || 'Desconocido',
          usuario: usuario ? `${usuario.apellido}, ${usuario.nombre}` : 'Desconocido',
          diasVencidos: diffDays > 0 ? diffDays : 0
      };
  },

  listarPrestamosActivos: async (usuarioId?: number): Promise<Prestamo[]> => {
    let prestamos = getList<Prestamo>(STORAGE_KEYS.PRESTAMOS);
    if(usuarioId) {
        prestamos = prestamos.filter(p => p.usuario_id === usuarioId);
    }
    prestamos = prestamos.filter(p => p.estado === EstadoPrestamo.ACTIVO || p.estado === EstadoPrestamo.VENCIDO);

    const usuarios = getList<Usuario>(STORAGE_KEYS.USUARIOS);
    const recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);

    return prestamos.map(p => {
        const recurso = recursos.find(r => r.id === p.recurso_id);
        const usuario = usuarios.find(u => u.id === p.usuario_id);
        const usuarioNombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Desconocido';
        return {
            ...p,
            usuario_nombre: usuarioNombreCompleto,
            usuario_dni: usuario?.dni,
            recurso_titulo: recurso?.titulo,
            libro_titulo: recurso?.titulo, // caso de respaldo
            libro_inventario: p.inventario_ejemplar,
            recurso_inventarios: recurso ? recurso.ejemplares.map(e => e.inventario) : [p.inventario_ejemplar],
        };
    });
  },

  obtenerHistorialPrestamos: async (usuarioId: number): Promise<Prestamo[]> => {
    const prestamos = getList<Prestamo>(STORAGE_KEYS.PRESTAMOS);
    const usuarios = getList<Usuario>(STORAGE_KEYS.USUARIOS);
    const recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);

    return prestamos
      .filter(p => p.usuario_id === usuarioId)
      .map(p => {
        const recurso = recursos.find(r => r.id === p.recurso_id);
        const usuario = usuarios.find(u => u.id === p.usuario_id);
        return {
          ...p,
          usuario_nombre: usuario?.nombre,
          recurso_titulo: recurso?.titulo,
          libro_titulo: recurso?.titulo, // caso de respaldo
          recurso_inventarios: recurso ? recurso.ejemplares.map(e => e.inventario) : [p.inventario_ejemplar],
        };
      })
      .sort((a, b) => new Date(b.fecha_salida).getTime() - new Date(a.fecha_salida).getTime());
  },

  // --- INDIZACIÓN ---
  listarTerminosIndizacion: async (): Promise<string[]> => {
    return getList<string>(STORAGE_KEYS.INDICES).sort((a, b) => a.localeCompare(b, 'es'));
  },

  eliminarTerminoIndizacion: async (termino: string): Promise<void> => {
    // 1. Eliminar de la lista global de índices de materia
    const indices = getList<string>(STORAGE_KEYS.INDICES);
    const nuevosIndices = indices.filter(t => t.toUpperCase().trim() !== termino.toUpperCase().trim());
    saveList(STORAGE_KEYS.INDICES, nuevosIndices);

    // 2. Limpiar el término de todos los recursos del catálogo
    const recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);
    const recursosActualizados = recursos.map(r => {
      if (r.temas && r.temas.length > 0) {
        return {
          ...r,
          temas: r.temas.filter(t => t.toUpperCase().trim() !== termino.toUpperCase().trim())
        };
      }
      return r;
    });
    saveList(STORAGE_KEYS.RECURSOS, recursosActualizados);
  },

  actualizarTerminoIndizacion: async (terminoAnterior: string, nuevoTermino: string): Promise<void> => {
    const anteriorNormalizado = terminoAnterior.toUpperCase().trim();
    const nuevoNormalizado = nuevoTermino.trim();
    if (!nuevoNormalizado) return;

    // 1. Reemplazar en la lista global de índices de materia
    const indices = getList<string>(STORAGE_KEYS.INDICES);
    const nuevosIndices = indices.map(t => {
      if (t.toUpperCase().trim() === anteriorNormalizado) {
        return nuevoNormalizado;
      }
      return t;
    });

    // Asegurar que no haya duplicados tras el cambio (por si acaso el nuevo término ya existía)
    const indicesUnicos = Array.from(new Set(nuevosIndices.map(t => t.trim()))).sort((a, b) => a.localeCompare(b, 'es'));
    saveList(STORAGE_KEYS.INDICES, indicesUnicos);

    // 2. Reemplazar en todos los recursos del catálogo
    const recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);
    const recursosActualizados = recursos.map(r => {
      if (r.temas && r.temas.length > 0) {
        const temasActualizados = r.temas.map(t => {
          if (t.toUpperCase().trim() === anteriorNormalizado) {
            return nuevoNormalizado;
          }
          return t;
        });
        // Filtrar duplicados en los temas del recurso individual
        const temasUnicos = Array.from(new Set(temasActualizados.map(t => t.trim())));
        return {
          ...r,
          temas: temasUnicos
        };
      }
      return r;
    });
    saveList(STORAGE_KEYS.RECURSOS, recursosActualizados);
  },

  // --- CONTROL DE AUTORIDADES ---
  listarAutoridades: async (): Promise<string[]> => {
    const rawData = localStorage.getItem(STORAGE_KEYS.AUTORIDADES);
    if (rawData === null) {
      // Extraer dinámicamente de los recursos actuales para compatibilidad
      const recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);
      const list = Array.from(new Set(recursos.flatMap(r => {
        const autores = [];
        if (r.responsabilidad_principal?.nombre) {
          autores.push(r.responsabilidad_principal.nombre.trim());
        }
        if (r.responsabilidad_secundaria) {
          r.responsabilidad_secundaria.forEach(sec => {
            if (sec.nombre) autores.push(sec.nombre.trim());
          });
        }
        return autores;
      }))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
      saveList(STORAGE_KEYS.AUTORIDADES, list);
      return list;
    }
    
    try {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        const list = parsed.map((item: any) => {
          if (item && typeof item === 'object') {
            return (item.nombre || '').trim();
          }
          if (typeof item === 'string') {
            return item.trim();
          }
          return '';
        }).filter(Boolean);
        
        const cleanList = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'es'));
        if (parsed.some(item => item && typeof item === 'object')) {
          saveList(STORAGE_KEYS.AUTORIDADES, cleanList);
        }
        return cleanList;
      }
    } catch (e) {
      console.error("Error parsing authorities list:", e);
    }
    return [];
  },

  eliminarAutoridad: async (autor: string): Promise<void> => {
    const autorNormalizado = autor.toLowerCase().trim();
    
    // 1. Eliminar de la lista global de autoridades
    const autoridades = await dbService.listarAutoridades();
    const nuevasAutoridades = autoridades.filter(a => a.toLowerCase().trim() !== autorNormalizado);
    saveList(STORAGE_KEYS.AUTORIDADES, nuevasAutoridades);

    // 2. Borrar o limpiar del catálogo bibliográfico
    const recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);
    const recursosActualizados = recursos.map(r => {
      let principalModificada = { ...r.responsabilidad_principal };
      if (principalModificada.nombre && principalModificada.nombre.toLowerCase().trim() === autorNormalizado) {
        principalModificada.nombre = '';
      }

      let secundariasModificadas = r.responsabilidad_secundaria || [];
      secundariasModificadas = secundariasModificadas.filter(sec => {
        return sec.nombre && sec.nombre.toLowerCase().trim() !== autorNormalizado;
      });

      return {
        ...r,
        responsabilidad_principal: principalModificada,
        responsabilidad_secundaria: secundariasModificadas
      };
    });
    saveList(STORAGE_KEYS.RECURSOS, recursosActualizados);
  },

  actualizarAutoridad: async (autorAnterior: string, nuevoAutor: string): Promise<void> => {
    const anteriorNormalizado = autorAnterior.toLowerCase().trim();
    const nuevoTrimmed = nuevoAutor.trim();
    if (!nuevoTrimmed) return;

    // 1. Reemplazar en la lista global de autoridades
    const autoridades = await dbService.listarAutoridades();
    const nuevasAutoridades = autoridades.map(a => {
      if (a.toLowerCase().trim() === anteriorNormalizado) {
        return nuevoTrimmed;
      }
      return a;
    });
    const autoridadesUnicas = Array.from(new Set(nuevasAutoridades.map(a => a.trim()))).sort((a, b) => a.localeCompare(b, 'es'));
    saveList(STORAGE_KEYS.AUTORIDADES, autoridadesUnicas);

    // 2. Reemplazar en todos los recursos del catálogo
    const recursos = getList<Recurso>(STORAGE_KEYS.RECURSOS);
    const recursosActualizados = recursos.map(r => {
      let principalModificada = { ...r.responsabilidad_principal };
      if (principalModificada.nombre && principalModificada.nombre.toLowerCase().trim() === anteriorNormalizado) {
        principalModificada.nombre = nuevoTrimmed;
      }

      let secundariasModificadas = r.responsabilidad_secundaria || [];
      secundariasModificadas = secundariasModificadas.map(sec => {
        if (sec.nombre && sec.nombre.toLowerCase().trim() === anteriorNormalizado) {
          return { ...sec, nombre: nuevoTrimmed };
        }
        return sec;
      });

      return {
        ...r,
        responsabilidad_principal: principalModificada,
        responsabilidad_secundaria: secundariasModificadas
      };
    });
    saveList(STORAGE_KEYS.RECURSOS, recursosActualizados);
  }
};
