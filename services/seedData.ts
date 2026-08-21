import { Recurso, Usuario, Prestamo, EstadoRecurso, EstadoPrestamo, RolUsuario } from '../types';

export const CURRENT_SEED_VERSION = 'v16';

export const RECURSOS_SEMILLA: Recurso[] = [
  {
    id: 1,
    tipo_material: 'Material cartográfico',
    titulo: 'República Argentina : mapa político escolar',
    responsabilidad_principal: { tipo: 'CORPORATIVA', nombre: 'Argentina. Instituto Geográfico Nacional' },
    responsabilidad_secundaria: [],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['IGN'],
    fecha: ['2022'],
    edicion: 'Edición actualizada',
    extension: '1 mapa',
    otros_detalles_fisicos: 'col.',
    dimensiones: '100 x 70 cm en hoja de 110 x 75 cm',
    escala: 'Escala 1:2.500.000',
    proyeccion: 'Proyección conforme de Gauss',
    coleccion: ['Mapas Escolares Oficiales'],
    notas: ['Cartografía adaptada para uso escolar oficial.'],
    temas: ['ARGENTINA - MAPAS POLÍTICOS', 'MATERIAL CARTOGRÁFICO', 'GEOGRAFÍA - ARGENTINA - ENSEÑANZA'],
    ejemplares: [
      { inventario: '0001', estado: EstadoRecurso.DISPONIBLE, ubicacion: 'Mapoteca' }
    ]
  },
  {
    id: 2,
    tipo_material: 'Libro',
    titulo: 'Formación Ética y Ciudadana 1 : los derechos, la ley y la democracia',
    responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Schujman, Gustavo' },
    responsabilidad_secundaria: [{ tipo: 'AUTOR', nombre: 'Finocchio, Silvia' }],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['Aique'],
    fecha: ['2007'],
    edicion: '1a ed.',
    extension: '144 p.',
    otros_detalles_fisicos: 'il. col.',
    dimensiones: '26 cm',
    coleccion: ['Secundaria Viva'],
    numero_normalizado: ['978-950-701-945-6'],
    notas: ['Texto escolar para educación secundaria.'],
    temas: ['FORMACIÓN CÍVICA', 'DERECHOS HUMANOS', 'DEMOCRACIA', 'ÉTICA - TEXTOS ESCOLARES'],
    ejemplares: [
      { inventario: '0002', estado: EstadoRecurso.DISPONIBLE, ubicacion: '373 Sch385' },
      { inventario: '0003', estado: EstadoRecurso.PRESTADO, ubicacion: '373 Sch385' },
      { inventario: '0004', estado: EstadoRecurso.DISPONIBLE, ubicacion: '373 Sch385' }
    ]
  },
  {
    id: 3,
    tipo_material: 'Objetos',
    titulo: 'Torso humano: modelo anatómico desmontable de 23 partes',
    responsabilidad_principal: { tipo: 'CORPORATIVA', nombre: 'Erler-Zimmer' },
    responsabilidad_secundaria: [],
    lugar_publicacion: ['Lauf (Alemania)'],
    editor: ['Erler-Zimmer'],
    fecha: ['2015'],
    edicion: 'Modelo educativo estándar',
    extension: '1 modelo anatómico (23 piezas desmontables)',
    otros_detalles_fisicos: 'plástico (PVC), pintado a mano, col.',
    dimensiones: '85 x 33 x 24 cm',
    material_complementario: '1 guía didáctica de referencia (12 p.)',
    coleccion: ['Instrumental de Laboratorio Biológico Erler'],
    notas: ['Montado sobre base plástica. Diseñado para demostración anatómica en el aula.'],
    temas: ['ANATOMÍA HUMANA - MODELOS', 'TORSO HUMANO', 'MATERIAL DIDÁCTICO', 'BIOLOGÍA - ENSEÑANZA'],
    ejemplares: [
      { inventario: '0005', estado: EstadoRecurso.DISPONIBLE, ubicacion: 'Laboratorio - Biología' }
    ]
  },
  {
    id: 4,
    tipo_material: 'Libro',
    titulo: 'Ciencias Naturales 8 : la materia, la energía y la vida',
    responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Barderi, María Gabriela' },
    responsabilidad_secundaria: [
      { tipo: 'AUTOR', nombre: 'Cuniglio, Francisco' },
      { tipo: 'AUTOR', nombre: 'Fernández, Eduardo' }
    ],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['Santillana'],
    fecha: ['2004'],
    edicion: '1ª ed., 3ª reimp.',
    extension: '312 p.',
    otros_detalles_fisicos: 'il. col., esquemas',
    dimensiones: '28 x 22 cm',
    coleccion: ['Santillana Polimodal'],
    numero_normalizado: ['978-950-46-1383-1'],
    notas: ['Incluye índice temático y actividades prácticas al final de cada capítulo.'],
    temas: ['CIENCIAS NATURALES - TEXTOS ESCOLARES', 'QUÍMICA ELEMENTAL', 'FÍSICA ELEMENTAL', 'ENSEÑANZA GENERAL BÁSICA'],
    ejemplares: [
      { inventario: '0006', estado: EstadoRecurso.DISPONIBLE, ubicacion: '500 B245' },
      { inventario: '0007', estado: EstadoRecurso.DISPONIBLE, ubicacion: '500 B245' },
      { inventario: '0008', estado: EstadoRecurso.PRESTADO, ubicacion: '500 B245' },
      { inventario: '0009', estado: EstadoRecurso.SALA, ubicacion: '500 B245' }
    ]
  },
  {
    id: 5,
    tipo_material: 'Video',
    titulo: 'La historia oficial',
    responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Puenzo, Luis' },
    responsabilidad_secundaria: [
      { tipo: 'AUTOR', nombre: 'Aída Bortnik' },
      { tipo: 'AUTOR', nombre: 'Aleandro, Norma' }
    ],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['AVH San Luis'],
    fecha: ['2006 (Película original de 1985)'],
    edicion: 'Edición especial restaurada en DVD',
    extension: '1 videodisco (DVD)',
    otros_detalles_fisicos: 'son., col., Dolby Digital 5.1',
    dimensiones: '12 cm',
    duracion: 'ca. 112 min',
    soporte_fisico: 'DVD',
    material_complementario: '1 folleto con sinopsis y contexto histórico (4 p.)',
    coleccion: ['Clásicos del Cine Argentino'],
    notas: ['Ganadora del Premio Oscar a la Mejor Película Extranjera en 1986.'],
    temas: ['CINE ARGENTINO', 'DICTADURA MILITAR - ARGENTINA - FICCIÓN', 'DERECHOS HUMANOS', 'HISTORIA ARGENTINA - ENSEÑANZA SECUNDARIA'],
    ejemplares: [
      { inventario: '0010', estado: EstadoRecurso.DISPONIBLE, ubicacion: 'Videoteca' },
      { inventario: '0011', estado: EstadoRecurso.DISPONIBLE, ubicacion: 'Videoteca' }
    ]
  },
  {
    id: 6,
    tipo_material: 'Objetos',
    titulo: 'Globo terráqueo físico y político iluminado dual',
    responsabilidad_principal: { tipo: 'CORPORATIVA', nombre: 'Replogle Globes' },
    responsabilidad_secundaria: [],
    lugar_publicacion: ['Madrid'],
    editor: ['Tecnodidáctica'],
    fecha: ['2018'],
    edicion: '3ª ed. cartográfica',
    extension: '1 globo terráqueo',
    otros_detalles_fisicos: 'plástico, col., iluminado (luz LED interna)',
    dimensiones: '30 cm de diámetro',
    escala: 'Escala 1:42.000.000',
    coleccion: ['Geografía Activa'],
    notas: ['Ref: 30-TEC2018. Cuenta con meridiano graduado y base de madera.'],
    temas: ['GLOBO TERRÁQUEO', 'MAPAS FÍSICOS', 'MAPAS POLÍTICOS', 'CIENCIAS SOCIALES - MATERIAL DIDÁCTICO'],
    ejemplares: [
      { inventario: '0012', estado: EstadoRecurso.DISPONIBLE, ubicacion: 'Mapoteca' }
    ]
  },
  {
    id: 7,
    tipo_material: 'Objetos',
    titulo: 'Laboratorio de química elemental : kit de experiencias científicas escolares',
    responsabilidad_principal: { tipo: 'CORPORATIVA', nombre: 'Ciencia para Todos' },
    responsabilidad_secundaria: [],
    lugar_publicacion: ['Santiago de Chile'],
    editor: ['Distribuidora Escolar'],
    fecha: ['2019'],
    edicion: 'Edición renovada de seguridad',
    extension: '1 caja de laboratorio',
    otros_detalles_fisicos: 'madera y plástico',
    dimensiones: '40 x 30 x 15 cm',
    material_complementario: '1 manual de experimentos (48 p.: il. col.)',
    coleccion: ['Pequeños Científicos'],
    notas: ['Registro de seguridad industrial: Nº J-58412. Contiene tubos de ensayo, mechero y reactivos no tóxicos.'],
    temas: ['QUÍMICA - EXPERIMENTOS', 'JUEGOS EDUCATIVOS', 'CIENCIAS NATURALES - ENSEÑANZA PRIMARIA', 'MATERIAL DE LABORATORIO'],
    ejemplares: [
      { inventario: '0013', estado: EstadoRecurso.DISPONIBLE, ubicacion: 'Laboratorio - Química' }
    ]
  },
  {
    id: 8,
    tipo_material: 'Libro',
    titulo: 'La fábrica de serenatas',
    responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Bodoc, Liliana' },
    responsabilidad_secundaria: [],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['Alfaguara'],
    fecha: ['2011'],
    edicion: '1ª ed.',
    extension: '88 p.',
    otros_detalles_fisicos: 'il. b/n',
    dimensiones: '20 cm',
    coleccion: ['Alfaguara Infantil. Serie Morada'],
    numero_normalizado: ['978-987-04-1807-8'],
    notas: ['Libro de narrativa infantil/juvenil con bellas ilustraciones en blanco y negro.'],
    temas: ['CUENTOS INFANTILES ARGENTINOS', 'LITERATURA JUVENIL', 'AMOR - FICCIÓN'],
    ejemplares: [
      { inventario: '0014', estado: EstadoRecurso.DISPONIBLE, ubicacion: '863 B668' },
      { inventario: '0015', estado: EstadoRecurso.PRESTADO, ubicacion: '863 B668' },
      { inventario: '0016', estado: EstadoRecurso.DISPONIBLE, ubicacion: '863 B668' }
    ]
  },
  {
    id: 9,
    tipo_material: 'Libro',
    titulo: 'Antología de cuentistas latinoamericanos',
    responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Bajarlía, Juan-Jacobo' },
    responsabilidad_secundaria: [],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['Colihue'],
    fecha: ['1983'],
    edicion: '1ª ed.',
    extension: '384 p.',
    otros_detalles_fisicos: '',
    dimensiones: '18 cm',
    coleccion: ['Leer y Crear ; 64'],
    numero_normalizado: ['978-950-581-064-2'],
    notas: ['Selección de los mejores cuentistas del siglo XX.'],
    temas: ['CUENTOS LATINOAMERICANOS', 'ANTOLOGÍAS LITERARIAS', 'SIGLO XX'],
    ejemplares: [
      { inventario: '0017', estado: EstadoRecurso.DISPONIBLE, ubicacion: '863.008 B165' },
      { inventario: '0018', estado: EstadoRecurso.DISPONIBLE, ubicacion: '863.008 B165' }
    ]
  },
  {
    id: 10,
    tipo_material: 'Libro',
    titulo: 'Filosofía : un espacio de pensamiento',
    responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Obiols, Guillermo A.' },
    responsabilidad_secundaria: [],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['AZ Editora'],
    fecha: ['2002'],
    edicion: '1ª ed., reimp.',
    extension: '240 p.',
    otros_detalles_fisicos: 'il. b/n',
    dimensiones: '24 cm',
    coleccion: ['Serie Plata'],
    numero_normalizado: ['978-950-534-738-4'],
    notas: ['Texto introductorio a la lógica, la ética y las grandes corrientes del pensamiento occidental.'],
    temas: ['FILOSOFÍA - TEXTOS ESCOLARES', 'ENSEÑANZA SECUNDARIA', 'LÓGICA', 'ÉTICA'],
    ejemplares: [
      { inventario: '0019', estado: EstadoRecurso.DISPONIBLE, ubicacion: '100 O12' },
      { inventario: '0020', estado: EstadoRecurso.SALA, ubicacion: '100 O12' },
      { inventario: '0021', estado: EstadoRecurso.DISPONIBLE, ubicacion: '100 O12' }
    ]
  },
  {
    id: 11,
    tipo_material: 'Libro',
    titulo: 'Biología 2 : los caminos de la evolución',
    responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Balbiano, Alejandro J.' },
    responsabilidad_secundaria: [
      { tipo: 'AUTOR', nombre: 'Franco, Ricardo' },
      { tipo: 'AUTOR', nombre: 'Godoy, Elina' }
    ],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['Santillana'],
    fecha: ['2018'],
    edicion: '1ª ed.',
    extension: '160 p.',
    otros_detalles_fisicos: 'il. col., fot.',
    dimensiones: '28 cm',
    coleccion: ['Vale Saber'],
    numero_normalizado: ['978-950-46-5729-3'],
    notas: ['Texto con enfoque interactivo alineado a los diseños curriculares vigentes.'],
    temas: ['BIOLOGÍA - TEXTOS ESCOLARES', 'EVOLUCIÓN BIOLÓGICA', 'CÉLULAS', 'ENSEÑANZA SECUNDARIA'],
    ejemplares: [
      { inventario: '0022', estado: EstadoRecurso.DISPONIBLE, ubicacion: '570 B171' },
      { inventario: '0023', estado: EstadoRecurso.DISPONIBLE, ubicacion: '570 B171' },
      { inventario: '0024', estado: EstadoRecurso.PRESTADO, ubicacion: '570 B171' },
      { inventario: '0025', estado: EstadoRecurso.DISPONIBLE, ubicacion: '570 B171' }
    ]
  },
  {
    id: 12,
    tipo_material: 'Libro',
    titulo: 'Contextos Digitales : Geografía de la Argentina',
    responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Arzeno, Mariana' },
    responsabilidad_secundaria: [
      { tipo: 'AUTOR', nombre: 'Castro, Hortensia' },
      { tipo: 'AUTOR', nombre: 'Minvielle, Sandra' }
    ],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['Kapelusz'],
    fecha: ['2014'],
    edicion: '1ª ed.',
    extension: '224 p.',
    otros_detalles_fisicos: 'il. col., mapas, diagramas',
    dimensiones: '27 cm',
    coleccion: ['Contextos Digitales Secundaria'],
    numero_normalizado: ['978-950-13-1144-1'],
    notas: ['Incluye código para acceso a contenidos multimedia interactivos.'],
    temas: ['GEOGRAFÍA - ARGENTINA', 'TEXTOS ESCOLARES', 'RECURSOS NATURALES', 'DEMOGRAFÍA'],
    ejemplares: [
      { inventario: '0026', estado: EstadoRecurso.DISPONIBLE, ubicacion: '918.2 A797' },
      { inventario: '0027', estado: EstadoRecurso.DISPONIBLE, ubicacion: '918.2 A797' }
    ]
  },
  {
    id: 13,
    tipo_material: 'Libro',
    titulo: 'Matemática 1',
    responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Berio, Adriana' },
    responsabilidad_secundaria: [
      { tipo: 'AUTOR', nombre: 'Burgos, María Elena' },
      { tipo: 'AUTOR', nombre: 'García, Marta' }
    ],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['Kapelusz'],
    fecha: ['2015'],
    edicion: '2ª ed. revisada',
    extension: '192 p. + 48 p. de anexo',
    otros_detalles_fisicos: 'il. col., gráficos',
    dimensiones: '27 cm',
    coleccion: ['Contextos Digitales Matemática'],
    numero_normalizado: ['978-950-13-2592-8'],
    notas: ['Incluye cuadernillo anexo de ejercitación práctica.'],
    temas: ['MATEMÁTICA - TEXTOS ESCOLARES', 'ÁLGEBRA', 'GEOMETRÍA', 'ENSEÑANZA SECUNDARIA'],
    ejemplares: [
      { inventario: '0028', estado: EstadoRecurso.DISPONIBLE, ubicacion: '510 B511' },
      { inventario: '0029', estado: EstadoRecurso.PRESTADO, ubicacion: '510 B511' },
      { inventario: '0030', estado: EstadoRecurso.DISPONIBLE, ubicacion: '510 B511' }
    ]
  },
  {
    id: 14,
    tipo_material: 'Libro',
    titulo: 'Lengua y Literatura 1 : las personas y las palabras',
    responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Delgado, Myriam' },
    responsabilidad_secundaria: [{ tipo: 'AUTOR', nombre: 'Centrón, Graciela' }],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['Puerto de Palos'],
    fecha: ['2012'],
    edicion: '1ª ed.',
    extension: '208 p.',
    otros_detalles_fisicos: 'il. col.',
    dimensiones: '28 cm',
    coleccion: ['Activados'],
    numero_normalizado: ['978-987-547-410-9'],
    notas: ['Enfoque integral que articula la lectura de clásicos con talleres de escritura.'],
    temas: ['LENGUA ESPAÑOLA - TEXTOS ESCOLARES', 'GRAMÁTICA', 'COMPRENSIÓN LECTORA', 'ANÁLISIS LITERARIO'],
    ejemplares: [
      { inventario: '0031', estado: EstadoRecurso.DISPONIBLE, ubicacion: '860 D352' },
      { inventario: '0032', estado: EstadoRecurso.DISPONIBLE, ubicacion: '860 D352' }
    ]
  },
  {
    id: 15,
    tipo_material: 'Libro',
    titulo: 'Historia : las sociedades de América y Europa entre los siglos XIV y XVIII',
    responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Caticha, Carolina' },
    responsabilidad_secundaria: [
      { tipo: 'AUTOR', nombre: 'González, Diana' },
      { tipo: 'AUTOR', nombre: 'Svarzman, José' }
    ],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['Estrada'],
    fecha: ['2010'],
    edicion: '1ª ed.',
    extension: '240 p.',
    otros_detalles_fisicos: 'il. col., mapas históricos',
    dimensiones: '28 cm',
    coleccion: ['Huellas'],
    numero_normalizado: ['978-950-01-1193-4'],
    notas: ['Excelente material cartográfico de apoyo histórico e ilustraciones de época.'],
    temas: ['HISTORIA MODERNA - TEXTOS ESCOLARES', 'AMÉRICA - COLONIZACIÓN', 'EUROPA - SIGLO XIV-XVIII'],
    ejemplares: [
      { inventario: '0033', estado: EstadoRecurso.DISPONIBLE, ubicacion: '909 C365' },
      { inventario: '0034', estado: EstadoRecurso.DISPONIBLE, ubicacion: '909 C365' },
      { inventario: '0035', estado: EstadoRecurso.PRESTADO, ubicacion: '909 C365' },
      { inventario: '0036', estado: EstadoRecurso.SALA, ubicacion: '909 C365' }
    ]
  },
  {
    id: 16,
    tipo_material: 'Publicación seriada',
    titulo: 'Cuadernos de Educación',
    responsabilidad_principal: { tipo: 'CORPORATIVA', nombre: 'Universidad de San Andrés. Departamento de Educación' },
    responsabilidad_secundaria: [],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['UdeSA Ediciones'],
    fecha: ['2023'],
    edicion: 'Año XV, N° 28',
    extension: '180 p.',
    otros_detalles_fisicos: 'gráficos, diagramas',
    dimensiones: '24 cm',
    frecuencia: 'Semestral',
    volumen_numero: 'N° 28 (Primer Semestre 2023)',
    coleccion: ['Investigación Educativa'],
    notas: ['Revista académica con referato.', 'Incluye artículos sobre política educativa y prácticas pedagógicas.'],
    temas: ['EDUCACIÓN - INVESTIGACIÓN', 'POLÍTICA EDUCATIVA', 'PRÁCTICA PEDAGÓGICA', 'PUBLICACIONES SERIADAS'],
    ejemplares: [
      { inventario: '0037', estado: EstadoRecurso.DISPONIBLE, ubicacion: 'Hemeroteca' },
      { inventario: '0038', estado: EstadoRecurso.DISPONIBLE, ubicacion: 'Hemeroteca' }
    ]
  },
  {
    id: 17,
    tipo_material: 'Publicación seriada',
    titulo: 'Itinerarios Educativos',
    responsabilidad_principal: { tipo: 'CORPORATIVA', nombre: 'Universidad Nacional del Litoral. Facultad de Humanidades y Ciencias' },
    responsabilidad_secundaria: [],
    lugar_publicacion: ['Santa Fe'],
    editor: ['Ediciones UNL'],
    fecha: ['2024'],
    edicion: 'Año XVIII, N° 19',
    extension: '210 p.',
    otros_detalles_fisicos: 'il.',
    dimensiones: '23 cm',
    frecuencia: 'Semestral',
    volumen_numero: 'N° 19 (Otoño-Invierno 2024)',
    coleccion: ['Itinerarios'],
    notas: ['Revista del Instituto de Ciencias de la Educación.', 'Temáticas centradas en didáctica de las ciencias y formación docente.'],
    temas: ['DIDÁCTICA', 'FORMACIÓN DOCENTE', 'CIENCIAS DE LA EDUCACIÓN', 'PUBLICACIONES SERIADAS'],
    ejemplares: [
      { inventario: '0039', estado: EstadoRecurso.DISPONIBLE, ubicacion: 'Hemeroteca' },
      { inventario: '0040', estado: EstadoRecurso.PRESTADO, ubicacion: 'Hemeroteca' }
    ]
  },
  {
    id: 18,
    tipo_material: 'Libro',
    titulo: 'Antología de cuentos fantásticos clásicos',
    responsabilidad_principal: { tipo: 'AUTOR', nombre: 'Bioy Casares, Adolfo' },
    responsabilidad_secundaria: [
      { tipo: 'AUTOR', nombre: 'Poe, Edgar Allan' }
    ],
    lugar_publicacion: ['Buenos Aires'],
    editor: ['Losada'],
    fecha: ['2021'],
    edicion: '1a ed.',
    extension: '284 p.',
    dimensiones: '22 cm',
    coleccion: ['Biblioteca de Clásicos Universales'],
    numero_normalizado: ['978-950-03-9821-3'],
    notas: ['Selección de relatos fundamentales de la narrativa fantástica del siglo XIX y XX.'],
    contenido: [
      'El corazón delator / Edgar Allan Poe',
      'La gallina degollada / Horacio Quiroga',
      'El horla / Guy de Maupassant',
      'La pata de mono / W. W. Jacobs',
      'La casa tomada / Julio Cortázar'
    ],
    temas: ['CUENTOS FANTÁSTICOS', 'LITERATURA UNIVERSAL', 'ANTOLOGÍAS'],
    ejemplares: [
      { inventario: '0041', estado: EstadoRecurso.DISPONIBLE, ubicacion: '863 C965' },
      { inventario: '0042', estado: EstadoRecurso.DISPONIBLE, ubicacion: '863 C965' },
      { inventario: '0043', estado: EstadoRecurso.DISPONIBLE, ubicacion: '863 C965' }
    ]
  }
];

