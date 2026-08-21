
import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import { dbService } from '../services/dbService';
import { Configuracion, Usuario, RolUsuario } from '../types';
import { marcService, esAutorDuplicado } from '../services/marcService';

const Settings: React.FC = () => {
  const [config, setConfig] = useState<Configuracion>({
    dias_prestamo: 7,
    nombre_biblioteca: ''
  });
  
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

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onOk?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isoFileInputRef = useRef<HTMLInputElement>(null);
  const kohaFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    recordsImported: number;
    recordsSkippedOrError: number;
    totalRecordsFound: number;
  } | null>(null);

  const [isKohaImporting, setIsKohaImporting] = useState(false);
  const [kohaImportSummary, setKohaImportSummary] = useState<{
    recordsImported: number;
    recordsSkippedOrError: number;
    totalRecordsFound: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    dbService.getConfig().then(data => {
      setConfig({
        nombre_biblioteca: data.nombre_biblioteca || '',
        dias_prestamo: data.dias_prestamo !== undefined ? data.dias_prestamo : ((data as any).dias_prestamo_alumno || 7),
        fotos_usuarios_dir: data.fotos_usuarios_dir || '',
        imagenes_registros_dir: data.imagenes_registros_dir || '',
        backup_auto_habilitado: data.backup_auto_habilitado ?? false,
        backup_intervalo_dias: data.backup_intervalo_dias || 7,
        backup_dir: data.backup_dir || '',
        ultimo_backup_fecha: data.ultimo_backup_fecha || ''
      });
    });
  }, []);

  const handleSave = async () => {
    await dbService.saveConfig(config);
    if (config.backup_auto_habilitado) {
      await dbService.verificarYEjecutarBackupAutomatico();
    }
    setAlertModal({
      isOpen: true,
      title: 'Configuración guardada',
      message: 'La configuración del sistema se ha guardado correctamente.',
      onOk: () => {
        window.location.reload(); // Recargar para que el navbar se actualice
      }
    });
  };

  const handleBackup = async () => {
    const backupData = await dbService.exportarDatos();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `biblioteca_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleRestoreClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const data = JSON.parse(json);
        setConfirmModal({
          isOpen: true,
          title: 'Confirmar restauración',
          message: 'ATENCIÓN: Esto reemplazará TODOS los datos actuales con los del archivo de respaldo. ¿Está seguro?',
          onConfirm: async () => {
            try {
              await dbService.importarDatos(data);
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
              setAlertModal({
                isOpen: true,
                title: 'Restauración exitosa',
                message: 'Restauración completada con éxito. La página se recargará.',
                onOk: () => {
                   window.location.reload();
                }
              });
            } catch (err: any) {
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
              setAlertModal({
                isOpen: true,
                title: 'Error al importar',
                message: err.message || 'Error al intentar importar los datos del archivo.'
              });
            }
          }
        });
      } catch (error) {
        setAlertModal({
          isOpen: true,
          title: 'Error de archivo',
          message: 'Error al leer el archivo de respaldo. Asegúrese de que sea un JSON válido generado por este sistema.'
        });
        console.error(error);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleIsoClick = () => {
    if (isoFileInputRef.current) {
      isoFileInputRef.current.click();
    }
  };

  const handleIsoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.iso')) {
      setAlertModal({
        isOpen: true,
        title: 'Formato incorrecto',
        message: 'Por favor, proporcione un archivo de extensión .iso de exportación de Aguapey/WinISIS.'
      });
      e.target.value = '';
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Importar base de datos Aguapey',
      message: '¿Está seguro de que desea importar este archivo de Aguapey? Se agregarán todos los recursos de información y sus inventarios del archivo a su catálogo actual sin eliminar los existentes.',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsImporting(true);
        setImportSummary(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            if (!arrayBuffer) {
              throw new Error("No se pudo leer el archivo.");
            }
            const result = await marcService.importIsoFile(arrayBuffer);

            setIsImporting(false);
            setImportSummary(result);
            setAlertModal({
              isOpen: true,
              title: 'Migración exitosa',
              message: `Se ha completado la migración con éxito:\n- Registros procesados: ${result.totalRecordsFound}\n- Recursos importados: ${result.recordsImported}\nLos recursos ya están disponibles en catálogo.`
            });
          } catch (err: any) {
            setIsImporting(false);
            setAlertModal({
              isOpen: true,
              title: 'Error de importación',
              message: err.message || 'Ocurrió un error inesperado al procesar el catálogo.'
            });
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });

    e.target.value = '';
  };

  const handleKohaClick = () => {
    if (kohaFileInputRef.current) {
      kohaFileInputRef.current.click();
    }
  };

  const handleKohaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.toLowerCase().split('.').pop();
    if (fileExt !== 'mrc' && fileExt !== 'utf8') {
      setAlertModal({
        isOpen: true,
        title: 'Formato incorrecto',
        message: 'Por favor, proporcione un archivo de extensión .mrc o .utf8 correspondiente a la exportación de Koha.'
      });
      e.target.value = '';
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Importar desde Koha (MARC21)',
      message: '¿Está seguro de que desea importar este archivo de Koha? Se procesará con codificación nativa UTF-8 y se extraerán todos los registros bibliográficos junto con sus ejemplares físicos. Los datos existentes no serán borrados.',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsKohaImporting(true);
        setKohaImportSummary(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            if (!arrayBuffer) {
              throw new Error("No se pudo leer el archivo de Koha.");
            }
            const result = await marcService.importMrcFile(arrayBuffer);

            setIsKohaImporting(false);
            setKohaImportSummary(result);
            
            setAlertModal({
              isOpen: true,
              title: 'Migración exitosa',
              message: `Se ha completado la migración con éxito:\n- Registros procesados: ${result.totalRecordsFound}\n- Recursos importados: ${result.recordsImported}\nLos recursos ya están disponibles en catálogo.`
            });
          } catch (err: any) {
            setIsKohaImporting(false);
            setAlertModal({
              isOpen: true,
              title: 'Error de importación Koha',
              message: err.message || 'Ocurrió un error inesperado al procesar el archivo.'
            });
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });

    e.target.value = '';
  };

  const handleResetDemoClick = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Restablecer base de datos',
      message: '¿Está seguro de que desea restablecer la base de datos a los valores de demostración? Se perderán todos sus cambios actuales y se cargarán usuarios y recursos de prueba con préstamos vencidos.',
      onConfirm: async () => {
        try {
          await dbService.resetearBaseDeDatos();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setAlertModal({
            isOpen: true,
            title: 'Reinicio exitoso',
            message: 'Se cargaron los nuevos datos preestablecidos con recursos de catálogo, usuarios, y préstamos de demostración. La página se recargará.',
            onOk: () => {
               window.location.reload();
            }
          });
        } catch (err: any) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setAlertModal({
            isOpen: true,
            title: 'Error al restablecer',
            message: err.message || 'Error al intentar cargar los datos de prueba.'
          });
        }
      }
    });
  };

  const handleClearDataClick = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Vaciar base de datos',
      message: '¿Está seguro de que desea eliminar todos los datos de demostración y del sistema? Se vaciarán por completo los recursos del catálogo, usuarios, préstamos y términos de indización para que pueda ingresar su biblioteca desde cero.',
      onConfirm: async () => {
        try {
          await dbService.vaciarBaseDeDatos();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setAlertModal({
            isOpen: true,
            title: 'Limpieza exitosa',
            message: 'Se han eliminado todos los datos correctamente. La base de datos está vacía y lista para usar. La página se recargará.',
            onOk: () => {
               window.location.reload();
            }
          });
        } catch (err: any) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setAlertModal({
            isOpen: true,
            title: 'Error al vaciar los datos',
            message: err.message || 'Ocurrió un error al intentar borrar los datos.'
          });
        }
      }
    });
  };

  const handleCsvClick = () => {
    if (csvFileInputRef.current) {
      csvFileInputRef.current.click();
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const existingUsers = await dbService.listarUsuarios();
          const existingDnis = new Set(existingUsers.map(u => u.dni));
          const newDnis = new Set();
          
          const nuevosUsuarios: Omit<Usuario, 'id'>[] = [];
          let errors = 0;
          let duplicates = 0;
          
          results.data.forEach((row: any) => {
            const nombre = row['Nombre'] || row['nombre'] || '';
            const apellido = row['Apellido'] || row['apellido'] || '';
            const dni = row['DNI'] || row['dni'] || '';
            const rolStr = row['Rol'] || row['rol'] || row['Curso'] || row['curso'] || '';
            const email = row['Email'] || row['email'] || '';
            const telefono = row['Telefono'] || row['telefono'] || '';
            const fecha_nacimiento = row['Fecha de Nacimiento'] || row['fecha de nacimiento'] || row['Fecha Nacimiento'] || row['fecha_nacimiento'] || '';

            if (!nombre || !apellido || !dni) {
              errors++;
              return;
            }

            const dniTrimmed = String(dni).trim();
            if (existingDnis.has(dniTrimmed) || newDnis.has(dniTrimmed)) {
              duplicates++;
              return;
            }
            newDnis.add(dniTrimmed);

            // Mapear rol
            let rol = RolUsuario.ALUMNO;
            const rUpper = String(rolStr).toUpperCase();
            if (rUpper.includes('DOCENTE') || rUpper.includes('PROFESOR')) rol = RolUsuario.DOCENTE;
            else if (rUpper.includes('ADMINISTRATIVO') || rUpper.includes('DIRECTIVO') || rUpper.includes('BIBLIOTECARIO')) rol = RolUsuario.ADMINISTRATIVO;
            else if (rUpper.includes('OTRO')) rol = RolUsuario.OTRO;
            else if (rolStr) rol = rolStr as RolUsuario;

            nuevosUsuarios.push({
              nombre: String(nombre).trim(),
              apellido: String(apellido).trim(),
              dni: String(dni).trim(),
              rol,
              email: String(email).trim(),
              telefono: String(telefono).trim(),
              fecha_nacimiento: fecha_nacimiento ? String(fecha_nacimiento).trim() : undefined,
              activo: true
            });
          });

          if (nuevosUsuarios.length > 0) {
            await dbService.crearUsuariosMasivo(nuevosUsuarios);
            setAlertModal({
              isOpen: true,
              title: 'Carga Masiva Exitosa',
              message: `Se han cargado ${nuevosUsuarios.length} usuarios correctamente.` + 
                       (errors > 0 ? ` Se omitieron ${errors} filas por datos incompletas o erróneos.` : '') +
                       (duplicates > 0 ? ` Se omitieron ${duplicates} filas por DNI duplicado.` : '')
            });
          } else {
            setAlertModal({
              isOpen: true,
              title: 'Error en Carga Masiva',
              message: `No se encontraron usuarios válidos nuevos en el archivo.` +
                       (duplicates > 0 ? ` Se omitieron ${duplicates} filas por DNI duplicado.` : '')
            });
          }
        } catch (error: any) {
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'Ocurrió un error al procesar el archivo: ' + error.message
          });
        }
        
        if (csvFileInputRef.current) {
          csvFileInputRef.current.value = '';
        }
      },
      error: (error) => {
        setAlertModal({
          isOpen: true,
          title: 'Error de lectura',
          message: 'No se pudo leer el archivo CSV: ' + error.message
        });
      }
    });
  };

  const exportarInventarioGeneral = async () => {
    try {
      const config = await dbService.getConfig();
      const libraryName = config?.nombre_biblioteca || 'Auralib';
      const allBooks = await dbService.listarRecursos(); // Obtener todos los libros sin filtros
      
      // Construir el contenido de texto
      let text = `================================================================================\n`;
      text += `                     INVENTARIO BIBLIOGRÁFICO GENERAL\n`;
      text += `================================================================================\n`;
      text += `BIBLIOTECA: ${libraryName.toUpperCase()}\n`;
      text += `FECHA DE REPORTE: ${new Date().toLocaleString('es-AR')}\n`;
      text += `TOTAL DE REGISTROS BIBLIOGRÁFICOS: ${allBooks.length}\n`;
      text += `TOTAL DE EJEMPLARES FÍSICOS: ${allBooks.reduce((acc, l) => acc + l.ejemplares.length, 0)}\n`;
      text += `================================================================================\n\n`;

      text += `--------------------------------------------------------------------------------\n`;
      text += `1. DETALLE DE EJEMPLARES FÍSICOS (Ordenado por Nº de Inventario)\n`;
      text += `--------------------------------------------------------------------------------\n`;
      
      const allCopies: { inventario: string; ubicacion: string; estado: string; titulo: string; autor: string }[] = [];
      allBooks.forEach(l => {
          l.ejemplares.forEach(c => {
              allCopies.push({
                  inventario: c.inventario,
                  ubicacion: c.ubicacion || 'Sin ubicar',
                  estado: c.estado,
                  titulo: l.titulo,
                  autor: l.responsabilidad_principal?.nombre || 'Sin autor'
              });
          });
      });

      // Ordenar copias por número de inventario usando ordenamiento natural
      allCopies.sort((a, b) => a.inventario.localeCompare(b.inventario, undefined, { numeric: true, sensitivity: 'base' }));

      if (allCopies.length === 0) {
          text += `No se registran ejemplares físicos en el catálogo.\n`;
      } else {
          allCopies.forEach((c, idx) => {
              const numStr = String(idx + 1).padStart(4, '0');
              text += `[${numStr}] Inv: ${c.inventario.padEnd(12)} | Estado: ${c.estado.padEnd(14)} | Ubic: ${c.ubicacion.padEnd(20)} | ${c.titulo} - ${c.autor}\n`;
          });
      }

      text += `\n\n`;
      text += `--------------------------------------------------------------------------------\n`;
      text += `2. DETALLE DE REGISTROS BIBLIOGRÁFICOS COMPLETOS (Ordenado por Título)\n`;
      text += `--------------------------------------------------------------------------------\n`;

      const sortedBooks = [...allBooks].sort((a, b) => a.titulo.localeCompare(b.titulo));
      
      if (sortedBooks.length === 0) {
          text += `No se registran títulos asociados en el catálogo.\n`;
      } else {
          sortedBooks.forEach((l, idx) => {
              text += `Registro Nro: ${(idx + 1)}\n`;
              text += `Título: ${l.titulo}${(l.variante_titulo || (l as any).subtitulo) ? ` | ${(l.variante_titulo || (l as any).subtitulo)}` : ''}\n`;
              if (l.titulo_uniforme) {
                  text += `Título Uniforme: ${l.titulo_uniforme}\n`;
              }
              text += `Responsable Principal: ${l.responsabilidad_principal?.nombre || '—'} (${l.responsabilidad_principal?.tipo || 'AUTOR'})\n`;
              const filteredSecundarias = l.responsabilidad_secundaria?.filter(r => !esAutorDuplicado(l.responsabilidad_principal?.nombre, r.nombre)) || [];
              if (filteredSecundarias.length > 0) {
                  text += `Otros: ${filteredSecundarias.map(r => `${r.nombre} (${r.tipo})`).join(', ')}\n`;
              }
              const editorStr = Array.isArray(l.editor) ? l.editor.filter(Boolean).join(', ') : (l.editor || '');
              const lugarStr = Array.isArray(l.lugar_publicacion) ? l.lugar_publicacion.filter(Boolean).join(', ') : '';
              const fechaStr = Array.isArray(l.fecha) ? l.fecha.filter(Boolean).join(', ') : '';
              
              if (editorStr || lugarStr || fechaStr || l.edicion) {
                  text += `Edición y Publicación: ${l.edicion ? `${l.edicion} - ` : ''}${editorStr} ${lugarStr ? `(${lugarStr})` : ''} ${fechaStr ? `, ${fechaStr}` : ''}\n`;
              }
              const ilustrStr = l.otros_detalles_fisicos || (l as any).ilustraciones;
              const extStr = l.extension || (l as any).paginas;
              if (extStr || ilustrStr || l.dimensiones || l.material_complementario) {
                  text += `Descripción física: ${extStr || ''}${ilustrStr ? ` : ${ilustrStr}` : ''}${l.dimensiones ? ` ; ${l.dimensiones}` : ''}${l.material_complementario ? ` + ${l.material_complementario}` : ''}\n`;
              }
              if (l.coleccion) {
                  text += `Serie / Colección: ${Array.isArray(l.coleccion) ? l.coleccion.filter(Boolean).join(' ; ') : l.coleccion}\n`;
              }
              const idNormalizado = Array.isArray(l.numero_normalizado) ? l.numero_normalizado.filter(Boolean).join(', ') : '';
              const legacyIsbn = Array.isArray((l as any).isbn) ? (l as any).isbn.filter(Boolean).join(', ') : '';
              const idMostrar = idNormalizado || legacyIsbn;
              if (idMostrar) {
                  text += `Número normalizado: ${idMostrar}\n`;
              }
              if (l.notas && l.notas.length > 0 && l.notas.filter(n => n.trim() !== '').length > 0) {
                  text += `Notas: ${l.notas.filter(n => n.trim() !== '').join(' | ')}\n`;
              }
              if (l.contenido && l.contenido.length > 0 && l.contenido.filter(c => c.trim() !== '').length > 0) {
                  text += `Contenido: ${l.contenido.filter(c => c.trim() !== '').join(' ; ')}\n`;
              }
              if (l.temas && l.temas.length > 0) {
                  text += `Temas: ${l.temas.join('; ')}\n`;
              }
              
              const copiasStr = l.ejemplares.map(c => `${c.inventario} (${c.estado}${c.ubicacion ? ` - ${c.ubicacion}` : ''})`).join(', ');
              text += `Ejemplares: ${copiasStr || 'Sin ejemplares asociados.'}\n`;
              text += `--------------------------------------------------------------------------------\n\n`;
          });
      }

      // Generar la descarga del archivo
      const filename = `INVENTARIO_BIBLIOGRAFICO_GENERAL_${new Date().toISOString().slice(0, 10)}.txt`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        title: 'Error al exportar inventario',
        message: err.message || 'No se pudo generar el documento del inventario bibliográfico general.'
      });
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto pb-20 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Configuración del sistema</h2>
      
      {/* CONTENEDOR 1: PARÁMETROS GENERALES Y BACKUP AUTOMÁTICO */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 px-6 py-4 text-white">
          <h3 className="text-lg font-bold text-white tracking-tight">Parámetros generales del sistema</h3>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la biblioteca</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-200 focus:outline-none" 
              placeholder="Ej: Biblioteca Auralib N° 1"
              value={config.nombre_biblioteca} 
              onChange={e => setConfig({...config, nombre_biblioteca: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Días de préstamo por defecto</label>
            <input 
              type="number" 
              className="w-full border border-gray-300 p-2 rounded max-w-xs text-gray-900 focus:ring-2 focus:ring-blue-200 focus:outline-none" 
              value={config.dias_prestamo} 
              onChange={e => setConfig({...config, dias_prestamo: parseInt(e.target.value) || 0})}
            />
            <p className="text-xs text-gray-500 mt-1">Plazo de devolución automático que se asignará a los nuevos préstamos.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              Carpeta de fotos de los socios
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 border border-gray-300 p-2 rounded text-sm text-gray-800 bg-gray-50 font-mono focus:ring-2 focus:ring-blue-200 focus:outline-none" 
                placeholder="Ej: C:\Usuarios\Bibliotecario\Imagenes\Fotos"
                value={config.fotos_usuarios_dir || ''} 
                onChange={e => setConfig({...config, fotos_usuarios_dir: e.target.value})}
              />
              {typeof window !== 'undefined' && (window as any).electronAPI && (
                <button
                  type="button"
                  onClick={async () => {
                    const path = await (window as any).electronAPI.invoke('select-directory');
                    if (path) {
                      setConfig({...config, fotos_usuarios_dir: path});
                    }
                  }}
                  className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-sm px-4 py-2 rounded font-medium transition whitespace-nowrap"
                >
                  Buscar carpeta
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Carpeta donde guardas las fotos nombradas con el DNI de cada socio (ej. <strong>30456789.jpg</strong>).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              Carpeta de imágenes para los registros (portadas)
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 border border-gray-300 p-2 rounded text-sm text-gray-800 bg-gray-50 font-mono focus:ring-2 focus:ring-blue-200 focus:outline-none" 
                placeholder="Ej: C:\Usuarios\Bibliotecario\Imagenes\Portadas"
                value={config.imagenes_registros_dir || ''} 
                onChange={e => setConfig({...config, imagenes_registros_dir: e.target.value})}
              />
              {typeof window !== 'undefined' && (window as any).electronAPI && (
                <button
                  type="button"
                  onClick={async () => {
                    const path = await (window as any).electronAPI.invoke('select-directory');
                    if (path) {
                      setConfig({...config, imagenes_registros_dir: path});
                    }
                  }}
                  className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-sm px-4 py-2 rounded font-medium transition whitespace-nowrap"
                >
                  Buscar carpeta
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Carpeta donde guardas las portadas. Las imágenes deben estar nombradas con cualquier número de inventario de los ejemplares de los registros (ej. <strong>0001.jpg</strong>).
            </p>
          </div>

          {/* CONFIGURACIÓN DE RESPALDOS AUTOMÁTICOS */}
          <div className="pt-6 border-t border-gray-200">
              <h3 className="text-base font-semibold text-gray-800 mb-2">Backup automático programado</h3>
              <p className="text-sm text-gray-600 mb-4">Configura la frecuencia y carpeta para la generación automática de copias de seguridad, que contiene todos los registros, usuarios y préstamos.</p>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2 space-y-4">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="backup_auto_habilitado" 
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    checked={config.backup_auto_habilitado ?? false} 
                    onChange={e => setConfig({...config, backup_auto_habilitado: e.target.checked})}
                  />
                  <label htmlFor="backup_auto_habilitado" className="text-sm font-medium text-gray-800 cursor-pointer">
                    Activar copias de seguridad automáticas
                  </label>
                </div>

                {config.backup_auto_habilitado && (
                  <div className="space-y-4 pt-2 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia del respaldo</label>
                      <select 
                        className="w-full max-w-xs border border-gray-300 p-2 rounded bg-white text-sm text-gray-800 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                        value={config.backup_intervalo_dias || 7}
                        onChange={e => setConfig({...config, backup_intervalo_dias: parseInt(e.target.value) || 7})}
                      >
                        <option value={7}>Cada 7 días (Semanal)</option>
                        <option value={15}>Cada 15 días (Quincenal)</option>
                        <option value={30}>Cada 30 días (Mensual)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Cada vez que inicies la aplicación, se evaluará si pasaron 7, 15 o 30 días desde el último respaldo. Si no se usa el sistema durante un receso o vacaciones, el backup se generará automáticamente la primera vez que abras Auralib.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Carpeta donde se guardarán las copias automáticas
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          className="flex-1 border border-gray-300 p-2 rounded text-sm text-gray-800 bg-white font-mono focus:ring-2 focus:ring-blue-200 focus:outline-none" 
                          placeholder="Ej: C:\Usuarios\Bibliotecario\Documentos\BackupsAuralib"
                          value={config.backup_dir || ''} 
                          onChange={e => setConfig({...config, backup_dir: e.target.value})}
                        />
                        {typeof window !== 'undefined' && (window as any).electronAPI && (
                          <button
                            type="button"
                            onClick={async () => {
                              const path = await (window as any).electronAPI.invoke('select-directory');
                              if (path) {
                                setConfig({...config, backup_dir: path});
                              }
                            }}
                            className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-sm px-4 py-2 rounded font-medium transition whitespace-nowrap"
                          >
                            Buscar carpeta
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Carpeta donde el sistema guardará automáticamente los archivos de respaldo en formato JSON.
                      </p>
                    </div>

                    {config.ultimo_backup_fecha && (
                      <div className="text-xs text-gray-600 bg-blue-50 border border-blue-100 p-2.5 rounded">
                        🗓️ Último respaldo automático generado: <strong>{new Date(config.ultimo_backup_fecha).toLocaleDateString('es-AR')}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
          </div>

          <div className="pt-2 flex justify-end">
              <button 
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded shadow hover:bg-blue-700 font-medium transition"
              >
                  Guardar configuración
              </button>
          </div>
        </div>
      </div>

      {/* CONTENEDOR 2: EXPORTACIONES */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 px-6 py-4 text-white">
              <h3 className="text-lg font-bold text-white tracking-tight">Exportaciones</h3>
          </div>

          <div className="p-6 space-y-6">
              {/* BACKUP Y RESTAURACIÓN MANUAL */}
              <div>
                  <h4 className="font-semibold text-base text-gray-800 mb-1">Backup y restauración manual</h4>
                  <p className="text-sm text-gray-600 mb-4">Guarda todos tus datos en un archivo JSON o restaura una copia anterior. Se recomienda habilitar backups automáticos para evitar pérdidas de información.</p>

                  <div className="flex flex-wrap gap-4">
                      <button 
                          onClick={handleBackup}
                          className="flex-1 min-w-[200px] bg-green-50 border border-green-200 text-green-700 py-3 rounded hover:bg-green-100 flex items-center justify-center gap-2 font-medium transition"
                      >
                          <span>⬇️</span> Descargar Backup
                      </button>

                      <button 
                          onClick={handleRestoreClick}
                          className="flex-1 min-w-[200px] bg-red-50 border border-red-200 text-red-700 py-3 rounded hover:bg-red-100 flex items-center justify-center gap-2 font-medium transition"
                      >
                          <span>⬆️</span> Restaurar Backup
                      </button>
                      <input 
                          type="file" 
                          accept=".json" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          className="hidden" 
                      />
                  </div>
              </div>

              {/* DESCARGA DE INVENTARIO */}
              <div className="pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-base text-gray-800 mb-1">Inventario</h4>
                  <p className="text-sm text-gray-600 mb-4">Exporta el inventario bibliográfico general en un archivo de texto para obtener un listado de todos los ejemplares ordenados por número de inventario y, a continuación, todos los registros en formato etiquetado.</p>
                  <button 
                      onClick={exportarInventarioGeneral}
                      className="w-full bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 font-medium transition"
                      id="btn-exportar-inventario"
                      title="Generar e imprimir el Inventario Bibliográfico General"
                  >
                      🖨️ Exportar Inventario General
                  </button>
              </div>
          </div>
      </div>

      {/* CONTENEDOR 3: IMPORTACIONES */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 px-6 py-4 text-white">
              <h3 className="text-lg font-bold text-white tracking-tight">Importaciones</h3>
          </div>

          <div className="p-6 space-y-6">
              {/* IMPORTAR DESDE AGUAPEY */}
              <div>
                  <h4 className="font-semibold text-base text-gray-800 mb-1">Importar desde Aguapey (MARC21)</h4>
                  <p className="text-sm text-gray-600 mb-4">
                      Migra tu catálogo de <strong>Aguapey</strong>/WinISIS seleccionando un archivo en formato <strong>.iso</strong> (ISO 2709).
                      Este proceso acomoda toda la información en tu nuevo catálogo. Asegura que los números de inventario y las signaturas se mantengan exactamente iguales, y arregla de forma automática los textos antiguos para que las eñes y los acentos se muestran correctamente.
                  </p>
                  
                  {isImporting ? (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <span className="text-sm font-semibold text-blue-700 animate-pulse">Procesando e importando catálogo...</span>
                      <p className="text-xs text-blue-600 mt-1">No cierre esta ventana ni recargue la página mientras la operación esté en curso.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button 
                          onClick={handleIsoClick}
                          className="bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 font-medium transition"
                      >
                          Seleccionar archivo .iso
                      </button>
                      <input 
                          type="file" 
                          accept=".iso" 
                          ref={isoFileInputRef} 
                          onChange={handleIsoFileChange} 
                          className="hidden" 
                      />
                      
                      {importSummary && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-sm text-green-800">
                          <p className="font-semibold mb-1">✅ Resumen de última importación:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Total de registros en el archivo: {importSummary.totalRecordsFound}</li>
                            <li>Errores o registros omitidos: {importSummary.recordsSkippedOrError}</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {/* IMPORTAR DESDE KOHA */}
              <div className="pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-base text-gray-800 mb-1">Importar desde Koha (MARC21)</h4>
                  <p className="text-sm text-gray-600 mb-4">
                      Migra tu catálogo de <strong>Koha</strong> seleccionando un archivo con extensión <strong>.mrc</strong> o <strong>.utf8</strong> (formato estándar MARC21 - ISO 2709).
                      El motor pasará de forma automática toda la información, incluyendo los títulos con tildes o eñes, los códigos de barras, las signaturas y la ubicación de cada ejemplar en los estantes.
                  </p>
                  
                  {isKohaImporting ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                      <span className="text-sm font-semibold text-emerald-700 animate-pulse">Procesando e importando catálogo de Koha...</span>
                      <p className="text-xs text-emerald-600 mt-1">Mantenga la aplicación abierta y no recargue la página mientras la operación se realiza en segundo plano.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button 
                          onClick={handleKohaClick}
                          className="bg-emerald-50 border border-emerald-200 text-emerald-700 py-3 rounded-lg hover:bg-emerald-100 flex items-center justify-center gap-2 font-medium transition shadow-sm"
                      >
                          Seleccionar archivo .mrc o .utf8
                      </button>
                      <input 
                          type="file" 
                          accept=".mrc,.utf8" 
                          ref={kohaFileInputRef} 
                          onChange={handleKohaFileChange} 
                          className="hidden" 
                      />
                      
                      {kohaImportSummary && (
                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-sm text-emerald-800">
                          <p className="font-semibold mb-1">✅ Resumen de última importación desde Koha:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Total de registros en el archivo: {kohaImportSummary.totalRecordsFound}</li>
                            <li>Registros importados con éxito: {kohaImportSummary.recordsImported}</li>
                            <li>Inconsistencias o registros omitidos: {kohaImportSummary.recordsSkippedOrError}</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {/* CARGA MASIVA DE USUARIOS (CSV) */}
              <div className="pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-base text-gray-800 mb-1">Carga masiva de usuarios</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Importa un listado completo de socios/usuarios a la biblioteca mediante un archivo de formato CSV. El archivo de ejemplo se encuentra disponible en el sitio oficial de la aplicación. Para que la fecha de nacimiento se registre de manera correcta, debe venir escrita en formato <strong>AAAA-MM-DD</strong> (por ejemplo, <code>1987-05-15</code>).
                  </p>
                  <button 
                      onClick={handleCsvClick}
                      className="w-full bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 font-medium transition"
                  >
                      Seleccionar archivo .csv
                  </button>
                  <input 
                      type="file" 
                      accept=".csv" 
                      ref={csvFileInputRef} 
                      onChange={handleCsvFileChange} 
                      className="hidden" 
                  />
              </div>
          </div>
      </div>

      {/* CONTENEDOR 4: DATOS DE DEMOSTRACIÓN Y PRUEBA */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 px-6 py-4 text-white flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <h3 className="text-lg font-bold text-white tracking-tight">Datos de demostración y prueba</h3>
          </div>
          <div className="p-6">
              <p className="text-sm text-gray-600 mb-4 font-sans">
                  ¿Quieres probar la aplicación con datos de demostración preestablecidos? Esto vaciará tus datos actuales y cargará un conjunto completo de recursos de catálogo, usuarios y préstamos a modo ejemplo.
              </p>
              <button 
                  onClick={handleResetDemoClick}
                  className="w-full bg-red-50 border border-red-200 text-red-700 py-3 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2 font-semibold text-sm transition tracking-wide shadow-sm"
              >
                  🔄 Restablecer con datos de demostración
              </button>
              <button 
                  onClick={handleClearDataClick}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2 font-semibold text-sm transition tracking-wide shadow-sm mt-3"
              >
                  🗑️ Borrar todo y empezar desde cero
              </button>
          </div>
      </div>

      {/* Acerca de / Créditos de desarrollo */}
      <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-300 pt-6">
        <p className="font-semibold text-gray-700 text-sm">Auralib v1.0.0</p>
        <p className="mt-1">Sistema de Gestión Bibliotecaria</p>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
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

      {/* MODAL DE ALERTA */}
      {alertModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
                  <div className="p-6">
                      <div className="flex items-center gap-3 text-blue-600 mb-3">
                          <span className="text-2xl">ℹ️</span>
                          <h3 className="text-xl font-bold text-blue-800">{alertModal.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{alertModal.message}</p>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse">
                      <button
                          type="button"
                          onClick={() => {
                              const okHandler = alertModal.onOk;
                              setAlertModal({ isOpen: false, title: '', message: '' });
                              if (okHandler) okHandler();
                          }}
                          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm focus:outline-none transition-colors"
                      >
                          Aceptar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;
