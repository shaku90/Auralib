
import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService';
import { Recurso, EstadoRecurso, Responsabilidad, TipoResponsabilidad, Ejemplar } from '../types';
import { ImagenRegistro } from '../components/ImagenRegistro';
import { esAutorDuplicado } from '../services/marcService';
import { normalizarTexto } from '../utils/textUtils';

type Step = 'list' | 'select_type' | 'form' | 'indices' | 'authorities';

interface DescripcionFisicaConfig {
  extensionPlaceholder: string;
  extensionSubtext: string;
  ilustracionesPlaceholder: string;
  ilustracionesSubtext: string;
  dimensionesPlaceholder: string;
  dimensionesSubtext: string;
  materialCompPlaceholder: string;
  materialCompSubtext: string;
}

const DESCRIPCION_FISICA_CONFS: Record<string, DescripcionFisicaConfig> = {
  'Libro': {
    extensionPlaceholder: 'Ej: 145 p., 30 h.',
    extensionSubtext: 'Páginas, hojas, láminas, volúmenes...',
    ilustracionesPlaceholder: 'Ej: il., retratos, mapas',
    ilustracionesSubtext: 'Material ilustrativo',
    dimensionesPlaceholder: 'Ej: 22 cm',
    dimensionesSubtext: 'Alto x ancho (medida)',
    materialCompPlaceholder: 'Ej: CD-ROM, mapa anexo',
    materialCompSubtext: 'Anexos, carpetas, discos...',
  },
  'Publicación seriada': {
    extensionPlaceholder: 'Ej: v. o n°',
    extensionSubtext: 'Volúmenes, números o entregas',
    ilustracionesPlaceholder: 'Ej: il., retratos',
    ilustracionesSubtext: 'Material ilustrativo en números',
    dimensionesPlaceholder: 'Ej: 28 cm',
    dimensionesSubtext: 'Alto de la publicación',
    materialCompPlaceholder: 'Ej: suplementos, CD-ROM',
    materialCompSubtext: 'Suplementos o material adicional',
  },
  'Material cartográfico': {
    extensionPlaceholder: 'Ej: 1 mapa, 1 atlas',
    extensionSubtext: 'Cantidad de mapas, atlas, globos, planos...',
    ilustracionesPlaceholder: 'Ej: col.',
    ilustracionesSubtext: 'Detalles visuales (ej: a color, relieve)',
    dimensionesPlaceholder: 'Ej: 45 x 60 cm doblado a 20 x 15 cm',
    dimensionesSubtext: 'Dimensiones de la hoja de mapa (ej: alto x ancho)',
    materialCompPlaceholder: 'Ej: folleto explicativo',
    materialCompSubtext: 'Guía o material que acompaña el mapa',
  },
  'Material gráfico': {
    extensionPlaceholder: 'Ej: 1 fotografía, 24 diapositivas',
    extensionSubtext: 'Diapositivas, fotos, carteles, grabados...',
    ilustracionesPlaceholder: 'Ej: b/n, col.',
    ilustracionesSubtext: 'Blanco y negro, color',
    dimensionesPlaceholder: 'Ej: 12 x 17 cm, 35 mm',
    dimensionesSubtext: 'Alto x ancho del soporte o película',
    materialCompPlaceholder: 'Ej: texto informativo',
    materialCompSubtext: 'Guías, textos o audio adicional',
  },
  'Audio': {
    extensionPlaceholder: 'Ej: 1 disco sonoro, 1 cassette',
    extensionSubtext: 'Discos, cassettes, CDs de audio...',
    ilustracionesPlaceholder: 'Ej: estéreo, mono, digital',
    ilustracionesSubtext: 'Canales de reproducción o características de grabación',
    dimensionesPlaceholder: 'Ej: 12 cm, 4 3/4 pulg.',
    dimensionesSubtext: 'Diámetro del disco o ancho de cinta',
    materialCompPlaceholder: 'Ej: folleto con letras',
    materialCompSubtext: 'Libretos, inserts, cancioneros',
  },
  'Partituras': {
    extensionPlaceholder: 'Ej: 1 partitura (45 p.)',
    extensionSubtext: 'Partituras, partituras condensadas, partes...',
    ilustracionesPlaceholder: 'Ej: facsímiles',
    ilustracionesSubtext: 'Ilustraciones o facsímiles de manuscritos',
    dimensionesPlaceholder: 'Ej: 30 cm',
    dimensionesSubtext: 'Alto de la partitura',
    materialCompPlaceholder: 'Ej: folleto bio-bibliográfico',
    materialCompSubtext: 'Textos introductorios o cassettes',
  },
  'Video': {
    extensionPlaceholder: 'Ej: 1 videodisco (DVD), 1 videocassette',
    extensionSubtext: 'Soporte de video (DVD, VHS, Blu-ray...)',
    ilustracionesPlaceholder: 'Ej: son., col., 120 min.',
    ilustracionesSubtext: 'Sonido, color, duración en minutos',
    dimensionesPlaceholder: 'Ej: 12 cm, 1/2 pulg.',
    dimensionesSubtext: 'Diámetro del disco o ancho de cinta (ej: 1/2 in)',
    materialCompPlaceholder: 'Ej: guía de estudio',
    materialCompSubtext: 'Material impreso complementario',
  },
  'Objetos': {
    extensionPlaceholder: 'Ej: 1 rompecabezas (120 piezas), 1 maqueta',
    extensionSubtext: 'Especificación del objeto tridimensional',
    ilustracionesPlaceholder: 'Ej: plástico, madera',
    ilustracionesSubtext: 'Material de fabricación, colores',
    dimensionesPlaceholder: 'Ej: 20 x 15 x 30 cm',
    dimensionesSubtext: 'Alto x ancho x profundidad',
    materialCompPlaceholder: 'Ej: instructivo de ensamblaje',
    materialCompSubtext: 'Guía, manual o fichas del juego',
  },
  'Manuscrito': {
    extensionPlaceholder: 'Ej: 14 h., 28 p.',
    extensionSubtext: 'Hojas, páginas, folios...',
    ilustracionesPlaceholder: 'Ej: il., miniaturas, rúbricas',
    ilustracionesSubtext: 'Detalles ornamentales o escrituras',
    dimensionesPlaceholder: 'Ej: 30 cm',
    dimensionesSubtext: 'Alto x ancho del soporte (medida)',
    materialCompPlaceholder: '',
    materialCompSubtext: '',
  }
};

interface CatalogProps {
  initialStep?: Step;
}