export const USUARIOS_SEMILLA: Usuario[] = [
  { id: 1, nombre: 'Sofía', apellido: 'Martínez', dni: '99418305', fecha_nacimiento: '1987-05-15', rol: RolUsuario.DOCENTE, activo: true, telefono: '2644123456', email: 'sofia_martinez77@mail.com' },
  { id: 2, nombre: 'Lucas', apellido: 'Rodríguez', dni: '99105642', fecha_nacimiento: '2011-10-22', rol: RolUsuario.ALUMNO, activo: true, telefono: '1134567890', email: 'lucas.rodriguez.dev@yahoo.com' },
  { id: 3, nombre: 'Gabriela', apellido: 'López', dni: '99854120', fecha_nacimiento: '1980-02-28', rol: RolUsuario.DOCENTE, activo: true, telefono: '3515123457', email: 'gabriela.lo@edu.ar' },
  { id: 4, nombre: 'Bautista', apellido: 'Carrizo', dni: '99741935', fecha_nacimiento: '2010-07-04', rol: RolUsuario.ALUMNO, activo: true, email: 'bauti.carrizo@gmail.com' },
  { id: 5, nombre: 'Ignacio', apellido: 'Morales', dni: '99623081', rol: RolUsuario.ADMINISTRATIVO, activo: true, telefono: '2616123452', email: 'ignacio.m@biblioteca.edu' }
];

