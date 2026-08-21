
export enum EstadoRecurso {
  DISPONIBLE = 'Disponible',
  PRESTADO = 'Prestado',
  SALA = 'Consulta en sala',
  PERDIDO = 'Perdido',
  NO_DISPONIBLE = 'No Disponible'
}

export enum EstadoPrestamo {
  ACTIVO = 'Activo',
  DEVUELTO = 'Devuelto',
  VENCIDO = 'Vencido'
}

export enum RolUsuario {
  ALUMNO = 'Alumno',
  DOCENTE = 'Docente',
  ADMINISTRATIVO = 'Administrativo',
  OTRO = 'Otro'
}

export enum TipoMaterial {
  LIBRO = 'Libro',
  PUBLICACION_SERIADA = 'Publicación seriada',
  MATERIAL_CARTOGRAFICO = 'Material cartográfico',
  MATERIAL_GRAFICO = 'Material gráfico',
  AUDIO = 'Audio',
  PARTITURAS = 'Partituras',
  VIDEO = 'Video',
  OBJETOS = 'Objetos',
  MANUSCRITO = 'Manuscrito'
}

export type TipoResponsabilidad = 'AUTOR' | 'CORPORATIVA' | 'GEOGRAFICA';

export interface Responsabilidad {
  tipo: TipoResponsabilidad;
  nombre: string;
}

export interface Ejemplar {
  inventario: string;
  estado: EstadoRecurso;
  // Ubicación específica para este ejemplar/volumen (Opcional)
  ubicacion?: string;
}

export interface Recurso {
  id: number;
  tipo_material: string; // Libro, Publicación seriada, etc.
  
  // Títulos
  titulo: string; // Subcampo MARC 245 $a
  variante_titulo?: string; // Variantes del título
  titulo_uniforme?: string;
  titulo_clave?: string; // Título clave para publicaciones seriadas (MARC 222)

  // Responsabilidades
  responsabilidad_principal: Responsabilidad;
  responsabilidad_secundaria: Responsabilidad[];

  // Publicación
  lugar_publicacion?: string[];
  editor?: string[];
  fecha?: string[];
  edicion?: string;

  // Descripción Física
  extension?: string;
  otros_detalles_fisicos?: string; // Detalles ilustrativos u otros físicos
  dimensiones?: string;
  material_complementario?: string;

  // Campos específicos de otros materiales (RCAA2)
  frecuencia?: string;      // Para publicaciones seriadas
  volumen_numero?: string;  // Para publicaciones seriadas
  existencias?: string;     // Para publicaciones seriadas (MARC 866)
  
  escala?: string;          // Para material cartográfico
  proyeccion?: string;      // Para material cartográfico
  coordenadas?: string;     // Para material cartográfico
  
  soporte_fisico?: string;  // Para material gráfico, audio, video, etc.
  color?: string;           // Para material gráfico, video
  
  formato_audio?: string;   // Para audio
  duracion?: string;        // Para audio, video
  detalles_reproduccion?: string; // Para audio
  
  instrumentacion?: string;// Para partituras
  clave_tono?: string;      // Para partituras
  
  formato_video?: string;   // Para video
  sistema_grabacion?: string;// Para video
  
  descripcion_objeto?: string; // Para objetos
  dimensiones_3d?: string;  // Para objetos

  tesis?: string;           // Para manuscritos / tesis académicas

  coleccion?: string[];
  notas: string[];
  contenido?: string[];
  numero_normalizado?: string[];
  numero_nomalizado?: string[]; // Alias por retrocompatibilidad
  url_recurso?: string; // Enlace MARC 856 al recurso
  
  // Indización
  temas: string[]; // Descriptores de materia

  // Existencias (Inventarios)
  ejemplares: Ejemplar[];
}

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento?: string;
  email?: string;
  telefono?: string;
  rol: RolUsuario | string;
  nota?: string;
  activo: boolean;
}

export interface Prestamo {
  id: number;
  usuario_id: number;
  recurso_id: number;
  inventario_ejemplar: string; // Ejemplar físico prestado
  fecha_salida: string; // Fecha en formato ISO
  fecha_devolucion_estimada: string; // Fecha en formato ISO
  fecha_devolucion_real?: string; // Fecha en formato ISO
  estado: EstadoPrestamo;
  // Campos extendidos para la interfaz de usuario
  usuario_nombre?: string;
  usuario_dni?: string;
  recurso_titulo?: string;
}

// Configuración del sistema
export interface Configuracion {
  dias_prestamo: number;
  nombre_biblioteca: string;
  fotos_usuarios_dir?: string;
  imagenes_registros_dir?: string;
  backup_auto_habilitado?: boolean;
  backup_intervalo_dias?: number;
  backup_dir?: string;
  ultimo_backup_fecha?: string;
}

export interface BackupData {
  recursos: Recurso[];
  usuarios: Usuario[];
  prestamos: Prestamo[];
  indices: string[];
  autoridades?: string[];
  config: Configuracion;
  timestamp: string;
}