const Catalog: React.FC<CatalogProps> = ({ initialStep = 'list' }) => {
  const [view, setView] = useState<Step>(initialStep);

  useEffect(() => {
    if (initialStep) {
      setView(initialStep);
    }
  }, [initialStep]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const mainContainer = document.querySelector('.overflow-y-auto');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
  }, [view]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [search, setSearch] = useState('');
  const [searchTerms, setSearchTerms] = useState('');
  const [searchAuthorities, setSearchAuthorities] = useState('');
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [authorities, setAuthorities] = useState<string[]>([]);
  const [termCounts, setTermCounts] = useState<Record<string, number>>({});
  const [authorityCounts, setAuthorityCounts] = useState<Record<string, number>>({});
  const [visibleCount, setVisibleCount] = useState(20);
  const [visibleTermsCount, setVisibleTermsCount] = useState(150);
  const [visibleAuthoritiesCount, setVisibleAuthoritiesCount] = useState(150);

  // --- MEMOIZED DERIVED STATES FOR HIGH PERFORMANCE ---
  const recursosSorted = useMemo(() => {
    return search ? recursos : [...recursos].reverse();
  }, [recursos, search]);

  const filteredTerms = useMemo(() => {
    const searchNormalized = normalizarTexto(searchTerms);
    if (!searchNormalized) return availableTerms;
    return availableTerms.filter(term => 
      normalizarTexto(term).includes(searchNormalized)
    );
  }, [availableTerms, searchTerms]);

  const filteredAuthorities = useMemo(() => {
    const searchNormalized = normalizarTexto(searchAuthorities);
    if (!searchNormalized) return authorities;
    return authorities.filter(auth => 
      normalizarTexto(auth).includes(searchNormalized)
    );
  }, [authorities, searchAuthorities]);
  
  // --- FORM STATE ---
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tipoMaterial, setTipoMaterial] = useState('Libro');
  
  // Campos básicos
  const [titulo, setTitulo] = useState('');
  const [varianteTitulo, setVarianteTitulo] = useState('');
  const [tituloUniforme, setTituloUniforme] = useState('');
  const [tituloClave, setTituloClave] = useState('');

  // Campos específicos de otros materiales (RCAA2)
  const [frecuencia, setFrecuencia] = useState('');
  const [volumenNumero, setVolumenNumero] = useState('');
  const [existencias, setExistencias] = useState('');
  const [urlRecurso, setUrlRecurso] = useState('');
  
  const [escala, setEscala] = useState('');
  const [proyeccion, setProyeccion] = useState('');
  const [coordenadas, setCoordenadas] = useState('');
  
  const [soporteFisico, setSoporteFisico] = useState('');
  const [color, setColor] = useState('');
  
  const [formatoAudio, setFormatoAudio] = useState('');
  const [duracion, setDuracion] = useState('');
  const [detallesReproduccion, setDetallesReproduccion] = useState('');
  
  const [instrumentacion, setInstrumentacion] = useState('');
  const [claveTono, setClaveTono] = useState('');
  
  const [formatoVideo, setFormatoVideo] = useState('');
  const [sistemaGrabacion, setSistemaGrabacion] = useState('');
  
  const [descripcionObjeto, setDescripcionObjeto] = useState('');
  const [dimensiones3d, setDimensiones3d] = useState('');
  
  const [tesis, setTesis] = useState('');

  // Responsabilidad Principal
  const [respPrincipal, setRespPrincipal] = useState<Responsabilidad>({ tipo: 'AUTOR', nombre: '' });
  
  // Responsabilidad Secundaria (Repetible)
  const [respSecundarias, setRespSecundarias] = useState<Responsabilidad[]>([]);
  
  // Publicación
  const [lugares, setLugares] = useState<string[]>(['']);
  const [editores, setEditores] = useState<string[]>(['']);
  const [fechas, setFechas] = useState<string[]>(['']);
  
  const [edicion, setEdicion] = useState('');
  
  // Detalles Físicos
  const [extension, setExtension] = useState('');
  const [otrosDetallesFisicos, setOtrosDetallesFisicos] = useState('');
  const [dimensiones, setDimensiones] = useState('');
  const [materialComplementario, setMaterialComplementario] = useState('');
  
  const [coleccion, setColeccion] = useState<string[]>(['']);
  
  // Campos Repetibles Simples
  const [notas, setNotas] = useState<string[]>([]);
  const [contenido, setContenido] = useState<string[]>([]);
  const [numerosNormalizados, setNumerosNormalizados] = useState<string[]>([]);
  
  // Indización (Repetible con autocomplete)
  const [temas, setTemas] = useState<string[]>([]);
  
  // Pie
  const [inventarios, setInventarios] = useState<{ inventario: string; ubicacion: string; estado?: EstadoRecurso }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // --- CONFIRMATION & ALERT MODAL STATE ---
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
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
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const [editTermModal, setEditTermModal] = useState<{
    isOpen: boolean;
    oldTerm: string;
    newTerm: string;
  }>({
    isOpen: false,
    oldTerm: '',
    newTerm: ''
  });

  const [editAuthorityModal, setEditAuthorityModal] = useState<{
    isOpen: boolean;
    oldAuthority: string;
    newAuthority: string;
  }>({
    isOpen: false,
    oldAuthority: '',
    newAuthority: ''
  });

  // --- CARGA INICIAL ---
  const extraerTituloSerie = (fullSerie: string): string => {
    if (!fullSerie) return '';
    let str = fullSerie.trim();
    if (str.includes(';')) {
      str = str.split(';')[0].trim();
    }
    str = str.replace(/,\s*(v\.|vol\.|nº|n°|n\.|no\.|volumen|número)\s*\d+$/i, '').trim();
    return str;
  };

  const handleFilterShortcut = (text: string) => {
    setView('list');
    setSearch(text);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainContainer = document.querySelector('.overflow-y-auto');
    if (mainContainer) {
      mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const loadRecursos = async () => {
    const data = await dbService.listarRecursos(search);
    setRecursos(data);
  };

  const loadIndices = async () => {
      const terms = await dbService.listarTerminosIndizacion();
      setAvailableTerms(terms);
      try {
          const allRecursos = await dbService.listarRecursos();
          const counts: Record<string, number> = {};
          terms.forEach(term => {
              counts[term] = 0;
          });
          allRecursos.forEach(r => {
              if (r.temas) {
                  r.temas.forEach(t => {
                      const normalizedTerm = t.toUpperCase().trim();
                      const match = terms.find(at => at.toUpperCase().trim() === normalizedTerm);
                      if (match) {
                          counts[match] = (counts[match] || 0) + 1;
                      }
                  });
              }
          });
          setTermCounts(counts);
      } catch (e) {
          console.error("Error calculating indexing term counts:", e);
      }
  };

  const loadAuthorities = async () => {
      const auths = await dbService.listarAutoridades();
      setAuthorities(auths);
      try {
          const allRecursos = await dbService.listarRecursos();
          const counts: Record<string, number> = {};
          auths.forEach(auth => {
              counts[auth] = 0;
          });
          allRecursos.forEach(r => {
              if (r.responsabilidad_principal?.nombre) {
                  const name = r.responsabilidad_principal.nombre.trim();
                  const match = auths.find(a => a.toLowerCase().trim() === name.toLowerCase());
                  if (match) {
                      counts[match] = (counts[match] || 0) + 1;
                  }
              }
              if (r.responsabilidad_secundaria) {
                  r.responsabilidad_secundaria.forEach(sec => {
                      if (sec.nombre) {
                          const name = sec.nombre.trim();
                          const match = auths.find(a => a.toLowerCase().trim() === name.toLowerCase());
                          if (match) {
                              counts[match] = (counts[match] || 0) + 1;
                          }
                      }
                  });
              }
          });
          setAuthorityCounts(counts);
      } catch (e) {
          console.error("Error calculating authority counts:", e);
      }
  };

  // Solo recargar recursos cuando cambie el término de búsqueda de recursos
  useEffect(() => {
    loadRecursos();
    setVisibleCount(20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Cargar índices y autoridades únicamente al montar el componente
  useEffect(() => {
    loadIndices();
    loadAuthorities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- HELPERS FORMULARIO ---
  const addRespSecundaria = () => setRespSecundarias([...respSecundarias, { tipo: 'AUTOR', nombre: '' }]);
  const updateRespSecundaria = (idx: number, field: keyof Responsabilidad, val: string) => {
      const copy = [...respSecundarias];
      // @ts-ignore
      copy[idx][field] = val;
      setRespSecundarias(copy);
  };
  const removeRespSecundaria = (idx: number) => setRespSecundarias(respSecundarias.filter((_, i) => i !== idx));

  const addNota = () => setNotas([...notas, '']);
  const updateNota = (idx: number, val: string) => {
      const copy = [...notas];
      copy[idx] = val;
      setNotas(copy);
  };
  const removeNota = (idx: number) => setNotas(notas.filter((_, i) => i !== idx));

  const addContenido = () => setContenido([...contenido, '']);
  const updateContenido = (idx: number, val: string) => {
      const copy = [...contenido];
      copy[idx] = val;
      setContenido(copy);
  };
  const removeContenido = (idx: number) => setContenido(contenido.filter((_, i) => i !== idx));

  const addColeccion = () => setColeccion([...coleccion, '']);
  const updateColeccion = (idx: number, val: string) => {
      const copy = [...coleccion];
      copy[idx] = val;
      setColeccion(copy);
  };
  const removeColeccion = (idx: number) => setColeccion(coleccion.filter((_, i) => i !== idx));

  // Helpers para nuevos subcampos repetibles
  const addLugar = () => setLugares([...lugares, '']);
  const updateLugar = (idx: number, val: string) => {
      const copy = [...lugares];
      copy[idx] = val;
      setLugares(copy);
  };
  const removeLugar = (idx: number) => setLugares(lugares.filter((_, i) => i !== idx));

  const addEditor = () => setEditores([...editores, '']);
  const updateEditor = (idx: number, val: string) => {
      const copy = [...editores];
      copy[idx] = val;
      setEditores(copy);
  };
  const removeEditor = (idx: number) => setEditores(editores.filter((_, i) => i !== idx));

  const addFecha = () => setFechas([...fechas, '']);
  const updateFecha = (idx: number, val: string) => {
      const copy = [...fechas];
      copy[idx] = val;
      setFechas(copy);
  };
  const removeFecha = (idx: number) => setFechas(fechas.filter((_, i) => i !== idx));

  const addNumeroNormalizado = () => setNumerosNormalizados([...numerosNormalizados, '']);
  const updateNumeroNormalizado = (idx: number, val: string) => {
      const copy = [...numerosNormalizados];
      copy[idx] = val;
      setNumerosNormalizados(copy);
  };
  const removeNumeroNormalizado = (idx: number) => setNumerosNormalizados(numerosNormalizados.filter((_, i) => i !== idx));

  const addTema = () => setTemas([...temas, '']);
  const updateTema = (idx: number, val: string) => {
      const copy = [...temas];
      copy[idx] = val;
      setTemas(copy);
  };
  const removeTema = (idx: number) => setTemas(temas.filter((_, i) => i !== idx));

  const addInventario = () => setInventarios([...inventarios, { inventario: '', ubicacion: '', estado: EstadoRecurso.DISPONIBLE }]);
  
  const updateInventario = (idx: number, field: 'inventario' | 'ubicacion' | 'estado', val: string) => {
      const copy = [...inventarios];
      copy[idx][field] = val as any;
      setInventarios(copy);
      if (formError) setFormError(null);
  };

  const addInventarioConsecutivo = () => {
      // Buscar el último ejemplar con un número de inventario no vacío
      let lastFilledInv = '';
      let lastUbicacion = '';
      
      for (let i = inventarios.length - 1; i >= 0; i--) {
          const invStr = inventarios[i].inventario.trim();
          if (invStr !== '') {
              lastFilledInv = invStr;
              lastUbicacion = inventarios[i].ubicacion || '';
              break;
          }
      }

      let nextInv = '';

      if (lastFilledInv !== '') {
          // Extraer la parte numérica final y el prefijo (ej: "INV-005" -> prefix "INV-", digits "005")
          const match = lastFilledInv.match(/^(.*?)(\d+)$/);
          if (match) {
              const prefix = match[1];
              const digitStr = match[2];
              const nextNum = parseInt(digitStr, 10) + 1;
              const nextDigitStr = String(nextNum).padStart(digitStr.length, '0');
              nextInv = `${prefix}${nextDigitStr}`;
          } else {
              nextInv = `${lastFilledInv}-1`;
          }
      } else {
          // Si no hay ningún número de inventario en las filas actuales, buscar el número consecutivo global en la BD
          let maxNum = 0;
          let maxDigitLen = 1;
          let commonPrefix = '';

          recursos.forEach(r => {
              r.ejemplares?.forEach(e => {
                  const match = e.inventario.trim().match(/^(.*?)(\d+)$/);
                  if (match) {
                      const num = parseInt(match[2], 10);
                      if (num > maxNum) {
                          maxNum = num;
                          maxDigitLen = match[2].length;
                          commonPrefix = match[1];
                      }
                  }
              });
          });

          if (maxNum > 0) {
              const nextNum = maxNum + 1;
              const nextDigitStr = String(nextNum).padStart(maxDigitLen, '0');
              nextInv = `${commonPrefix}${nextDigitStr}`;
          } else {
              nextInv = '1';
          }
      }

      // Si la última fila está completamente en blanco (inventario vacío), la rellenamos
      const lastIndex = inventarios.length - 1;
      if (lastIndex >= 0 && inventarios[lastIndex].inventario.trim() === '') {
          const copy = [...inventarios];
          copy[lastIndex] = {
              ...copy[lastIndex],
              inventario: nextInv,
              ubicacion: copy[lastIndex].ubicacion || lastUbicacion,
              estado: copy[lastIndex].estado || EstadoRecurso.DISPONIBLE
          };
          setInventarios(copy);
      } else {
          setInventarios([
              ...inventarios,
              {
                  inventario: nextInv,
                  ubicacion: lastUbicacion,
                  estado: EstadoRecurso.DISPONIBLE
              }
          ]);
      }
      if (formError) setFormError(null);
  };

  const removeInventario = (idx: number) => {
      const invToDelete = inventarios[idx].inventario.trim();
      if (editingId && invToDelete !== '') {
          const recursoOriginal = recursos.find(r => r.id === editingId);
          const ejemplarOriginal = recursoOriginal?.ejemplares.find(e => e.inventario === invToDelete);
          if (ejemplarOriginal) {
              if (ejemplarOriginal.estado === EstadoRecurso.PRESTADO) {
                  setAlertModal({
                      isOpen: true,
                      title: 'No se puede eliminar el ejemplar',
                      message: `El ejemplar con número de inventario "${invToDelete}" está actualmente prestado. Debe registrar la devolución de este ejemplar antes de removerlo del sistema.`
                  });
                  return;
              }
              
              // Pedimos confirmación para evitar remociones accidentales
              setConfirmModal({
                  isOpen: true,
                  title: 'Confirmar remoción de ejemplar',
                  message: `¿Está seguro de que desea remover el ejemplar con número de inventario "${invToDelete}"? Esta acción se aplicará definitivamente al guardar los cambios de catalogación.`,
                  onConfirm: () => {
                      setInventarios(prev => prev.filter((_, i) => i !== idx));
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }
              });
              return;
          }
      }
      setInventarios(inventarios.filter((_, i) => i !== idx));
  };

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      
      const invs = inventarios.map(i => i.inventario.trim());

      // 1. Validar que exista al menos un número de inventario
      if (invs.length === 0 || invs.every(i => i === '')) {
          const errorMsg = "Debe ingresar al menos un número de inventario válido para registrar el recurso.";
          setFormError(errorMsg);
          setAlertModal({
              isOpen: true,
              title: 'Error de inventario',
              message: errorMsg
          });
          return;
      }

      // 2. Validar ejemplares con inventario en blanco
      if (invs.some(i => i === '')) {
          const errorMsg = "Hay ejemplares con el número de inventario en blanco. Por favor, complete o elimine las filas de inventario vacías.";
          setFormError(errorMsg);
          setAlertModal({
              isOpen: true,
              title: 'Número de inventario en blanco',
              message: errorMsg
          });
          return;
      }

      // 3. Validar inventarios duplicados dentro del mismo formulario
      const counts: Record<string, number> = {};
      let duplicadoEnForm = '';
      for (const inv of invs) {
          counts[inv] = (counts[inv] || 0) + 1;
          if (counts[inv] > 1 && !duplicadoEnForm) {
              duplicadoEnForm = inv;
          }
      }

      if (duplicadoEnForm) {
          const errorMsg = `El número de inventario "${duplicadoEnForm}" está duplicado en este mismo formulario. Cada ejemplar debe tener un número de inventario único.`;
          setFormError(errorMsg);
          setAlertModal({
              isOpen: true,
              title: 'Error: Inventario duplicado',
              message: errorMsg
          });
          return;
      }

      // 4. Validar inventarios contra la base de datos (otros recursos)
      for (const inv of invs) {
          const existente = await dbService.buscarRecursoPorInventario(inv);
          if (existente && existente.recurso.id !== editingId) {
              const errorMsg = `El número de inventario "${inv}" ya está registrado en la base de datos y pertenece al recurso "${existente.recurso.titulo}". Por favor, ingrese un número de inventario diferente.`;
              setFormError(errorMsg);
              setAlertModal({
                  isOpen: true,
                  title: 'Número de inventario ya existe',
                  message: errorMsg
              });
              return;
          }
      }

      // 5. Validar si ejemplares prestados están siendo eliminados o alterados
      if (editingId) {
          const recursoOriginal = recursos.find(r => r.id === editingId);
          if (recursoOriginal) {
              const ejemplaresPrestadosOriginales = recursoOriginal.ejemplares.filter(e => e.estado === EstadoRecurso.PRESTADO);
              for (const ejemplar of ejemplaresPrestadosOriginales) {
                  const todaviaExiste = inventarios.some(i => i.inventario.trim() === ejemplar.inventario);
                  if (!todaviaExiste) {
                      const errorMsg = `El ejemplar con número de inventario "${ejemplar.inventario}" tiene un préstamo activo. No se puede remover ni alterar hasta que sea devuelto.`;
                      setFormError(errorMsg);
                      setAlertModal({
                          isOpen: true,
                          title: 'No se puede modificar el ejemplar',
                          message: errorMsg
                      });
                      return;
                  }
              }
          }
      }

      // Lógica de ejemplares: Preservar o actualizar estado
      let nuevosEjemplares: Ejemplar[] = [];
      if (editingId) {
          // Buscar el recurso original para preservar estados de ejemplares existentes
          const recursoOriginal = recursos.find(r => r.id === editingId);
          nuevosEjemplares = inventarios.filter(i => i.inventario.trim() !== '').map(invObj => {
              const ejemplarExistente = recursoOriginal?.ejemplares.find(e => e.inventario === invObj.inventario);
              const estadoFinal = invObj.estado || ejemplarExistente?.estado || EstadoRecurso.DISPONIBLE;
              return { 
                inventario: invObj.inventario, 
                estado: estadoFinal, 
                ubicacion: invObj.ubicacion || undefined 
              };
          });
      } else {
          nuevosEjemplares = inventarios.filter(i => i.inventario.trim() !== '').map(invObj => ({ 
              inventario: invObj.inventario, 
              estado: invObj.estado || EstadoRecurso.DISPONIBLE,
              ubicacion: invObj.ubicacion || undefined
          }));
      }

      const recursoData: Omit<Recurso, 'id'> = {
          tipo_material: tipoMaterial,
          titulo,
          variante_titulo: varianteTitulo || undefined,
          titulo_uniforme: tituloUniforme || undefined,
          titulo_clave: tituloClave || undefined,
          responsabilidad_principal: respPrincipal,
          responsabilidad_secundaria: respSecundarias.filter(r => r.nombre.trim() !== '' && !esAutorDuplicado(respPrincipal.nombre, r.nombre)),
          lugar_publicacion: lugares.filter(l => l.trim() !== ''),
          editor: editores.filter(e => e.trim() !== ''),
          fecha: fechas.filter(f => f.trim() !== ''),
          edicion,
          extension,
          otros_detalles_fisicos: otrosDetallesFisicos || undefined,
          dimensiones,
          material_complementario: materialComplementario || undefined,
          coleccion: coleccion.filter(c => c.trim() !== ''),
          notas: notas.filter(n => n.trim() !== ''),
          contenido: contenido.filter(c => c.trim() !== ''),
          numero_normalizado: numerosNormalizados.filter(num => num.trim() !== ''),
          url_recurso: urlRecurso || undefined,
          frecuencia: frecuencia || undefined,
          volumen_numero: volumenNumero || undefined,
          existencias: existencias || undefined,
          escala: escala || undefined,
          proyeccion: proyeccion || undefined,
          coordenadas: coordenadas || undefined,
          soporte_fisico: soporteFisico || undefined,
          color: color || undefined,
          formato_audio: formatoAudio || undefined,
          duracion: duracion || undefined,
          detalles_reproduccion: detallesReproduccion || undefined,
          instrumentacion: instrumentacion || undefined,
          clave_tono: claveTono || undefined,
          formato_video: formatoVideo || undefined,
          sistema_grabacion: sistemaGrabacion || undefined,
          descripcion_objeto: descripcionObjeto || undefined,
          dimensiones_3d: dimensiones3d || undefined,
          tesis: tesis || undefined,
          temas: temas.filter(t => t.trim() !== ''),
          ejemplares: nuevosEjemplares
      };

      if (editingId) {
          await dbService.actualizarRecurso({ ...recursoData, id: editingId });
      } else {
          await dbService.crearRecurso(recursoData);
      }

      resetForm();
      setView('list');
      loadRecursos();
      loadIndices();
      loadAuthorities();
  };

  const resetForm = () => {
      setEditingId(null);
      setFormError(null);
      setTitulo(''); setVarianteTitulo(''); setTituloUniforme(''); setTituloClave('');
      setRespPrincipal({ tipo: 'AUTOR', nombre: '' });
      setRespSecundarias([]);
      setLugares(['']); setEditores(['']); setFechas(['']);
      setEdicion(''); setExtension(''); setOtrosDetallesFisicos(''); setDimensiones(''); setMaterialComplementario('');
      setColeccion(['']); setNotas([]); setContenido([]); setNumerosNormalizados(['']);
      setFrecuencia(''); setVolumenNumero(''); setExistencias(''); setUrlRecurso('');
      setEscala(''); setProyeccion(''); setCoordenadas('');
      setSoporteFisico(''); setColor('');
      setFormatoAudio(''); setDuracion(''); setDetallesReproduccion('');
      setInstrumentacion(''); setClaveTono('');
      setFormatoVideo(''); setSistemaGrabacion('');
      setDescripcionObjeto(''); setDimensiones3d('');
      setTesis('');
      setTemas([]); setInventarios([]);
  };

  const handleEdit = (recurso: Recurso) => {
      setEditingId(recurso.id);
      setTipoMaterial(recurso.tipo_material);
      setTitulo(recurso.titulo);
      setVarianteTitulo(recurso.variante_titulo || (recurso as any).subtitulo || '');
      setTituloUniforme(recurso.titulo_uniforme || '');
      setTituloClave(recurso.titulo_clave || '');
      setRespPrincipal(recurso.responsabilidad_principal);
      setRespSecundarias(recurso.responsabilidad_secundaria || []);
      // Load lugares
      let initialLugares: string[] = [''];
      if (recurso.lugar_publicacion) {
          if (Array.isArray(recurso.lugar_publicacion)) {
              initialLugares = recurso.lugar_publicacion.length > 0 ? recurso.lugar_publicacion : [''];
          } else if (typeof recurso.lugar_publicacion === 'string') {
              initialLugares = [recurso.lugar_publicacion];
          }
      }
      setLugares(initialLugares);

      // Load editores
      let initialEditores: string[] = [''];
      if (recurso.editor) {
          if (Array.isArray(recurso.editor)) {
              initialEditores = recurso.editor.length > 0 ? recurso.editor : [''];
          } else if (typeof recurso.editor === 'string') {
              initialEditores = [recurso.editor];
          }
      } else if ((recurso as any).editorial) {
          if (Array.isArray((recurso as any).editorial)) {
              initialEditores = (recurso as any).editorial.length > 0 ? (recurso as any).editorial : [''];
          } else if (typeof (recurso as any).editorial === 'string') {
              initialEditores = [(recurso as any).editorial];
          }
      }
      setEditores(initialEditores);

      // Load fechas
      let initialFechas: string[] = [''];
      if (recurso.fecha) {
          if (Array.isArray(recurso.fecha)) {
              initialFechas = recurso.fecha.length > 0 ? recurso.fecha : [''];
          } else if (typeof recurso.fecha === 'string') {
              initialFechas = [recurso.fecha];
          }
      } else if ((recurso as any).anio) {
          if (Array.isArray((recurso as any).anio)) {
              initialFechas = (recurso as any).anio.length > 0 ? (recurso as any).anio : [''];
          } else if (typeof (recurso as any).anio === 'string') {
              initialFechas = [(recurso as any).anio];
          }
      }
      setFechas(initialFechas);
      setEdicion(recurso.edicion || '');
      setExtension(recurso.extension || (recurso as any).paginas || '');
      setOtrosDetallesFisicos(recurso.otros_detalles_fisicos || (recurso as any).ilustraciones || '');
      setDimensiones(recurso.dimensiones || '');
      setMaterialComplementario(recurso.material_complementario || '');
      let initialColeccion: string[] = [''];
      if (recurso.coleccion) {
          if (Array.isArray(recurso.coleccion)) {
              initialColeccion = recurso.coleccion.length > 0 ? recurso.coleccion : [''];
          } else if (typeof recurso.coleccion === 'string') {
              initialColeccion = [recurso.coleccion];
          }
      }
      setColeccion(initialColeccion);
      setNotas(recurso.notas && recurso.notas.length > 0 ? recurso.notas : ['']);
      setContenido(recurso.contenido && recurso.contenido.length > 0 ? recurso.contenido : ['']);
      
      let initialNormalizados: string[] = [''];
      if (recurso.numero_normalizado) {
          if (Array.isArray(recurso.numero_normalizado)) {
              initialNormalizados = recurso.numero_normalizado.length > 0 ? recurso.numero_normalizado : [''];
          }
      } else if ((recurso as any).isbn) {
          const legIsbn = (recurso as any).isbn;
          if (Array.isArray(legIsbn)) {
              initialNormalizados = legIsbn.length > 0 ? legIsbn : [''];
          } else if (typeof legIsbn === 'string') {
              initialNormalizados = [legIsbn];
          }
      } else if ((recurso as any).issn) {
          const legIssn = (recurso as any).issn;
          if (Array.isArray(legIssn)) {
              initialNormalizados = legIssn.length > 0 ? legIssn : [''];
          } else if (typeof legIssn === 'string') {
              initialNormalizados = [legIssn];
          }
      }
      setNumerosNormalizados(initialNormalizados);

      setFrecuencia(recurso.frecuencia || '');
      setVolumenNumero(recurso.volumen_numero || '');
      setExistencias(recurso.existencias || '');
      setUrlRecurso(recurso.url_recurso || '');
      setEscala(recurso.escala || '');
      setProyeccion(recurso.proyeccion || '');
      setCoordenadas(recurso.coordenadas || '');
      setSoporteFisico(recurso.soporte_fisico || '');
      setColor(recurso.color || '');
      setFormatoAudio(recurso.formato_audio || '');
      setDuracion(recurso.duracion || '');
      setDetallesReproduccion(recurso.detalles_reproduccion || '');
      setInstrumentacion(recurso.instrumentacion || '');
      setClaveTono(recurso.clave_tono || '');
      setFormatoVideo(recurso.formato_video || '');
      setSistemaGrabacion(recurso.sistema_grabacion || '');
      setDescripcionObjeto(recurso.descripcion_objeto || '');
      setDimensiones3d(recurso.dimensiones_3d || '');
      setTesis(recurso.tesis || '');

      setTemas(recurso.temas && recurso.temas.length > 0 ? recurso.temas : ['']);
      setInventarios(recurso.ejemplares.map(e => ({ inventario: e.inventario, ubicacion: e.ubicacion || '', estado: e.estado })));
      setView('form');
      window.scrollTo({ top: 0, behavior: 'instant' });
      const mainContainer = document.querySelector('.overflow-y-auto');
      if (mainContainer) {
        mainContainer.scrollTop = 0;
      }
  };

  const handleDuplicate = () => {
      setEditingId(null);
      // Limpiar inventarios y ubicaciones para el nuevo registro manteniendo todos los demás metadatos
      setInventarios([
          {
              inventario: '',
              ubicacion: '',
              estado: EstadoRecurso.DISPONIBLE
          }
      ]);
      setFormError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const mainContainer = document.querySelector('.overflow-y-auto');
      if (mainContainer) {
          mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleDelete = (recurso: Recurso) => {
      const ejemplaresPrestados = recurso.ejemplares.filter(e => e.estado === EstadoRecurso.PRESTADO);
      if (ejemplaresPrestados.length > 0) {
          const invList = ejemplaresPrestados.map(e => e.inventario).join(', ');
          setAlertModal({
              isOpen: true,
              title: 'No se puede eliminar el registro',
              message: `El registro de "${recurso.titulo}" no puede ser eliminado porque tiene ejemplares actualmente en préstamo (Inventarios: ${invList}). Registre la devolución de todos los ejemplares antes de intentar eliminar el registro.`
          });
          return;
      }

      setConfirmModal({
          isOpen: true,
          title: 'Confirmar eliminación',
          message: `¿Está seguro de eliminar el registro de "${recurso.titulo}"? Esta acción no se puede deshacer y borrará también todos sus ejemplares e inventarios asociados.`,
          onConfirm: async () => {
              try {
                  await dbService.eliminarRecurso(recurso.id);
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  await loadRecursos(); // Recargar lista
                  loadIndices();
                  loadAuthorities();
              } catch (error: any) {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  setAlertModal({
                      isOpen: true,
                      title: 'Error al eliminar',
                      message: error.message || "Error al eliminar el registro"
                  });
              }
          }
      });
  };

  const handleSelectMaterial = (type: string) => {
      setTipoMaterial(type);
      setView('form');
      window.scrollTo({ top: 0, behavior: 'instant' });
      const mainContainer = document.querySelector('.overflow-y-auto');
      if (mainContainer) {
        mainContainer.scrollTop = 0;
      }
      // Inicializar campos repetibles con al menos un input vacío
      setLugares(['']);
      setEditores(['']);
      setFechas(['']);
      setNotas(['']);
      setContenido(['']);
      setNumerosNormalizados(['']);
      setTemas(['']);
      setInventarios([{ inventario: '', ubicacion: '', estado: EstadoRecurso.DISPONIBLE }]);
  };

  const handleDeleteTerm = (term: string) => {
      setConfirmModal({
          isOpen: true,
          title: 'Confirmar eliminación de término',
          message: `¿Está seguro de eliminar el término "${term}" de la base de datos? Esto removerá automáticamente este término de todos los registros bibliográficos del catálogo donde esté asignado.`,
          onConfirm: async () => {
              try {
                  await dbService.eliminarTerminoIndizacion(term);
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  await loadIndices();
                  await loadRecursos(); // Recargar los recursos para limpiar el término visualmente de inmediato
              } catch (error: any) {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  setAlertModal({
                      isOpen: true,
                      title: 'Error al eliminar',
                      message: error.message || "Error al eliminar el término"
                  });
              }
          }
      });
  };

  const handleEditTerm = (term: string) => {
      setEditTermModal({
          isOpen: true,
          oldTerm: term,
          newTerm: term
      });
  };

  const handleSaveEditTerm = async () => {
      const { oldTerm, newTerm } = editTermModal;
      if (!newTerm.trim()) {
          setAlertModal({
              isOpen: true,
              title: 'Campo vacío',
              message: 'El término o descriptor no puede estar vacío.'
          });
          return;
      }
      try {
          await dbService.actualizarTerminoIndizacion(oldTerm, newTerm);
          setEditTermModal({ isOpen: false, oldTerm: '', newTerm: '' });
          await loadIndices();
          await loadRecursos();
      } catch (error: any) {
          setEditTermModal({ isOpen: false, oldTerm: '', newTerm: '' });
          setAlertModal({
              isOpen: true,
              title: 'Error al actualizar',
              message: error.message || "Ocurrió un error al intentar actualizar el término de indización."
          });
      }
  };

  const handleDeleteAuthority = (authority: string) => {
      setConfirmModal({
          isOpen: true,
          title: 'Confirmar eliminación de autoridad',
          message: `¿Está seguro de eliminar la autoridad "${authority}" de la base de datos? Esto removerá automáticamente esta autoridad de todos los registros bibliográficos del catálogo donde esté asignado.`,
          onConfirm: async () => {
              try {
                  await dbService.eliminarAutoridad(authority);
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  await loadAuthorities();
                  await loadRecursos();
              } catch (error: any) {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  setAlertModal({
                      isOpen: true,
                      title: 'Error al eliminar',
                      message: error.message || "Error al eliminar la autoridad"
                  });
              }
          }
      });
  };

  const handleEditAuthority = (authority: string) => {
      setEditAuthorityModal({
          isOpen: true,
          oldAuthority: authority,
          newAuthority: authority
      });
  };

  const handleSaveEditAuthority = async () => {
      const { oldAuthority, newAuthority } = editAuthorityModal;
      if (!newAuthority.trim()) {
          setAlertModal({
              isOpen: true,
              title: 'Campo vacío',
              message: 'El nombre de la autoridad no puede estar vacío.'
          });
          return;
      }
      try {
          await dbService.actualizarAutoridad(oldAuthority, newAuthority);
          setEditAuthorityModal({ isOpen: false, oldAuthority: '', newAuthority: '' });
          await loadAuthorities();
          await loadRecursos();
      } catch (error: any) {
          setEditAuthorityModal({ isOpen: false, oldAuthority: '', newAuthority: '' });
          setAlertModal({
              isOpen: true,
              title: 'Error al actualizar',
              message: error.message || "Ocurrió un error al intentar actualizar el nombre del autor/autoridad."
          });
      }
  };

  // --- RENDER ---
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Catálogo unificado</h2>
        </div>
        {(view === 'list' || view === 'indices' || view === 'authorities') && (
          <div className="flex gap-3">
             <button 
                onClick={() => { resetForm(); setView('select_type'); }}
                className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-medium"
                id="btn-nuevo-registro"
            >
                + Nuevo registro
             </button>
          </div>
        )}
        {(view === 'select_type' || view === 'form') && (
            <button 
                onClick={() => { setView('list'); resetForm(); }}
                className="px-4 py-2 rounded font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 transition duration-150"
                id="btn-volver-listado"
            >
                Volver al Catálogo
            </button>
        )}
      </div>

      {/* TABS DE CATALOGACIÓN */}
      {(view === 'list' || view === 'indices' || view === 'authorities') && (
          <div className="flex border-b border-gray-300 mb-6">
              <button 
                onClick={() => setView('list')}
                className={`py-3 px-6 font-semibold border-b-2 text-sm flex items-center gap-2 ${view === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                  📚 Registros
              </button>
              <button 
                onClick={() => setView('indices')}
                className={`py-3 px-6 font-semibold border-b-2 text-sm flex items-center gap-2 ${view === 'indices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                  🏷️ Términos de Indización ({availableTerms.length})
              </button>
              <button 
                onClick={() => setView('authorities')}
                className={`py-3 px-6 font-semibold border-b-2 text-sm flex items-center gap-2 ${view === 'authorities' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                  👤 Control de Autoridades ({authorities.length})
              </button>
          </div>
      )}

      {/* VISTA: LISTA DE RECURSOS & BÚSQUEDA */}
      {view === 'list' && (
        <div className="space-y-6">
            {/* Buscador Potente */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <span className="absolute left-4 top-3.5 text-gray-400 text-lg">🔍</span>
                    <input 
                        type="text" 
                        placeholder="Buscar por título, autor, serie, descriptor o nro. de inventario..." 
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none text-base"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button 
                            onClick={() => setSearch('')}
                            className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Panel de Estadísticas Breves sobre la Selección */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50 text-center">
                    <span className="block text-xs text-gray-500 uppercase font-semibold">Recursos encontrados</span>
                    <span className="text-xl font-bold text-blue-900">{recursos.length}</span>
                </div>
                <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-100/50 text-center">
                    <span className="block text-xs text-gray-500 uppercase font-semibold">Ejemplares físicos</span>
                    <span className="text-xl font-bold text-purple-900">
                        {recursos.reduce((acc, r) => acc + r.ejemplares.length, 0)}
                    </span>
                </div>
                <div className="bg-green-50/50 p-3 rounded-lg border border-green-100/50 text-center">
                    <span className="block text-xs text-gray-500 uppercase font-semibold">Disponibles</span>
                    <span className="text-xl font-bold text-green-900">
                        {recursos.reduce((acc, r) => acc + r.ejemplares.filter(e => e.estado === EstadoRecurso.DISPONIBLE).length, 0)}
                    </span>
                </div>
                <div className="bg-red-50/50 p-3 rounded-lg border border-red-100/50 text-center">
                    <span className="block text-xs text-gray-500 uppercase font-semibold">Fuera de servicio / Prestados</span>
                    <span className="text-xl font-bold text-red-900">
                        {recursos.reduce((acc, r) => acc + r.ejemplares.filter(e => e.estado !== EstadoRecurso.DISPONIBLE).length, 0)}
                    </span>
                </div>
            </div>

            {/* Listado de Registros Bibliográficos + búsqueda */}
            {recursos.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
                    <span className="text-4xl block mb-2">📁</span>
                    <p className="font-medium text-lg">No se encontraron registros catalogados</p>
                    <p className="text-sm mt-1">Pruebe modificando el término de búsqueda o registre un nuevo material utilizando el botón superior.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {(() => {
                        const displayRecursos = recursosSorted.slice(0, visibleCount);
                        return displayRecursos.map(l => {
                            const totalEjemplares = l.ejemplares.length;
                            const dispEjemplares = l.ejemplares.filter(e => e.estado === EstadoRecurso.DISPONIBLE).length;
                            const esDisponible = dispEjemplares > 0;
                            const tituloAMostrar = (!l.titulo || l.titulo === 'Título Desconocido') ? (l.titulo_clave || l.titulo || 'Título Desconocido') : l.titulo;


                        return (
                            <div key={l.id} className="bg-white hover:shadow-md transition-shadow duration-200 rounded-xl border border-gray-200 p-5 md:p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                                <ImagenRegistro 
                                  tipoMaterial={l.tipo_material} 
                                  titulo={tituloAMostrar}
                                  inventarios={l.ejemplares.map(e => e.inventario)}
                                />
                                {/* Información Bibliométrica */}
                                <div className="flex-1 space-y-3">


                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                                            {tituloAMostrar}
                                            {(l.variante_titulo || (l as any).subtitulo) && <span className="text-gray-500 font-normal"> | {l.variante_titulo || (l as any).subtitulo}</span>}
                                        </h3>
                                        {l.titulo_clave && l.titulo_clave !== tituloAMostrar && (
                                            <p className="text-xs text-teal-600 mt-0.5 font-medium">Título clave: {l.titulo_clave}</p>
                                        )}
                                        {l.titulo_uniforme && (
                                            <p className="text-xs text-gray-400 mt-0.5 italic">
                                                Título uniforme:{' '}
                                                <button
                                                    type="button"
                                                    onClick={() => handleFilterShortcut(l.titulo_uniforme!)}
                                                    className="hover:underline decoration-1 underline-offset-2 text-left focus:outline-none cursor-pointer"
                                                >
                                                    {l.titulo_uniforme}
                                                </button>
                                            </p>
                                        )}
                                    </div>

                                    {/* Mención de Responsabilidad */}
                                    <div className="text-sm text-gray-700 space-y-0.5">
                                        <p>
                                            <span className="text-gray-500 font-medium">Responsable principal: </span>
                                            <span className="font-semibold text-gray-800">{l.responsabilidad_principal?.nombre || '—'}</span>
                                            {l.responsabilidad_principal?.nombre && (
                                                <span className="text-xs text-blue-600 ml-1.5 font-mono">({l.responsabilidad_principal.tipo})</span>
                                            )}
                                        </p>
                                        {l.responsabilidad_secundaria && l.responsabilidad_secundaria.filter(r => !esAutorDuplicado(l.responsabilidad_principal?.nombre, r.nombre)).length > 0 && (
                                            <p>
                                                <span className="text-gray-500 font-medium">Otros: </span>
                                                <span className="text-gray-800">
                                                    {l.responsabilidad_secundaria
                                                        .filter(r => !esAutorDuplicado(l.responsabilidad_principal?.nombre, r.nombre))
                                                        .map(r => `${r.nombre}`)
                                                        .join(' - ')}
                                                </span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Datos de registros con fondo gris */}
                                    <div className="border-t border-gray-100 pt-3 bg-gray-50/50 p-3.5 rounded-lg text-xs text-gray-600 space-y-2.5">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2.5 gap-x-4">
                                            {((l.editor && l.editor.filter(Boolean).length > 0) || (l.lugar_publicacion && l.lugar_publicacion.filter(Boolean).length > 0) || l.editorial) && (
                                                <div>
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Editorial / Lugar</span>
                                                    <span className="font-medium text-gray-800">
                                                        {l.editor && l.editor.filter(Boolean).length > 0
                                                            ? l.editor.filter(Boolean).join(', ')
                                                            : (l.editorial || '')}
                                                        {((l.lugar_publicacion && Array.isArray(l.lugar_publicacion) && l.lugar_publicacion.filter(Boolean).length > 0) || (typeof l.lugar_publicacion === 'string' && l.lugar_publicacion)) ? (
                                                            ` (${Array.isArray(l.lugar_publicacion) ? l.lugar_publicacion.filter(Boolean).join(', ') : l.lugar_publicacion})`
                                                        ) : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {((l.fecha && l.fecha.filter(Boolean).length > 0) || l.anio || l.edicion) && (
                                                <div>
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Año / Edición</span>
                                                    <span className="font-medium text-gray-800">
                                                        {l.fecha && l.fecha.filter(Boolean).length > 0
                                                            ? l.fecha.filter(Boolean).join(', ')
                                                            : (l.anio || '')}
                                                        {l.edicion ? ` - ${l.edicion}` : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {(l.extension || l.paginas || l.otros_detalles_fisicos || (l as any).ilustraciones || l.dimensiones || l.material_complementario) && (
                                                <div>
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Descripción Física</span>
                                                    <span className="font-medium text-gray-800">
                                                        {l.extension || l.paginas || ''}{(l.otros_detalles_fisicos || (l as any).ilustraciones) ? ` : ${l.otros_detalles_fisicos || (l as any).ilustraciones}` : ''}{l.dimensiones ? ` ; ${l.dimensiones}` : ''}{l.material_complementario ? ` + ${l.material_complementario}` : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {((l.numero_normalizado && l.numero_normalizado.filter(Boolean).length > 0) || (l.numero_nomalizado && l.numero_nomalizado.filter(Boolean).length > 0) || ((l as any).isbn && (Array.isArray((l as any).isbn) ? (l as any).isbn.filter(Boolean).length > 0 : (l as any).isbn)) || ((l as any).issn && (Array.isArray((l as any).issn) ? (l as any).issn.filter(Boolean).length > 0 : (l as any).issn))) && (
                                                <div>
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Número normalizado</span>
                                                    <span className="font-mono text-gray-800 font-medium whitespace-pre-wrap block">
                                                        {l.numero_normalizado && l.numero_normalizado.filter(Boolean).length > 0 
                                                            ? l.numero_normalizado.filter(Boolean).join(', ') 
                                                            : l.numero_nomalizado && l.numero_nomalizado.filter(Boolean).length > 0
                                                                ? l.numero_nomalizado.filter(Boolean).join(', ')
                                                                : (l as any).isbn 
                                                                    ? (Array.isArray((l as any).isbn) ? (l as any).isbn.filter(Boolean).join(', ') : (l as any).isbn)
                                                                    : (Array.isArray((l as any).issn) ? (l as any).issn.filter(Boolean).join(', ') : (l as any).issn)}
                                                    </span>
                                                </div>
                                            )}
                                            {l.frecuencia && (
                                                <div>
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Frecuencia</span>
                                                    <span className="font-medium text-gray-800">{l.frecuencia}</span>
                                                </div>
                                            )}
                                            {l.volumen_numero && (
                                                <div>
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Volumen / Nro</span>
                                                    <span className="font-medium text-gray-800">{l.volumen_numero}</span>
                                                </div>
                                            )}
                                            {l.existencias && (
                                                <div className="col-span-2">
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Existencias (MARC 866)</span>
                                                    <span className="font-mono text-xs text-teal-800 bg-teal-50 px-2 py-1 rounded block mt-1 border border-teal-100">{l.existencias}</span>
                                                </div>
                                            )}
                                            {l.escala && (
                                                <div className="col-span-2">
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Detalles Cartográficos</span>
                                                    <span className="font-medium text-gray-850">
                                                        {l.escala}{l.proyeccion ? ` (${l.proyeccion})` : ''}{l.coordenadas ? ` [${l.coordenadas}]` : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {l.url_recurso && (
                                                <div className="col-span-2">
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Recurso Electrónico</span>
                                                    <a 
                                                        href={l.url_recurso.startsWith('http') ? l.url_recurso : `https://${l.url_recurso}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-xs block mt-1 break-all flex items-center gap-1"
                                                    >
                                                        <span>🔗</span> {l.url_recurso}
                                                    </a>
                                                </div>
                                            )}
                                            

                                            {(l.formato_audio || l.duracion || l.detalles_reproduccion) && l.tipo_material === 'Audio' && (
                                                <div>
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Grabación Audio</span>
                                                    <span className="font-medium text-gray-800">
                                                        {l.formato_audio || ''}{l.duracion ? ` (${l.duracion})` : ''}{l.detalles_reproduccion ? ` ; ${l.detalles_reproduccion}` : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {(l.instrumentacion || l.clave_tono) && l.tipo_material === 'Partituras' && (
                                                <div>
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Música Impresa</span>
                                                    <span className="font-medium text-gray-800">
                                                        {l.instrumentacion || ''}{l.clave_tono ? ` / ${l.clave_tono}` : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {(l.formato_video || l.duracion || l.sistema_grabacion) && l.tipo_material === 'Video' && (
                                                <div>
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Videograbación</span>
                                                    <span className="font-medium text-gray-800">
                                                        {l.formato_video || ''}{l.duracion ? ` (${l.duracion})` : ''}{l.sistema_grabacion ? ` ; ${l.sistema_grabacion}` : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {(l.descripcion_objeto || l.dimensiones_3d) && l.tipo_material === 'Objetos' && (
                                                <div>
                                                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Físico / Realia</span>
                                                    <span className="font-medium text-gray-800">
                                                        {l.descripcion_objeto || ''}{l.dimensiones_3d ? ` [${l.dimensiones_3d}]` : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {l.coleccion && (Array.isArray(l.coleccion) ? l.coleccion.some(c => c.trim() !== '') : l.coleccion.trim() !== '') && (
                                            <div className="border-t border-pink-100/60 bg-pink-50/60 -mx-3.5 px-3.5 py-2.5 text-xs mt-2.5">
                                                <span className="text-pink-700 block font-semibold uppercase tracking-wider text-[10px] mb-1 font-sans">Serie / Colección</span>
                                                <span className="font-semibold text-pink-900">
                                                    {Array.isArray(l.coleccion) ? (
                                                        l.coleccion.filter(c => c.trim() !== '').map((item, idx, arr) => (
                                                            <React.Fragment key={idx}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFilterShortcut(extraerTituloSerie(item.trim()))}
                                                                    className="hover:underline decoration-1 underline-offset-2 text-left focus:outline-none cursor-pointer"
                                                                >
                                                                    {item.trim()}
                                                                </button>
                                                                {idx < arr.length - 1 && ' ; '}
                                                            </React.Fragment>
                                                        ))
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFilterShortcut(extraerTituloSerie(l.coleccion as string))}
                                                            className="hover:underline decoration-1 underline-offset-2 text-left focus:outline-none cursor-pointer"
                                                        >
                                                            {l.coleccion}
                                                        </button>
                                                    )}
                                                </span>
                                            </div>
                                        )}

                                        {/* Notas con el mismo estilo y fondo de letra chica */}
                                        {l.notas && l.notas.length > 0 && l.notas.filter(n => n.trim() !== '').length > 0 && (
                                            <div className="border-t border-gray-200/60 pt-2.5 text-xs text-gray-600">
                                                <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px] mb-1">Notas</span>
                                                <ul className="list-disc list-inside space-y-0.5 text-gray-800 font-medium">
                                                    {l.notas.filter(n => n.trim() !== '').map((nota, i) => <li key={i}>{nota}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Tesis / Trabajo de investigación para Manuscrito */}
                                        {l.tipo_material === 'Manuscrito' && l.tesis && l.tesis.trim() !== '' && (
                                            <div className="border-t border-purple-100/60 pt-2.5 text-xs text-gray-600">
                                                <span className="text-purple-700 block font-semibold uppercase tracking-wider text-[10px] mb-1 font-sans">Tesis / Trabajo de Investigación</span>
                                                <span className="font-semibold text-purple-950 block">{l.tesis}</span>
                                            </div>
                                        )}

                                        {/* Contenido con fondo amarillo tenue */}
                                        {l.contenido && l.contenido.length > 0 && l.contenido.filter(c => c.trim() !== '').length > 0 && (
                                            <div className="border-t border-amber-100 pt-2.5 text-xs text-gray-600 bg-amber-50/80 -mx-3.5 -mb-3.5 px-3.5 pb-3.5 rounded-b-lg">
                                                <span className="text-amber-800/80 block font-semibold uppercase tracking-wider text-[10px] mb-1">Contenido</span>
                                                <ul className="list-disc list-inside space-y-0.5 text-amber-950 font-medium">
                                                    {l.contenido.filter(c => c.trim() !== '').map((item, i) => <li key={i}>{item}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Descriptores de materia */}
                                    {l.temas && l.temas.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                                            {l.temas.map((t, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleFilterShortcut(t)}
                                                    className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-tight hover:underline decoration-1 underline-offset-2 focus:outline-none cursor-pointer text-left"
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Estadísticas de Ejemplares y Ubicación Física */}
                                <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-gray-100 pt-5 md:pt-0 md:pl-5 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <div>
                                                <span className="text-xs text-gray-500 font-medium block">Total de Ejemplares</span>
                                                <span className="text-lg font-bold text-gray-800">{totalEjemplares}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-gray-500 font-medium block">Disponibles</span>
                                                <span className={`text-lg font-bold ${esDisponible ? 'text-green-600' : 'text-red-500'}`}>
                                                    {dispEjemplares}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Existencias de Ejemplares en la biblioteca */}
                                        <div className="space-y-2 max-h-[170px] overflow-y-auto pr-2 custom-scrollbar">
                                            <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-1.5">Ubicaciones y Estados</h4>
                                            {totalEjemplares === 0 ? (
                                                <p className="text-xs text-red-500 italic">No hay ejemplares físicos registrados</p>
                                            ) : (
                                                l.ejemplares.map((e, idx) => {
                                                    let badgeColor = 'bg-gray-100 text-gray-800 border-gray-200';
                                                    if (e.estado === EstadoRecurso.DISPONIBLE) badgeColor = 'bg-green-100 text-green-800 border-green-200';
                                                    else if (e.estado === EstadoRecurso.PRESTADO) badgeColor = 'bg-red-100 text-red-800 border-red-200';
                                                    else if (e.estado === EstadoRecurso.SALA) badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
                                                    else if (e.estado === EstadoRecurso.PERDIDO) badgeColor = 'bg-orange-100 text-orange-800 border-orange-200';
                                                    else if (e.estado === EstadoRecurso.NO_DISPONIBLE) badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';

                                                    return (
                                                        <div key={idx} className="flex justify-between items-center text-xs p-2 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded transition duration-150">
                                                            <div className="truncate pr-2">
                                                                <span className="font-sans font-bold text-gray-800 text-[11px] bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                                                    {e.inventario}
                                                                </span>
                                                                {e.ubicacion && (
                                                                    <span className="text-gray-500 ml-1.5 italic text-[11px]" title={`Ubicación: ${e.ubicacion}`}>
                                                                        {e.ubicacion}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={`px-2 py-0.5 text-[10px] rounded border font-semibold ${badgeColor}`}>
                                                                {e.estado}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Botones de Acción Administrativa (✏️ Editar y 🗑️ Eliminar) */}
                                    <div className="flex gap-2.5 pt-5 border-t border-gray-100 mt-4">
                                        <button 
                                            onClick={() => handleEdit(l)}
                                            className="flex-1 px-3 py-1.5 text-xs text-blue-700 font-semibold bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:text-blue-900 rounded-lg transition duration-150 flex items-center justify-center gap-1 shadow-sm"
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(l)}
                                            className="flex-1 px-3 py-1.5 text-xs text-red-700 font-semibold bg-red-50 border border-red-200 hover:bg-red-100 hover:text-red-900 rounded-lg transition duration-150 flex items-center justify-center gap-1 shadow-sm"
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    });
                  })()}

                  {(() => {
                      if (recursosSorted.length > visibleCount) {
                          const remainingCount = recursosSorted.length - visibleCount;
                          return (
                              <div className="mt-8 flex flex-col items-center justify-center space-y-4 pb-8">
                                  <div className="w-full max-w-xs bg-gray-300 rounded-full h-1.5 overflow-hidden">
                                      <div 
                                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                          style={{ width: `${(Math.min(visibleCount, recursosSorted.length) / recursosSorted.length) * 100}%` }}
                                      />
                                  </div>
                                  <p className="text-sm text-gray-500 font-sans text-center">
                                      Mostrando <strong className="text-gray-700">{Math.min(visibleCount, recursosSorted.length)}</strong> de <strong className="text-gray-700">{recursosSorted.length}</strong> recursos catalogados.
                                  </p>
                                  <button
                                      onClick={() => setVisibleCount(prev => prev + 20)}
                                      className="px-6 py-2.5 text-sm font-semibold text-blue-700 bg-white border border-blue-300 hover:bg-blue-50 hover:border-blue-400 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition duration-150 flex items-center gap-2 cursor-pointer"
                                  >
                                      <span>Mostrar más resultados</span>
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">+{Math.min(20, remainingCount)}</span>
                                  </button>
                              </div>
                          );
                      }
                      return null;
                  })()}
                </div>
            )}
        </div>
      )}

      {/* VISTA: LISTA INDIZACIÓN */}
      {view === 'indices' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-2 font-sans">Base de datos de Indización</h3>
              <p className="mb-4 text-sm text-gray-500 font-sans">Listado de descriptores de materia utilizados en el catálogo. El número encerrado en un círculo indica cuántas veces ha sido asignado cada descriptor a los recursos. Puede editar o eliminar términos; los cambios se propagarán automáticamente a todo el Catálogo.</p>
                  
                  {/* Buscador de Términos */}
                  <div className="relative w-full mb-6">
                      <span className="absolute left-4 top-3 text-gray-400 text-base">🔍</span>
                      <input 
                          type="text" 
                          placeholder="Filtrar términos de indización..." 
                          className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none text-sm"
                          value={searchTerms}
                          onChange={e => {
                              setSearchTerms(e.target.value);
                              setVisibleTermsCount(150); // Restablecer paginación al buscar
                          }}
                      />
                      {searchTerms && (
                          <button 
                              onClick={() => setSearchTerms('')}
                              className="absolute right-4 top-3 text-gray-400 hover:text-gray-600"
                          >
                              ✕
                          </button>
                      )}
                  </div>

                  {filteredTerms.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-8">No se encontraron términos que coincidan con la búsqueda.</p>
                  ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {filteredTerms.slice(0, visibleTermsCount).map((term, i) => {
                              const count = termCounts[term] || 0;
                              return (
                                  <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 flex justify-between items-center group hover:bg-blue-50/10 hover:border-blue-200 hover:shadow-sm transition duration-150">
                                      <div className="flex items-center min-w-0 flex-1 gap-2">
                                          <span className="font-semibold text-gray-800 truncate font-sans" title={term}>{term}</span>
                                          <span 
                                              className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono transition-colors border ${
                                                  count > 0 
                                                      ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                                      : 'bg-gray-100 text-gray-400 border-gray-200'
                                              }`}
                                          >
                                              {count}
                                          </span>
                                      </div>
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0">
                                          <button
                                            onClick={() => handleEditTerm(term)}
                                            className="text-gray-400 hover:text-blue-600 p-1 transition-colors"
                                            title="Editar término de indización"
                                          >
                                             ✏️
                                          </button>
                                          <button
                                            onClick={() => handleDeleteTerm(term)}
                                            className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                            title="Eliminar término de la base de datos"
                                          >
                                             🗑️
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}

                  {filteredTerms.length > visibleTermsCount && (
                      <div className="mt-8 flex flex-col items-center justify-center space-y-4 pb-4">
                          <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                  style={{ width: `${(Math.min(visibleTermsCount, filteredTerms.length) / filteredTerms.length) * 100}%` }}
                              />
                          </div>
                          <p className="text-sm text-gray-500 font-sans text-center">
                              Mostrando <strong className="text-gray-700">{Math.min(visibleTermsCount, filteredTerms.length)}</strong> de <strong className="text-gray-700">{filteredTerms.length}</strong> descriptores de materia.
                          </p>
                          <button
                              onClick={() => setVisibleTermsCount(prev => prev + 150)}
                              className="px-6 py-2.5 text-sm font-semibold text-blue-700 bg-white border border-blue-300 hover:bg-blue-50 hover:border-blue-400 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition duration-150 flex items-center gap-2 cursor-pointer"
                          >
                              <span>Mostrar más términos</span>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">+{Math.min(150, filteredTerms.length - visibleTermsCount)}</span>
                          </button>
                      </div>
                  )}
              </div>
          )}

      {/* VISTA: LISTA AUTORIDADES */}
      {view === 'authorities' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-2 font-sans">Control de Autoridades</h3>
              <p className="mb-4 text-sm text-gray-500 font-sans">Listado de autoridades de la biblioteca. El número encerrado en un círculo indica a cuántos recursos está asociado cada autoridad. Puede editar o eliminar autoridades; los cambios se propagarán automáticamente a todos los registros del Catálogo.</p>
                  
                  {/* Buscador de Autoridades */}
                  <div className="relative w-full mb-6">
                      <span className="absolute left-4 top-3 text-gray-400 text-base">🔍</span>
                      <input 
                          type="text" 
                          placeholder="Filtrar autoridades..." 
                          className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:outline-none text-sm"
                          value={searchAuthorities}
                          onChange={e => {
                              setSearchAuthorities(e.target.value);
                              setVisibleAuthoritiesCount(150); // Restablecer paginación al buscar
                          }}
                      />
                      {searchAuthorities && (
                          <button 
                              onClick={() => setSearchAuthorities('')}
                              className="absolute right-4 top-3 text-gray-400 hover:text-gray-600"
                          >
                              ✕
                          </button>
                      )}
                  </div>

                  {filteredAuthorities.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-8">No se encontraron autoridades que coincidan con la búsqueda.</p>
                  ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {filteredAuthorities.slice(0, visibleAuthoritiesCount).map((auth, i) => {
                              const count = authorityCounts[auth] || 0;
                              return (
                                  <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 flex justify-between items-center group hover:bg-blue-50/10 hover:border-blue-200 hover:shadow-sm transition duration-150">
                                      <div className="flex items-center min-w-0 flex-1 gap-2">
                                          <span className="font-semibold text-gray-800 truncate font-sans" title={auth}>{auth}</span>
                                          <span 
                                              className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono transition-colors border ${
                                                  count > 0 
                                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                      : 'bg-gray-100 text-gray-400 border-gray-200'
                                              }`}
                                          >
                                              {count}
                                          </span>
                                      </div>
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0">
                                          <button
                                            onClick={() => handleEditAuthority(auth)}
                                            className="text-gray-400 hover:text-blue-600 p-1 transition-colors"
                                            title="Editar nombre de autoridad"
                                          >
                                             ✏️
                                          </button>
                                          <button
                                            onClick={() => handleDeleteAuthority(auth)}
                                            className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                            title="Eliminar autoridad de la base de datos"
                                          >
                                             🗑️
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}

                  {filteredAuthorities.length > visibleAuthoritiesCount && (
                      <div className="mt-8 flex flex-col items-center justify-center space-y-4 pb-4">
                          <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                  className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300" 
                                  style={{ width: `${(Math.min(visibleAuthoritiesCount, filteredAuthorities.length) / filteredAuthorities.length) * 100}%` }}
                              />
                          </div>
                          <p className="text-sm text-gray-500 font-sans text-center">
                              Mostrando <strong className="text-gray-700">{Math.min(visibleAuthoritiesCount, filteredAuthorities.length)}</strong> de <strong className="text-gray-700">{filteredAuthorities.length}</strong> autoridades.
                          </p>
                          <button
                              onClick={() => setVisibleAuthoritiesCount(prev => prev + 150)}
                              className="px-6 py-2.5 text-sm font-semibold text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 transition duration-150 flex items-center gap-2 cursor-pointer"
                          >
                              <span>Mostrar más autoridades</span>
                              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">+{Math.min(150, filteredAuthorities.length - visibleAuthoritiesCount)}</span>
                          </button>
                      </div>
                  )}
              </div>
          )}

      {/* VISTA: SELECCIÓN DE TIPO DE MATERIAL */}
      {view === 'select_type' && (
          <div className="max-w-4xl mx-auto text-center">
              <h3 className="text-xl font-bold text-gray-750 mb-8 font-sans">Seleccione el tipo de material a catalogar</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                      { name: 'Libro', emoji: '📕' },
                      { name: 'Publicación seriada', emoji: '📰' },
                      { name: 'Material cartográfico', emoji: '🗺️' },
                      { name: 'Material gráfico', emoji: '🖼️' },
                      { name: 'Audio', emoji: '🔊' },
                      { name: 'Partituras', emoji: '🎼' },
                      { name: 'Video', emoji: '🎬' },
                      { name: 'Objetos', emoji: '🧩' },
                      { name: 'Manuscrito', emoji: '📜' }
                  ].map(tipo => (
                      <button
                        key={tipo.name}
                        onClick={() => handleSelectMaterial(tipo.name)}
                        className="p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md hover:bg-blue-50/5/20 transition flex flex-col items-center justify-center gap-3 group"
                      >
                          <span className="text-3xl filter grayscale group-hover:grayscale-0 transition duration-150">
                              {tipo.emoji}
                          </span>
                          <span className="font-semibold text-sm text-gray-750 group-hover:text-blue-600 transition truncate w-full">{tipo.name}</span>
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* VISTA: FORMULARIO DE CARGA */}
      {view === 'form' && (
        <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                  <h3 className="text-xl font-bold text-gray-800 tracking-tight">
                      {editingId ? `Editar registro: ${tipoMaterial}` : `Hoja de Carga: ${tipoMaterial}`}
                  </h3>
              </div>

              {formError && (
                  <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded font-medium">
                      {formError}
                  </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Selector de Tipo de Material */}
                <div className="p-4 bg-blue-50/40 rounded-lg border border-blue-200/50 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div>
                        <label className="block text-sm font-bold text-blue-900 font-sans">Tipo de material</label>
                        <p className="text-xs text-blue-700 font-sans">Puede cambiar el tipo de material para habilitar campos específicos.</p>
                    </div>
                    <select 
                        className="border border-gray-300 p-2 rounded-lg bg-white font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-sky-200 w-full sm:w-64 text-sm"
                        value={tipoMaterial}
                        onChange={e => setTipoMaterial(e.target.value)}
                    >
                        <option value="Libro">📕 Libro</option>
                        <option value="Publicación seriada">📰 Publicación seriada</option>
                        <option value="Material cartográfico">🗺️ Material cartográfico</option>
                        <option value="Material gráfico">🖼️ Material gráfico</option>
                        <option value="Audio">🔊 Audio</option>
                        <option value="Partituras">🎼 Partituras</option>
                        <option value="Video">🎬 Video</option>
                        <option value="Objetos">🧩 Objetos</option>
                        <option value="Manuscrito">📜 Manuscrito</option>
                    </select>
                </div>
                
                {/* Contenedor Unificado de Secciones de Carga */}
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200 overflow-hidden">
                    {/* 1. Títulos */}
                    <div className="space-y-3 p-4">
                        <h4 className="text-base font-bold text-sky-900 uppercase">Títulos</h4>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Título *</label>
                            <input required type="text" className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" 
                                value={titulo} onChange={e => setTitulo(e.target.value)} />
                        </div>
                        {tipoMaterial === 'Publicación seriada' && (
                            <div className="bg-teal-50 p-2.5 rounded border border-teal-100/60">
                                <label className="block text-sm font-medium text-teal-900">Título clave</label>
                                <input type="text" className="block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-teal-200 focus:outline-none" 
                                    value={tituloClave} onChange={e => setTituloClave(e.target.value)} placeholder="Ej: Revista de la Escuela de Educación" />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Variante del título</label>
                            <input type="text" className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" 
                                value={varianteTitulo} onChange={e => setVarianteTitulo(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Título uniforme</label>
                            <input type="text" className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" 
                                value={tituloUniforme} onChange={e => setTituloUniforme(e.target.value)} />
                        </div>
                    </div>

                    {/* 2. Responsabilidades */}
                    <div className="space-y-3 p-4">
                        <h4 className="text-base font-bold text-sky-900 uppercase">Responsabilidad</h4>
                        <datalist id="authorities-list">
                            {authorities.map((auth, i) => <option key={i} value={auth} />)}
                        </datalist>
                        
                        {/* Principal */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                            <div className="md:col-span-1">
                                <label className="block text-xs font-medium text-gray-500">Principal Tipo</label>
                                <select 
                                    className="w-full border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none"
                                    value={respPrincipal.tipo}
                                    onChange={e => setRespPrincipal({...respPrincipal, tipo: e.target.value as TipoResponsabilidad})}
                                >
                                    <option value="AUTOR">Autor</option>
                                    <option value="CORPORATIVA">Entidad Corporativa</option>
                                    <option value="GEOGRAFICA">Entidad Geográfica</option>
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-medium text-gray-500">Nombre (Apellido, Nombre)</label>
                                <input type="text" list="authorities-list" className="w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" 
                                    value={respPrincipal.nombre} onChange={e => setRespPrincipal({...respPrincipal, nombre: e.target.value})} 
                                    placeholder="Ej: Borges, Jorge Luis, 1899-1986"
                                />
                            </div>
                        </div>

                        {/* Secundarias */}
                        {respSecundarias.map((resp, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_2.5fr_auto] gap-2 items-center">
                                <div className="w-full">
                                    <select 
                                        className="w-full border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none"
                                        value={resp.tipo}
                                        onChange={e => updateRespSecundaria(idx, 'tipo', e.target.value)}
                                    >
                                        <option value="AUTOR">Autor</option>
                                        <option value="CORPORATIVA">Entidad Corporativa</option>
                                        <option value="GEOGRAFICA">Entidad Geográfica</option>
                                    </select>
                                </div>
                                <div className="w-full">
                                    <input type="text" list="authorities-list" className="w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" 
                                        value={resp.nombre} onChange={e => updateRespSecundaria(idx, 'nombre', e.target.value)} 
                                        placeholder="Colaborador, Traductor, etc."
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => removeRespSecundaria(idx)} 
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition duration-150 flex items-center justify-center shrink-0 w-9 h-9"
                                    title="Eliminar responsabilidad"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={addRespSecundaria} className="text-sm text-sky-600 mt-2 font-normal">+ Añadir Responsabilidad Secundaria</button>
                    </div>

                    {/* 3. Edición */}
                    <div className="p-4">
                         <label className="block text-base font-bold text-sky-900 uppercase tracking-wider">Edición</label>
                        <input type="text" className="mt-1 w-full border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" value={edicion} onChange={e => setEdicion(e.target.value)} placeholder="Ej: 2a ed." />
                    </div>

                    {/* Hojas de Carga condicionales según tipo de material (RCAA2) */}
                    {tipoMaterial === 'Publicación seriada' && (
                        <div className="p-4 bg-teal-50 space-y-3">
                            <h4 className="text-base font-bold text-teal-800 uppercase font-sans">Campos Específicos: Publicación Seriada</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-teal-900">Volumen / Número / Designación cronológica</label>
                                    <input type="text" className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-teal-200 focus:outline-none" 
                                        value={volumenNumero} onChange={e => setVolumenNumero(e.target.value)} placeholder="Ej: Vol. 5, Nro. 2 (Enero 2024)" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-teal-900">Existencias (ejemplares físicos)</label>
                                    <input type="text" className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-teal-200 focus:outline-none font-mono" 
                                        value={existencias} onChange={e => setExistencias(e.target.value)} placeholder="Ej: v. 1-15 (2010-2024); v. 16, n. 1-3 (2025)" />
                                </div>
                            </div>
                        </div>
                    )}

                    {tipoMaterial === 'Material cartográfico' && (
                        <div className="p-4 bg-orange-50 space-y-3">
                            <h4 className="text-base font-bold text-orange-800 uppercase font-sans">Campos Específicos: Material Cartográfico</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-orange-900">Escala de mapa o atlas</label>
                                    <input type="text" className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-orange-200 focus:outline-none" 
                                        value={escala} onChange={e => setEscala(e.target.value)} placeholder="Ej: Escala 1:50.000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-orange-900">Proyección cartográfica</label>
                                    <input type="text" className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-orange-200 focus:outline-none" 
                                        value={proyeccion} onChange={e => setProyeccion(e.target.value)} placeholder="Ej: Proyección Mercator" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-orange-900">Coordenadas geográficas</label>
                                    <input type="text" className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" 
                                        value={coordenadas} onChange={e => setCoordenadas(e.target.value)} placeholder="Ej: W 72°30'--W 71°40'/S 33°" />
                                </div>
                            </div>
                        </div>
                    )}

                    {tipoMaterial === 'Partituras' && (
                        <div className="p-4 bg-emerald-50 space-y-3">
                            <h4 className="text-base font-bold text-emerald-800 uppercase font-sans">Campos Específicos: Música Impresa (Partituras)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-emerald-900">Instrumentación o Voces</label>
                                    <input type="text" className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-emerald-200 focus:outline-none" 
                                        value={instrumentacion} onChange={e => setInstrumentacion(e.target.value)} placeholder="Ej: Piano solo, Orquesta de cuerdas, Coro SATB" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-emerald-900">Tonalidad / Clave / Op.</label>
                                    <input type="text" className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-emerald-200 focus:outline-none" 
                                        value={claveTono} onChange={e => setClaveTono(e.target.value)} placeholder="Ej: Op. 9 Nro. 2, Mi bemol mayor" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Publicación */}
                    {tipoMaterial === 'Manuscrito' ? (
                        <div className="p-4 space-y-3">
                            <h4 className="text-base font-bold text-sky-900 uppercase">Fecha(s) de elaboración o copia</h4>
                            <div>
                                <span className="text-xs text-gray-400 block mb-2">Año, rango de años o fecha exacta en la que se elaboró el manuscrito.</span>
                                <div className="space-y-2 max-w-md">
                                    {fechas.map((fec, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <input 
                                                type="text" 
                                                className="flex-1 w-full border border-gray-300 p-2 rounded bg-white focus:ring-2 focus:ring-sky-200 focus:outline-none transition text-sm" 
                                                value={fec} 
                                                onChange={e => updateFecha(idx, e.target.value)} 
                                                placeholder="Año o fecha del manuscrito"
                                            />
                                            {fechas.length > 1 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeFecha(idx)} 
                                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition duration-150 flex items-center justify-center shrink-0 w-9 h-9"
                                                    title="Eliminar fecha"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    type="button" 
                                    onClick={addFecha} 
                                    className="text-sm text-sky-600 mt-2 font-normal block text-left"
                                >
                                    + Añadir Fecha
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            <h4 className="text-base font-bold text-sky-900 uppercase">Publicación</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Lugar */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Lugar</label>
                                    <div className="space-y-2 mt-1">
                                        {lugares.map((lug, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input 
                                                    type="text" 
                                                    className="flex-1 w-full border border-gray-300 p-2 rounded bg-white focus:ring-2 focus:ring-sky-200 focus:outline-none transition text-sm" 
                                                    value={lug} 
                                                    onChange={e => updateLugar(idx, e.target.value)} 
                                                    placeholder="Lugar de publicación"
                                                />
                                                {lugares.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeLugar(idx)} 
                                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition duration-150 flex items-center justify-center shrink-0 w-9 h-9"
                                                        title="Eliminar lugar"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={addLugar} 
                                        className="text-sm text-sky-600 mt-2 font-normal"
                                    >
                                        + Añadir Lugar
                                    </button>
                                </div>

                                {/* Editor */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Editor</label>
                                    <div className="space-y-2 mt-1">
                                        {editores.map((ed, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input 
                                                    type="text" 
                                                    className="flex-1 w-full border border-gray-300 p-2 rounded bg-white focus:ring-2 focus:ring-sky-200 focus:outline-none transition text-sm" 
                                                    value={ed} 
                                                    onChange={e => updateEditor(idx, e.target.value)} 
                                                    placeholder="Editor, editorial o imprenta"
                                                />
                                                {editores.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeEditor(idx)} 
                                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition duration-150 flex items-center justify-center shrink-0 w-9 h-9"
                                                        title="Eliminar editor"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={addEditor} 
                                        className="text-sm text-sky-600 mt-2 font-normal"
                                    >
                                        + Añadir Editor
                                    </button>
                                </div>

                                {/* Fecha */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Fecha(s)</label>
                                    <div className="space-y-2 mt-1">
                                        {fechas.map((fec, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input 
                                                    type="text" 
                                                    className="flex-1 w-full border border-gray-300 p-2 rounded bg-white focus:ring-2 focus:ring-sky-200 focus:outline-none transition text-sm" 
                                                    value={fec} 
                                                    onChange={e => updateFecha(idx, e.target.value)} 
                                                    placeholder="Año o fecha"
                                                />
                                                {fechas.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeFecha(idx)} 
                                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition duration-150 flex items-center justify-center shrink-0 w-9 h-9"
                                                        title="Eliminar fecha"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={addFecha} 
                                        className="text-sm text-sky-600 mt-2 font-normal"
                                    >
                                        + Añadir Fecha
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. Detalles Físicos */}
                    {(() => {
                        const dfConfig = DESCRIPCION_FISICA_CONFS[tipoMaterial] || DESCRIPCION_FISICA_CONFS['Libro'];
                        return (
                            <div className="p-4">
                                <h4 className="text-base font-bold text-sky-900 uppercase mb-2">Descripción Física</h4>
                                <div className={`grid grid-cols-1 ${tipoMaterial === 'Manuscrito' ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4`}>
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700">Extensión</label>
                                        <input type="text" className="mt-1 w-full border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" value={extension} onChange={e => setExtension(e.target.value)} placeholder={dfConfig.extensionPlaceholder} />
                                        <span className="text-[10px] text-gray-400">{dfConfig.extensionSubtext}</span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Otros detalles físicos</label>
                                        <input type="text" className="mt-1 w-full border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" value={otrosDetallesFisicos} onChange={e => setOtrosDetallesFisicos(e.target.value)} placeholder={dfConfig.ilustracionesPlaceholder} />
                                        <span className="text-[10px] text-gray-400">{dfConfig.ilustracionesSubtext}</span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Dimensiones</label>
                                        <input type="text" className="mt-1 w-full border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" value={dimensiones} onChange={e => setDimensiones(e.target.value)} placeholder={dfConfig.dimensionesPlaceholder} />
                                        <span className="text-[10px] text-gray-400">{dfConfig.dimensionesSubtext}</span>
                                    </div>
                                    {tipoMaterial !== 'Manuscrito' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Mat. complementario</label>
                                            <input type="text" className="mt-1 w-full border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" value={materialComplementario} onChange={e => setMaterialComplementario(e.target.value)} placeholder={dfConfig.materialCompPlaceholder} />
                                            <span className="text-[10px] text-gray-400">{dfConfig.materialCompSubtext}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* 6. Serie / Colección */}
                    {tipoMaterial !== 'Manuscrito' && (
                        <div className="p-4 bg-pink-50">
                            <label className="block text-base font-bold text-pink-900 uppercase">Serie / Colección</label>
                            {coleccion.map((col, idx) => (
                                <div key={idx} className="flex gap-2 items-center mt-2">
                                    <input 
                                        type="text" 
                                        className="flex-1 border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-pink-200 focus:outline-none" 
                                        value={col} 
                                        onChange={e => updateColeccion(idx, e.target.value)} 
                                        placeholder="Ej: Espacios y sociedades" 
                                    />
                                    {coleccion.length > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={() => removeColeccion(idx)} 
                                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition duration-150 flex items-center justify-center shrink-0 w-9 h-9"
                                            title="Eliminar serie"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button 
                                type="button" 
                                onClick={addColeccion} 
                                className="text-sm text-sky-600 mt-2 font-normal"
                            >
                                + Añadir Serie
                            </button>
                        </div>
                    )}

                    {/* 7. Notas */}
                    <div className="p-4">
                         <label className="block text-base font-bold text-sky-900 uppercase">Notas</label>
                         {notas.map((nota, idx) => (
                             <div key={idx} className="flex gap-2 items-center mt-2">
                                 <input type="text" className="flex-1 border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" value={nota} onChange={e => updateNota(idx, e.target.value)} placeholder="Nota general..." />
                                 {notas.length > 1 && (
                                     <button 
                                         type="button" 
                                         onClick={() => removeNota(idx)} 
                                         className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition duration-150 flex items-center justify-center shrink-0 w-9 h-9"
                                         title="Eliminar nota"
                                     >
                                         ✕
                                     </button>
                                 )}
                             </div>
                         ))}
                         <button type="button" onClick={addNota} className="text-sm text-sky-600 mt-2 font-normal">+ Añadir Nota</button>
                    </div>

                    {tipoMaterial === 'Manuscrito' && (
                        <div className="p-4 bg-purple-50 space-y-1">
                            <label className="block text-base font-bold text-purple-900 uppercase ">Tesis / Trabajo de investigación</label>
                            <input type="text" className="block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-purple-200 focus:outline-none" 
                                value={tesis} onChange={e => setTesis(e.target.value)} placeholder="Ej: Tesis de grado de Licenciatura en Historia..." />
                        </div>
                    )}

                    {tipoMaterial === 'Publicación seriada' && (
                        <div className="p-4 bg-teal-50 space-y-1">
                            <label className="block text-base font-bold text-teal-900 uppercase">Frecuencia de publicación</label>
                            <input type="text" className="block w-full border border-gray-300 rounded p-2 bg-white text-sm focus:ring-2 focus:ring-teal-200 focus:outline-none" 
                                value={frecuencia} onChange={e => setFrecuencia(e.target.value)} placeholder="Ej: Mensual, Bimestral, Anual" />
                        </div>
                    )}

                    {/* 7.5. Contenido */}
                    <div className="p-4 bg-amber-50">
                         <label className="block text-base font-bold text-amber-900 uppercase">Contenido</label>
                         {contenido.map((item, idx) => (
                             <div key={idx} className="flex gap-2 items-center mt-2">
                                 <input type="text" className="flex-1 border border-gray-300 p-2 rounded bg-white text-sm text-gray-900 focus:ring-2 focus:ring-amber-200 focus:outline-none" value={item} onChange={e => updateContenido(idx, e.target.value)} placeholder="Ej: Título de obra o parte..." />
                                 {contenido.length > 1 && (
                                     <button 
                                         type="button" 
                                         onClick={() => removeContenido(idx)} 
                                         className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition duration-150 flex items-center justify-center shrink-0 w-9 h-9"
                                         title="Eliminar contenido"
                                     >
                                         ✕
                                     </button>
                                 )}
                             </div>
                         ))}
                         <button type="button" onClick={addContenido} className="text-sm text-sky-600 mt-2 font-normal">+ Añadir Contenido</button>
                    </div>

                    {/* 8. NÚMERO NORMALIZADO */}
                    {tipoMaterial !== 'Material gráfico' && tipoMaterial !== 'Manuscrito' && (
                        <div className="p-4">
                             <label className="block text-base font-bold text-sky-900 uppercase mb-1">Número Normalizado</label>
                             {numerosNormalizados.map((num, idx) => (
                                 <div key={idx} className="flex gap-2 items-center mt-2">
                                     <input type="text" className="flex-1 border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" value={num} onChange={e => updateNumeroNormalizado(idx, e.target.value)} placeholder="Número de identificación internacional para libros (ISBN) o publicaciones seriadas (ISSN)" />
                                     {numerosNormalizados.length > 1 && (
                                         <button 
                                             type="button" 
                                             onClick={() => removeNumeroNormalizado(idx)} 
                                             className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition duration-150 flex items-center justify-center shrink-0 w-9 h-9"
                                             title="Eliminar número normalizado"
                                         >
                                             ✕
                                         </button>
                                     )}
                                 </div>
                             ))}
                             <button type="button" onClick={addNumeroNormalizado} className="text-sm text-sky-600 mt-2 font-normal">+ Añadir Número Normalizado</button>
                        </div>
                    )}

                    {/* 8.5. ENLACE A RECURSO ELECTRÓNICO */}
                    <div className="p-4 space-y-1">
                         <label className="block text-base font-bold text-sky-900 uppercase">Recurso Electrónico (Link / URL)</label>
                         <input 
                             type="text" 
                             className="block w-full border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" 
                             value={urlRecurso} 
                             onChange={e => setUrlRecurso(e.target.value)} 
                             placeholder="Ej: https://biblioteca.org/recurso.pdf" 
                         />
                    </div>

                    {/* 9. Indización */}
                    <div className="p-4 bg-blue-50">
                         <h4 className="text-base font-bold text-blue-800 uppercase mb-2">Descriptores de Materia (Indización)</h4>
                         <datalist id="terms-list">
                             {availableTerms.map((t, i) => <option key={i} value={t} />)}
                         </datalist>
                         {temas.map((tema, idx) => (
                             <div key={idx} className="flex gap-2 items-center mt-2">
                                 <input 
                                    type="text" 
                                    list="terms-list"
                                    className="flex-1 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-sky-200 focus:outline-none bg-white text-sm" 
                                    value={tema} 
                                    onChange={e => updateTema(idx, e.target.value.toUpperCase())} 
                                    placeholder="Buscar o ingresar término..." 
                                 />
                                 {temas.length > 1 && (
                                     <button 
                                         type="button" 
                                         onClick={() => removeTema(idx)} 
                                         className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition duration-150 flex items-center justify-center shrink-0 w-9 h-9"
                                         title="Eliminar descriptor"
                                     >
                                         ✕
                                     </button>
                                 )}
                             </div>
                         ))}
                         <button type="button" onClick={addTema} className="text-sm text-sky-600 mt-2 font-normal">+ Añadir Descriptor</button>
                    </div>
                </div>

                {/* Pie: Inventarios y Ubicación */}
                <div className="border-t-4 border-gray-200 pt-6 mt-6">
                    <div className="w-full">
                         <label className="block text-xl font-bold text-gray-800 mb-2">Inventario(s) y Clasificación</label>
                         <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
                             {/* Encabezados - Solo para pantallas de escritorio (sm o superiores) */}
                             <div className="hidden sm:grid sm:grid-cols-[1.5fr_1.5fr_1.5fr_44px] gap-4 mb-2 pb-2 border-b border-gray-200 px-2">
                                 <span className="text-xs font-bold text-gray-500 uppercase">Nro Inventario *</span>
                                 <span className="text-xs font-bold text-gray-500 uppercase">Ubicación</span>
                                 <span className="text-xs font-bold text-gray-500 uppercase">Estado</span>
                                 <span className="text-xs font-bold text-gray-500 uppercase text-center"></span>
                             </div>

                             <div className="space-y-3 sm:space-y-1">
                                {(() => {
                                    const rawInvs = inventarios.map(i => i.inventario.trim().toLowerCase());
                                    return inventarios.map((invObj, idx) => {
                                        const cleanInv = invObj.inventario.trim().toLowerCase();
                                        const isDup = cleanInv !== '' && rawInvs.filter(x => x === cleanInv).length > 1;
                                        return (
                                            <div key={idx} className="flex flex-col sm:grid sm:grid-cols-[1.5fr_1.5fr_1.5fr_44px] gap-2 pb-3 sm:pb-0 border-b border-gray-200 last:border-0 last:pb-0 sm:border-0 items-start sm:items-center sm:hover:bg-gray-100/50 sm:p-1.5 rounded-lg transition-colors">
                                                <div className="w-full">
                                                    <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">Nro Inventario *</label>
                                                    <input 
                                                        required 
                                                        type="text" 
                                                        className={`w-full border p-2 rounded text-sm focus:ring-2 focus:outline-none transition ${isDup ? 'border-red-500 bg-red-50 focus:ring-red-200 text-red-900 font-medium' : 'border-gray-300 bg-white focus:ring-sky-200'}`} 
                                                        value={invObj.inventario} 
                                                        onChange={e => updateInventario(idx, 'inventario', e.target.value)} 
                                                        placeholder="Código / Nro Inventario" 
                                                    />
                                                </div>
                                                <div className="w-full">
                                                    <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">Ubicación</label>
                                                    <input type="text" className="w-full border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none" 
                                                        value={invObj.ubicacion} onChange={e => updateInventario(idx, 'ubicacion', e.target.value)} 
                                                        placeholder="Ej: 863 B732f" />
                                                </div>
                                                <div className="w-full">
                                                    <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">Estado</label>
                                                    <select 
                                                        disabled={invObj.estado === EstadoRecurso.PRESTADO} 
                                                        className="w-full border border-gray-300 p-2 rounded bg-white text-sm focus:ring-2 focus:ring-sky-200 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                                        value={invObj.estado || EstadoRecurso.DISPONIBLE} 
                                                        onChange={e => updateInventario(idx, 'estado', e.target.value)}
                                                    >
                                                        <option value={EstadoRecurso.DISPONIBLE}>Disponible</option>
                                                        <option value={EstadoRecurso.SALA}>Consulta en sala</option>
                                                        <option value={EstadoRecurso.NO_DISPONIBLE}>No disponible</option>
                                                        <option value={EstadoRecurso.PERDIDO}>Perdido</option>
                                                        {invObj.estado === EstadoRecurso.PRESTADO && (
                                                            <option value={EstadoRecurso.PRESTADO}>Prestado</option>
                                                        )}
                                                    </select>
                                                </div>
                                                <div className="w-full flex justify-end sm:justify-center">
                                                    {inventarios.length > 1 ? (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeInventario(idx)} 
                                                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition duration-150 flex items-center justify-center shrink-0 w-9 h-9"
                                                            title="Eliminar ejemplar"
                                                        >
                                                            ✕
                                                        </button>
                                                    ) : (
                                                        <div className="w-9 h-9 sm:block hidden"></div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                             </div>

                             <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap justify-between items-center gap-3">
                                 <div className="flex flex-wrap items-center gap-4">
                                     <button 
                                         type="button" 
                                         onClick={addInventario} 
                                         className="text-sm text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1 transition duration-150"
                                     >
                                         <span>➕</span> Añadir ejemplar
                                     </button>
                                     <button 
                                         type="button" 
                                         onClick={addInventarioConsecutivo} 
                                         className="text-sm text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1 transition duration-150"
                                         title="Añadir un ejemplar con número de inventario consecutivo al anterior"
                                     >
                                         <span>➕</span> Añadir consecutivo
                                     </button>
                                 </div>
                                 <span className="text-xs text-gray-500 font-medium">Total: {inventarios.length} {inventarios.length === 1 ? 'ejemplar' : 'ejemplares'}</span>
                             </div>
                         </div>
                    </div>
                </div>

                <div className="pt-6 flex flex-wrap justify-end items-center gap-3">
                    <button 
                        type="button" 
                        onClick={() => { setView('list'); resetForm(); }} 
                        className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium transition"
                    >
                        Cancelar
                    </button>
                    {editingId && (
                        <button 
                            type="button" 
                            onClick={() => setIsDuplicateModalOpen(true)}
                            className="px-5 py-2.5 bg-amber-100 text-amber-900 rounded hover:bg-amber-200 font-medium transition flex items-center gap-2"
                        >
                            Duplicar registro
                        </button>
                    )}
                    <button 
                        type="submit" 
                        className="px-6 py-2.5 bg-green-600 text-white rounded hover:bg-green-700 font-medium transition shadow-sm"
                    >
                        {editingId ? 'Actualizar registro' : 'Guardar registro'}
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* MODAL: CONFIRMAR DUPLICACIÓN DE REGISTRO */}
      {isDuplicateModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
                  <div className="p-6">
                      <div className="flex items-center gap-3 text-amber-600 mb-3">
                          <span className="text-2xl">📋</span>
                          <h3 className="text-xl font-bold text-gray-800 font-sans">Duplicar registro</h3>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                          Se creará un nuevo registro en el catálogo conservando toda la información bibliográfica actual, excepto los datos de inventario y clasificación / ubicación.
                      </p>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2">
                      <button
                          type="button"
                          onClick={() => {
                              setIsDuplicateModalOpen(false);
                              handleDuplicate();
                          }}
                          className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-sm focus:outline-none transition-colors"
                      >
                          Confirmar
                      </button>
                      <button
                          type="button"
                          onClick={() => setIsDuplicateModalOpen(false)}
                          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded shadow-sm focus:outline-none transition-colors"
                      >
                          Cancelar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
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

      {/* MODAL: ALERTA */}
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
                          onClick={() => setAlertModal({ isOpen: false, title: '', message: '' })}
                          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm focus:outline-none transition-colors"
                      >
                          Aceptar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: EDITAR TÉRMINO DE INDIZACIÓN */}
      {editTermModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
                  <div className="p-6">
                      <div className="flex items-center gap-3 text-blue-600 mb-4">
                          <span className="text-2xl">🏷️</span>
                          <h3 className="text-xl font-bold text-gray-800 font-sans">Editar término de indización</h3>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                          Modifique el descriptor. Este cambio se impactará automáticamente en todos los registros bibliográficos del catálogo que utilicen este término.
                      </p>
                      
                      <div className="space-y-1">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Término actual</span>
                          <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-700 font-mono">
                              {editTermModal.oldTerm}
                          </div>
                      </div>

                      <div className="space-y-1.5 mt-4">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Nuevo término / descriptor</label>
                          <input 
                              type="text" 
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-200 focus:outline-none text-sm font-medium"
                              value={editTermModal.newTerm}
                              onChange={e => setEditTermModal(prev => ({ ...prev, newTerm: e.target.value.toUpperCase() }))}
                              placeholder="Ej: HISTORIA ARGENTINA"
                          />
                      </div>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2">
                      <button
                          type="button"
                          onClick={handleSaveEditTerm}
                          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none transition-colors"
                      >
                          Guardar Cambios
                      </button>
                      <button
                          type="button"
                          onClick={() => setEditTermModal({ isOpen: false, oldTerm: '', newTerm: '' })}
                          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm focus:outline-none transition-colors"
                      >
                          Cancelar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: EDITAR AUTORIDAD */}
      {editAuthorityModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
                  <div className="p-6">
                      <div className="flex items-center gap-3 text-blue-600 mb-4">
                          <span className="text-2xl">👤</span>
                          <h3 className="text-xl font-bold text-gray-800 font-sans">Editar autoridad</h3>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                          Modifique el nombre de la autoridad. Este cambio se impactará automáticamente en todos los registros bibliográficos del catálogo que utilicen esta autoridad.
                      </p>
                      
                      <div className="space-y-1">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Nombre actual</span>
                          <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-700 font-mono">
                              {editAuthorityModal.oldAuthority}
                          </div>
                      </div>

                      <div className="space-y-1.5 mt-4">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Nuevo nombre de autoridad</label>
                          <input 
                              type="text" 
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-200 focus:outline-none text-sm font-medium"
                              value={editAuthorityModal.newAuthority}
                              onChange={e => setEditAuthorityModal(prev => ({ ...prev, newAuthority: e.target.value }))}
                              placeholder="Ej: Borges, Jorge Luis"
                          />
                      </div>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2">
                      <button
                          type="button"
                          onClick={handleSaveEditAuthority}
                          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none transition-colors"
                      >
                          Guardar Cambios
                      </button>
                      <button
                          type="button"
                          onClick={() => setEditAuthorityModal({ isOpen: false, oldAuthority: '', newAuthority: '' })}
                          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm focus:outline-none transition-colors"
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

export default Catalog;