export const PRESTAMOS_SEMILLA: Prestamo[] = [
  { 
    id: 1, 
    usuario_id: 2, 
    recurso_id: 2, 
    inventario_ejemplar: '0003', 
    fecha_salida: new Date(Date.now() - 14 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now()).toISOString(), 
    estado: EstadoPrestamo.ACTIVO 
  },
  { 
    id: 2, 
    usuario_id: 4, 
    recurso_id: 4, 
    inventario_ejemplar: '0008', 
    fecha_salida: new Date(Date.now() - 18 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() - 8 * 86400000).toISOString(), 
    estado: EstadoPrestamo.ACTIVO 
  },
  { 
    id: 3, 
    usuario_id: 3, 
    recurso_id: 8, 
    inventario_ejemplar: '0015', 
    fecha_salida: new Date(Date.now() - 5 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() + 5 * 86400000).toISOString(), 
    estado: EstadoPrestamo.ACTIVO 
  },
  { 
    id: 4, 
    usuario_id: 5, 
    recurso_id: 11, 
    inventario_ejemplar: '0024', 
    fecha_salida: new Date(Date.now() - 1 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() + 9 * 86400000).toISOString(), 
    estado: EstadoPrestamo.ACTIVO 
  },
  { 
    id: 5, 
    usuario_id: 1, 
    recurso_id: 13, 
    inventario_ejemplar: '0029', 
    fecha_salida: new Date(Date.now() - 2 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() + 8 * 86400000).toISOString(), 
    estado: EstadoPrestamo.ACTIVO 
  },
  { 
    id: 6, 
    usuario_id: 2, 
    recurso_id: 15, 
    inventario_ejemplar: '0035', 
    fecha_salida: new Date(Date.now() - 12 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() - 2 * 86400000).toISOString(), 
    estado: EstadoPrestamo.ACTIVO 
  },
  { 
    id: 7, 
    usuario_id: 1, 
    recurso_id: 8, 
    inventario_ejemplar: '0014', 
    fecha_salida: new Date(Date.now() - 40 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() - 30 * 86400000).toISOString(), 
    fecha_devolucion_real: new Date(Date.now() - 31 * 86400000).toISOString(), 
    estado: EstadoPrestamo.DEVUELTO 
  },
  { 
    id: 8, 
    usuario_id: 2, 
    recurso_id: 8, 
    inventario_ejemplar: '0016', 
    fecha_salida: new Date(Date.now() - 35 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() - 25 * 86400000).toISOString(), 
    fecha_devolucion_real: new Date(Date.now() - 26 * 86400000).toISOString(), 
    estado: EstadoPrestamo.DEVUELTO 
  },
  { 
    id: 9, 
    usuario_id: 4, 
    recurso_id: 8, 
    inventario_ejemplar: '0014', 
    fecha_salida: new Date(Date.now() - 20 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() - 10 * 86400000).toISOString(), 
    fecha_devolucion_real: new Date(Date.now() - 11 * 86400000).toISOString(), 
    estado: EstadoPrestamo.DEVUELTO 
  },
  { 
    id: 10, 
    usuario_id: 2, 
    recurso_id: 11, 
    inventario_ejemplar: '0022', 
    fecha_salida: new Date(Date.now() - 45 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() - 35 * 86400000).toISOString(), 
    fecha_devolucion_real: new Date(Date.now() - 36 * 86400000).toISOString(), 
    estado: EstadoPrestamo.DEVUELTO 
  },
  { 
    id: 11, 
    usuario_id: 3, 
    recurso_id: 11, 
    inventario_ejemplar: '0023', 
    fecha_salida: new Date(Date.now() - 14 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() - 4 * 86400000).toISOString(), 
    fecha_devolucion_real: new Date(Date.now() - 5 * 86400000).toISOString(), 
    estado: EstadoPrestamo.DEVUELTO 
  },
  { 
    id: 12, 
    usuario_id: 4, 
    recurso_id: 13, 
    inventario_ejemplar: '0028', 
    fecha_salida: new Date(Date.now() - 50 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() - 40 * 86400000).toISOString(), 
    fecha_devolucion_real: new Date(Date.now() - 42 * 86400000).toISOString(), 
    estado: EstadoPrestamo.DEVUELTO 
  },
  { 
    id: 13, 
    usuario_id: 1, 
    recurso_id: 15, 
    inventario_ejemplar: '0033', 
    fecha_salida: new Date(Date.now() - 30 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() - 20 * 86400000).toISOString(), 
    fecha_devolucion_real: new Date(Date.now() - 21 * 86400000).toISOString(), 
    estado: EstadoPrestamo.DEVUELTO 
  },
  { 
    id: 14, 
    usuario_id: 3, 
    recurso_id: 10, 
    inventario_ejemplar: '0019', 
    fecha_salida: new Date(Date.now() - 60 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() - 50 * 86400000).toISOString(), 
    fecha_devolucion_real: new Date(Date.now() - 50 * 86400000).toISOString(), 
    estado: EstadoPrestamo.DEVUELTO 
  },
  { 
    id: 15, 
    usuario_id: 4, 
    recurso_id: 10, 
    inventario_ejemplar: '0021', 
    fecha_salida: new Date(Date.now() - 12 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() - 2 * 86400000).toISOString(), 
    fecha_devolucion_real: new Date(Date.now() - 3 * 86400000).toISOString(), 
    estado: EstadoPrestamo.DEVUELTO 
  },
  { 
    id: 16, 
    usuario_id: 2, 
    recurso_id: 9, 
    inventario_ejemplar: '0017', 
    fecha_salida: new Date(Date.now() - 15 * 86400000).toISOString(), 
    fecha_devolucion_estimada: new Date(Date.now() - 5 * 86400000).toISOString(), 
    fecha_devolucion_real: new Date(Date.now() - 6 * 86400000).toISOString(), 
    estado: EstadoPrestamo.DEVUELTO 
  }
];

export const INDICES_SEMILLA: string[] = [
  'ARGENTINA - MAPAS POLÍTICOS',
  'MATERIAL CARTOGRÁFICO',
  'GEOGRAFÍA - ARGENTINA - ENSEÑANZA',
  'FORMACIÓN CÍVICA',
  'DERECHOS HUMANOS',
  'DEMOCRACIA',
  'ÉTICA - TEXTOS ESCOLARES',
  'ANATOMÍA HUMANA - MODELOS',
  'TORSO HUMANO',
  'MATERIAL DIDÁCTICO',
  'BIOLOGÍA - ENSEÑANZA',
  'CIENCIAS NATURALES - TEXTOS ESCOLARES',
  'QUÍMICA ELEMENTAL',
  'FÍSICA ELEMENTAL',
  'ENSEÑANZA GENERAL BÁSICA',
  'CINE ARGENTINO',
  'DICTADURA MILITAR - ARGENTINA - FICCIÓN',
  'HISTORIA ARGENTINA - ENSEÑANZA SECUNDARIA',
  'GLOBO TERRÁQUEO',
  'MAPAS FÍSICOS',
  'MAPAS POLÍTICOS',
  'CIENCIAS SOCIALES - MATERIAL DIDÁCTICO',
  'QUÍMICA - EXPERIMENTOS',
  'JUEGOS EDUCATIVOS',
  'CIENCIAS NATURALES - ENSEÑANZA PRIMARIA',
  'MATERIAL DE LABORATORIO',
  'CUENTOS INFANTILES ARGENTINOS',
  'LITERATURA JUVENIL',
  'AMOR - FICCIÓN',
  'CUENTOS LATINOAMERICANOS',
  'ANTOLOGÍAS LITERARIAS',
  'SIGLO XX',
  'FILOSOFÍA - TEXTOS ESCOLARES',
  'ENSEÑANZA SECUNDARIA',
  'LÓGICA',
  'ÉTICA',
  'BIOLOGÍA - TEXTOS ESCOLARES',
  'EVOLUCIÓN BIOLÓGICA',
  'CÉLULAS',
  'GEOGRAFÍA - ARGENTINA',
  'TEXTOS ESCOLARES',
  'RECURSOS NATURALES',
  'DEMOGRAFÍA',
  'MATEMÁTICA - TEXTOS ESCOLARES',
  'ÁLGEBRA',
  'GEOMETRÍA',
  'LENGUA ESPAÑOLA - TEXTOS ESCOLARES',
  'GRAMÁTICA',
  'COMPRENSIÓN LECTORA',
  'ANÁLISIS LITERARIO',
  'HISTORIA MODERNA - TEXTOS ESCOLARES',
  'AMÉRICA - COLONIZACIÓN',
  'EUROPA - SIGLO XIV-XVIII',
  'EDUCACIÓN - INVESTIGACIÓN',
  'POLÍTICA EDUCATIVA',
  'PRÁCTICA PEDAGÓGICA',
  'PUBLICACIONES SERIADAS',
  'DIDÁCTICA',
  'FORMACIÓN DOCENTE',
  'CIENCIAS DE LA EDUCACIÓN'
];
