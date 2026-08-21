import { Recurso, Ejemplar, EstadoRecurso, Responsabilidad } from '../types';
import { dbService } from './dbService';
import { cleanPunctuation, esAutorDuplicado } from '../utils/textUtils';

export { cleanPunctuation, esAutorDuplicado };

export function decodeUTF8(bytes: Uint8Array): string {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(bytes);
}

export function parseMrcSubfields(fieldValue: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const hasDelimiter = fieldValue.includes('\x1f') || fieldValue.includes('^');
  if (!hasDelimiter) {
    result['_raw'] = [fieldValue];
    return result;
  }
  const delimiter = fieldValue.includes('\x1f') ? '\x1f' : '^';
  const parts = fieldValue.split(delimiter);
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.length === 0) continue;
    const subfieldCode = part.charAt(0);
    const subfieldValue = part.substring(1).trim();
    if (!result[subfieldCode]) {
      result[subfieldCode] = [];
    }
    result[subfieldCode].push(subfieldValue);
  }
  return result;
}

// Decodifica bytes OEM CP850 (IBM850) de texto en español y europeo a UTF-8
export function decodeCP850(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i];
    if (code < 128) {
      result += String.fromCharCode(code);
    } else {
      switch (code) {
        case 160: result += 'á'; break;
        case 130: result += 'é'; break;
        case 161: result += 'í'; break;
        case 162: result += 'ó'; break;
        case 163: result += 'ú'; break;
        case 164: result += 'ñ'; break;
        case 165: result += 'Ñ'; break;
        case 181: result += 'Á'; break;
        case 144: result += 'É'; break;
        case 214: result += 'Í'; break;
        case 224: result += 'Ó'; break;
        case 233: result += 'Ú'; break;
        case 129: result += 'ü'; break;
        case 154: result += 'Ü'; break;
        case 166: result += 'ª'; break;
        case 167: result += 'º'; break;
        case 173: result += '¡'; break;
        case 168: result += '¿'; break;
        case 135: result += 'ç'; break;
        case 128: result += 'Ç'; break;
        case 138: result += 'è'; break;
        case 133: result += 'à'; break;
        case 131: result += 'â'; break;
        case 136: result += 'ê'; break;
        case 137: result += 'ë'; break;
        case 139: result += 'ï'; break;
        case 140: result += 'î'; break;
        case 141: result += 'ì'; break;
        case 147: result += 'ô'; break;
        case 148: result += 'ö'; break;
        case 149: result += 'ò'; break;
        case 150: result += 'û'; break;
        case 151: result += 'ù'; break;
        case 248: result += 'º'; break; // Tratar el byte 248 (grado en CP850, ø en ISO-8859-1) como 'º'
        default:
          result += String.fromCharCode(code); // Respaldo a ISO-8859-1
      }
    }
  }
  
  // Post-procesar para reemplazar cualquier carácter 'ø' o 'Ø' suelto que resulte de una decodificación errónea de los signos ordinales.
  // Aguapey y WinIsis a menudo exportan indicadores ordinales como código 248 (ø) o símbolos similares.
  return result.replace(/ø/g, 'º').replace(/Ø/g, 'º');
}

// Analiza subcampos dentro de una cadena de campo MARC (ej: "10^aTítulo^bSubtítulo" -> { a: "Título", b: "Subtítulo" })
export function parseSubfields(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  const idx = value.indexOf('^');
  if (idx === -1) {
    result['_raw'] = value;
    return result;
  }
  const subfieldsStr = value.substring(idx);
  const parts = subfieldsStr.split('^');
  for (const part of parts) {
    if (!part) continue;
    const subKey = part.charAt(0);
    const subValue = part.substring(1).trim();
    result[subKey] = subValue;
  }
  return result;
}

export interface ParseResult {
  recordsImported: number;
  recordsSkippedOrError: number;
  totalRecordsFound: number;
}

export const marcService = {
  /**
   * Parses an ArrayBuffer containing raw Aguapey .iso file data
   * and imports the books into the dbService.
   */
  importIsoFile: async (arrayBuffer: ArrayBuffer, onProgress?: (current: number, total: number) => void): Promise<ParseResult> => {
    const uint8 = new Uint8Array(arrayBuffer);
    
    // 1. Eliminar todos los saltos de línea (ASCII 10 y 13) para hacer una secuencia continua
    const cleanedBytes: number[] = [];
    for (let i = 0; i < uint8.length; i++) {
      const b = uint8[i];
      if (b !== 10 && b !== 13) {
        cleanedBytes.push(b);
      }
    }
    
    const totalLength = cleanedBytes.length;
    let pointer = 0;
    let recordsCount = 0;
    let importedCount = 0;
    let errorCount = 0;
    
    const recordsToImport: Omit<Recurso, 'id'>[] = [];
    
    // 2. Extraer registros secuencialmente usando sus prefacios de longitud de 5 dígitos
    while (pointer < totalLength) {
      if (pointer + 5 > totalLength) {
        break;
      }
      
      const lenStr = String.fromCharCode(
        cleanedBytes[pointer],
        cleanedBytes[pointer + 1],
        cleanedBytes[pointer + 2],
        cleanedBytes[pointer + 3],
        cleanedBytes[pointer + 4]
      );
      
      const len = parseInt(lenStr, 10);
      if (isNaN(len) || len <= 0) {
        pointer++; // Avanzar 1 para buscar el siguiente registro posible o romper
        continue;
      }
      
      if (pointer + len > totalLength) {
        errorCount++;
        break; // Fuera de límites
      }
      
      const recordBytes = new Uint8Array(cleanedBytes.slice(pointer, pointer + len));
      pointer += len;
      recordsCount++;
      
      try {
        const baseAddressStr = String.fromCharCode(
          recordBytes[12],
          recordBytes[13],
          recordBytes[14],
          recordBytes[15],
          recordBytes[16]
        );
        const baseAddress = parseInt(baseAddressStr, 10);
        if (isNaN(baseAddress)) {
          errorCount++;
          continue;
        }
        
        // Extraer Directorio (desde el índice de byte 24 hasta baseAddress)
        // Las entradas del directorio son de 12 bytes: etiqueta (3), longitud (4), desplazamiento (5)
        const directoryBytes = recordBytes.slice(24, baseAddress);
        const directoryStr = String.fromCharCode(...directoryBytes);
        
        const entries: { tag: string; length: number; offset: number }[] = [];
        for (let d = 0; d < directoryStr.length - 1; d += 12) {
          if (d + 12 > directoryStr.length) break;
          const entryStr = directoryStr.slice(d, d + 12);
          if (entryStr.startsWith('#')) break; // Terminado
          
          const tag = entryStr.slice(0, 3);
          const length = parseInt(entryStr.slice(3, 7), 10);
          const offset = parseInt(entryStr.slice(7, 12), 10);
          
          entries.push({ tag, length, offset });
        }
        
        // Mapear valores brutos utilizando definiciones de directorio
        const fields: Record<string, string[]> = {};
        for (const entry of entries) {
          const fieldStart = baseAddress + entry.offset;
          const fieldEnd = fieldStart + entry.length;
          if (fieldEnd > recordBytes.length) continue;
          
          let fieldBytes = recordBytes.slice(fieldStart, fieldEnd);
          // Eliminar el separador de campo final '#' (ASCII 35) o separadores estándar
          if (fieldBytes[fieldBytes.length - 1] === 35) {
            fieldBytes = fieldBytes.slice(0, -1);
          }
          
          const value = decodeCP850(fieldBytes);
          if (!fields[entry.tag]) {
            fields[entry.tag] = [];
          }
          fields[entry.tag].push(value);
        }
        
        // Pre-analizar 245 para GMD (Designación General del Material en el subcampo $h)
        let gmd = '';
        if (fields['245'] && fields['245'][0]) {
          const sub = parseSubfields(fields['245'][0]);
          if (sub['h']) {
            gmd = sub['h'].toLowerCase();
          }
        }

        // Pre-analizar el campo de descripción física 300 para ayudar en la clasificación del material
        const physicalDesc = fields['300'] && fields['300'][0] ? fields['300'][0].toLowerCase() : '';

        // Clasificar tipos de materiales
        let tipo_material = 'Libro';
        const tag902 = fields['902'] && fields['902'][0] ? fields['902'][0].trim() : '';

        const recType = recordBytes.length > 6 ? String.fromCharCode(recordBytes[6]).toLowerCase() : '';
        const bibLevel = recordBytes.length > 7 ? String.fromCharCode(recordBytes[7]).toLowerCase() : '';

        const tieneTituloClave = !!(fields['222'] && fields['222'][0]);
        const tieneIssn = !!(fields['022'] && fields['022'][0]);
        const tieneFrecuencia = !!(fields['310'] && fields['310'][0]);
        const tieneDesignacion = !!(fields['362'] && fields['362'][0]);

        // Priorizar indicadores MARC estándar y campos de series específicos
        if (tieneTituloClave || tieneIssn || tieneFrecuencia || tieneDesignacion || bibLevel === 's' || bibLevel === 'b' || bibLevel === 'i') {
          tipo_material = 'Publicación seriada';
        } else if (tag902 === '1') {
          tipo_material = 'Libro';
        } else if (tag902 === '2') {
          // Hoja de trabajo 2: Recursos electrónicos / CD-ROMs. 
          // Dado que las bibliotecas pequeñas usan CD/DVDs principalmente para música/grabaciones/audiolibros,
          // los clasificamos como "Audio" en lugar de "Libro".
          tipo_material = 'Audio';
        } else if (tag902 === '3') {
          // Hoja de trabajo 3: Materiales cartográficos
          tipo_material = 'Material cartográfico';
        } else if (tag902 === '4') {
          // Hoja de trabajo 4: Publicaciones seriadas (revistas, periódicos, etc.)
          tipo_material = 'Publicación seriada';
        } else if (tag902 === '5') {
          // Hoja de trabajo 5: Proyectables/No proyectables, Videos, Audiovisuales y Gráficos
          if (gmd.includes('video') || gmd.includes('película') || gmd.includes('proyec') || gmd.includes('audiovisual') ||
              physicalDesc.includes('video') || physicalDesc.includes('película') || physicalDesc.includes('vhs') || physicalDesc.includes('dvd') || physicalDesc.includes('carrete') || physicalDesc.includes('min.')) {
            tipo_material = 'Video';
          } else if (gmd.includes('gráfi') || gmd.includes('foto') || gmd.includes('diapos') || gmd.includes('pintura') || gmd.includes('dibujo') || gmd.includes('estampa') || gmd.includes('lámina') ||
                     physicalDesc.includes('fotografía') || physicalDesc.includes('diapositiva') || physicalDesc.includes('lámina') || physicalDesc.includes('transparencia') || physicalDesc.includes('estampa') || physicalDesc.includes('dibujo')) {
            tipo_material = 'Material gráfico';
          } else {
            tipo_material = 'Video'; // Respaldo predeterminado para la hoja de trabajo 5
          }
        } else if (tag902 === '6') {
          // Hoja de trabajo 6: Música (Grabaciones de sonido y partituras impresas)
          if (gmd.includes('grabación') || gmd.includes('sonor') || gmd.includes('audio') || gmd.includes('disco') || gmd.includes('casete') ||
              physicalDesc.includes('disco') || physicalDesc.includes('casete') || physicalDesc.includes('grabación') || physicalDesc.includes('sonido') || physicalDesc.includes('cinta') || physicalDesc.includes('cd')) {
            tipo_material = 'Audio';
          } else {
            tipo_material = 'Partituras'; // Respaldo predeterminado para la hoja de trabajo 6 (Partituras/Música impresa)
          }
        } else if (tag902 === '7') {
          tipo_material = 'Libro'; // La hoja de trabajo 7 contiene hojas de trabajo analíticas/de extensión en Aguapey
        } else if (tag902 === '8') {
          tipo_material = 'Objetos'; // La hoja de trabajo 8 es para Realia y objetos 3D
        } else {
          // RESPALDO a la clasificación estándar basada en el Leader de MARC o basada en GMD (para estándares no Aguapey)
          const recType = recordBytes.length > 6 ? String.fromCharCode(recordBytes[6]).toLowerCase() : '';
          const bibLevel = recordBytes.length > 7 ? String.fromCharCode(recordBytes[7]).toLowerCase() : '';

          if (recType === 'e' || recType === 'f' || gmd.includes('carto') || physicalDesc.includes('mapa') || physicalDesc.includes('globo')) {
            tipo_material = 'Material cartográfico';
          } else if (recType === 'c' || recType === 'd' || gmd.includes('partit') || gmd.includes('música') || physicalDesc.includes('partitura')) {
            tipo_material = 'Partituras';
          } else if (recType === 'i' || recType === 'j' || gmd.includes('sonor') || gmd.includes('grabación') || gmd.includes('audio') || physicalDesc.includes('disco') || physicalDesc.includes('casete')) {
            tipo_material = 'Audio';
          } else if (recType === 'g' || gmd.includes('video') || gmd.includes('película') || gmd.includes('proyec') || physicalDesc.includes('video') || physicalDesc.includes('película') || physicalDesc.includes('dvd')) {
            tipo_material = 'Video';
          } else if (recType === 'k' || gmd.includes('gráfi') || gmd.includes('foto') || gmd.includes('diapos') || gmd.includes('pintura') || physicalDesc.includes('fotografía') || physicalDesc.includes('lámina')) {
            tipo_material = 'Material gráfico';
          } else if (recType === 'r' || gmd.includes('objet') || gmd.includes('juego') || gmd.includes('maquet') || gmd.includes('modelo') || gmd.includes('realia')) {
            tipo_material = 'Objetos';
          } else if (bibLevel === 's' || gmd.includes('seriad') || gmd.includes('periód') || gmd.includes('revista') || physicalDesc.includes(' v.')) {
            tipo_material = 'Publicación seriada';
          }
        }

        // Título y mención de responsabilidad (MARC 245)
        let titulo = '';
        let variante_titulo: string | undefined = undefined;
        let statementResp: string | undefined = undefined;
        
        if (fields['245'] && fields['245'][0]) {
          const sub = parseSubfields(fields['245'][0]);
          statementResp = cleanPunctuation(sub['c']);
          
          const subfieldItems = fields['245'][0]
            .split('^')
            .slice(1)
            .map(part => ({
              key: part.charAt(0),
              value: cleanPunctuation(part.substring(1)) || ''
            }))
            .filter(item => item.key !== 'c' && item.value !== '');
            
          if (subfieldItems.length > 0) {
            let builtTitle = '';
            for (let i = 0; i < subfieldItems.length; i++) {
              const item = subfieldItems[i];
              if (i === 0) {
                builtTitle = item.value;
              } else {
                if (item.key === 'b') {
                  if (!builtTitle.endsWith(':')) {
                    builtTitle += ' :';
                  }
                  builtTitle += ' ' + item.value;
                } else if (item.key === 'n' || item.key === 'p') {
                  if (!builtTitle.endsWith('.')) {
                    builtTitle += '.';
                  }
                  builtTitle += ' ' + item.value;
                } else {
                  builtTitle += ' ' + item.value;
                }
              }
            }
            titulo = cleanPunctuation(builtTitle) || '';
          } else {
            titulo = cleanPunctuation(sub['a']) || '';
          }
        }

        // Varying Form of Title (MARC 246) -> variante_titulo
        if (fields['246'] && fields['246'][0]) {
          const sub246 = parseSubfields(fields['246'][0]);
          const subfieldParts246 = fields['246'][0]
            .split('^')
            .slice(1)
            .map(part => part.substring(1).trim())
            .filter(Boolean);
            
          if (subfieldParts246.length > 0) {
            variante_titulo = cleanPunctuation(subfieldParts246.join(' '));
          } else {
            variante_titulo = cleanPunctuation(sub246['a']);
          }
        }

        // Key Title / Título Clave (MARC 222) -> titulo_clave
        let titulo_clave: string | undefined = undefined;
        if (fields['222'] && fields['222'][0]) {
          const sub222 = parseSubfields(fields['222'][0]);
          const subfieldParts222 = fields['222'][0]
            .split('^')
            .slice(1)
            .map(part => part.substring(1).trim())
            .filter(Boolean);
            
          if (subfieldParts222.length > 0) {
            titulo_clave = cleanPunctuation(subfieldParts222.join(' '));
          } else {
            titulo_clave = cleanPunctuation(sub222['a']);
          }
        }
        
        // Omitir o asignar título por defecto si falta el campo 245
        if (!titulo) {
          if (titulo_clave) {
            titulo = titulo_clave;
          } else {
            titulo = 'Título Desconocido';
          }
        }
        
        // Analizador de Autor / Responsabilidad
        let responsabilidad_principal: Responsabilidad = { tipo: 'AUTOR', nombre: '' };
        const responsabilidad_secundaria: Responsabilidad[] = [];

        const agregarSecundarioUnico = (nuevaResp: Responsabilidad) => {
          if (!nuevaResp.nombre) return;
          if (esAutorDuplicado(responsabilidad_principal.nombre, nuevaResp.nombre)) {
            return;
          }
          const existe = responsabilidad_secundaria.some(r => esAutorDuplicado(r.nombre, nuevaResp.nombre));
          if (!existe) {
            responsabilidad_secundaria.push(nuevaResp);
          }
        };
        
        // Tag 100: Personal Author
        if (fields['100'] && fields['100'][0]) {
          const sub = parseSubfields(fields['100'][0]);
          const name = cleanPunctuation(sub['a']);
          const dates = cleanPunctuation(sub['d']);
          if (name) {
            responsabilidad_principal = {
              tipo: 'AUTOR',
              nombre: dates ? `${name}, ${dates}` : name
            };
          }
        } 
        // Tag 110: Corporate Author
        else if (fields['110'] && fields['110'][0]) {
          const sub = parseSubfields(fields['110'][0]);
          const name = cleanPunctuation(sub['a']);
          if (name) {
            responsabilidad_principal = {
              tipo: 'CORPORATIVA',
              nombre: name
            };
          }
        }
        // Tag 111: Geographic or Conference
        else if (fields['111'] && fields['111'][0]) {
          const sub = parseSubfields(fields['111'][0]);
          const name = cleanPunctuation(sub['a']);
          if (name) {
            responsabilidad_principal = {
              tipo: 'GEOGRAFICA',
              nombre: name
            };
          }
        }
        
        // Tag 700: Secondary Personal Authors
        if (fields['700']) {
          for (const rawVal of fields['700']) {
            const sub = parseSubfields(rawVal);
            const name = cleanPunctuation(sub['a']);
            const dates = cleanPunctuation(sub['d']);
            if (name) {
              agregarSecundarioUnico({
                tipo: 'AUTOR',
                nombre: dates ? `${name}, ${dates}` : name
              });
            }
          }
        }
        // Tag 710: Secondary Corporate
        if (fields['710']) {
          for (const rawVal of fields['710']) {
            const sub = parseSubfields(rawVal);
            const name = cleanPunctuation(sub['a']);
            if (name) {
              agregarSecundarioUnico({
                tipo: 'CORPORATIVA',
                nombre: name
              });
            }
          }
        }
        // Tag 711: Secondary Geographic or Conference
        if (fields['711']) {
          for (const rawVal of fields['711']) {
            const sub = parseSubfields(rawVal);
            const name = cleanPunctuation(sub['a']);
            if (name) {
              agregarSecundarioUnico({
                tipo: 'GEOGRAFICA',
                nombre: name
              });
            }
          }
        }
        
        // Información de publicación (MARC 260 o 264)
        let lugar_publicacion: string | undefined = undefined;
        let editorial: string | undefined = undefined;
        let anio: string | undefined = undefined;
        
        const pubField = (fields['260'] && fields['260'][0]) || (fields['264'] && fields['264'][0]);
        if (pubField) {
          const sub = parseSubfields(pubField);
          lugar_publicacion = cleanPunctuation(sub['a']);
          editorial = cleanPunctuation(sub['b']);
          // Extraer números para la representación del año
          const rawAnio = cleanPunctuation(sub['c']);
          if (rawAnio) {
            const cleanYear = rawAnio.replace(/[^0-9\-]/g, ''); // Keep numbers and hyphens
            anio = cleanYear || rawAnio;
          }
        }
        
        // Physical dimensions (300)
        let paginas: string | undefined = undefined;
        let ilustraciones: string | undefined = undefined;
        let dimensiones: string | undefined = undefined;
        let material_complementario: string | undefined = undefined;
        
        if (fields['300'] && fields['300'][0]) {
          const sub = parseSubfields(fields['300'][0]);
          paginas = cleanPunctuation(sub['a']);
          ilustraciones = cleanPunctuation(sub['b']);
          dimensiones = cleanPunctuation(sub['c']);
          material_complementario = cleanPunctuation(sub['e']);
        }
        
        // Edition (250)
        let edicion: string | undefined = undefined;
        if (fields['250'] && fields['250'][0]) {
          const sub = parseSubfields(fields['250'][0]);
          edicion = cleanPunctuation(sub['a']);
        }
        
        // Serie / Colección (490 o 440) - Repetible
        const coleccionesList: string[] = [];
        const seriesFields = [...(fields['490'] || []), ...(fields['440'] || [])];
        for (const sf of seriesFields) {
          const sub = parseSubfields(sf);
          const colName = cleanPunctuation(sub['a']);
          if (colName) {
            coleccionesList.push(colName);
          }
        }
        
        // ISBN (020) - repetible
        const isbnList: string[] = [];
        if (fields['020']) {
          for (const val of fields['020']) {
            const sub = parseSubfields(val);
            const rawIsbn = cleanPunctuation(sub['a']);
            if (rawIsbn) {
              isbnList.push(rawIsbn);
            }
          }
        }

        // --- ANÁLISIS DE CAMPOS ESPECÍFICOS DE TIPOS DE MATERIAL EXTRA RCAA2 ---
        const issnList: string[] = [];
        if (fields['022']) {
          for (const val of fields['022']) {
            const sub = parseSubfields(val);
            const rawIssn = cleanPunctuation(sub['a']);
            if (rawIssn) {
              issnList.push(rawIssn);
            }
          }
        }

        let frecuencia: string | undefined = undefined;
        if (fields['310'] && fields['310'][0]) {
          const sub = parseSubfields(fields['310'][0]);
          frecuencia = cleanPunctuation(sub['a']);
        }

        let volumen_numero: string | undefined = undefined;
        if (fields['362'] && fields['362'][0]) {
          const sub = parseSubfields(fields['362'][0]);
          volumen_numero = cleanPunctuation(sub['a']);
        }

        let existencias: string | undefined = undefined;
        if (fields['866']) {
          const extList: string[] = [];
          for (const val of fields['866']) {
            const sub = parseSubfields(val);
            const rawVal = cleanPunctuation(sub['a']) || cleanPunctuation(sub['_raw']);
            if (rawVal) {
              extList.push(rawVal);
            }
          }
          if (extList.length > 0) {
            existencias = extList.join('; ');
          }
        }

        let escala: string | undefined = undefined;
        let proyeccion: string | undefined = undefined;
        let coordenadas: string | undefined = undefined;
        if (fields['255'] && fields['255'][0]) {
          const sub = parseSubfields(fields['255'][0]);
          escala = cleanPunctuation(sub['a']);
          proyeccion = cleanPunctuation(sub['b']);
          coordenadas = cleanPunctuation(sub['c']);
        }

        // Parse support/GMD
        let soporte_fisico: string | undefined = undefined;
        if (gmd) {
          soporte_fisico = gmd.replace(/[\[\]]/g, '').trim();
        } else if (fields['338'] && fields['338'][0]) {
          const sub = parseSubfields(fields['338'][0]);
          soporte_fisico = cleanPunctuation(sub['a']);
        } else if (fields['300'] && fields['300'][0]) {
          const sub = parseSubfields(fields['300'][0]);
          if (sub['e']) {
            soporte_fisico = cleanPunctuation(sub['e']);
          }
        }

        let color: string | undefined = undefined;
        if (fields['300'] && fields['300'][0]) {
          const sub = parseSubfields(fields['300'][0]);
          const details = cleanPunctuation(sub['b']);
          if (details && (details.toLowerCase().includes('col') || details.toLowerCase().includes('b/n') || details.toLowerCase().includes('color') || details.toLowerCase().includes('negro'))) {
            color = details;
          }
        }

        let formato_audio: string | undefined = undefined;
        let duracion: string | undefined = undefined;
        let detalles_reproduccion: string | undefined = undefined;
        if (tipo_material === 'Audio') {
          if (fields['300'] && fields['300'][0]) {
            const sub = parseSubfields(fields['300'][0]);
            formato_audio = cleanPunctuation(sub['a']);
            detalles_reproduccion = cleanPunctuation(sub['b']);
          }
          if (fields['306'] && fields['306'][0]) {
            duracion = cleanPunctuation(fields['306'][0]);
          } else if (fields['300'] && fields['300'][0]) {
            const aVal = parseSubfields(fields['300'][0])['a'];
            const match = aVal?.match(/\(([^)]+)\)/);
            if (match) {
              duracion = match[1];
            }
          }
        }

        let instrumentacion: string | undefined = undefined;
        let clave_tono: string | undefined = undefined;
        if (tipo_material === 'Partituras') {
          if (fields['240'] && fields['240'][0]) {
            const sub = parseSubfields(fields['240'][0]);
            instrumentacion = cleanPunctuation(sub['m']);
            clave_tono = cleanPunctuation(sub['r']);
          }
          if (!instrumentacion && fields['382'] && fields['382'][0]) {
            const sub = parseSubfields(fields['382'][0]);
            instrumentacion = cleanPunctuation(sub['a']);
          }
        }

        let formato_video: string | undefined = undefined;
        let sistema_grabacion: string | undefined = undefined;
        if (tipo_material === 'Video') {
          if (fields['300'] && fields['300'][0]) {
            const sub = parseSubfields(fields['300'][0]);
            formato_video = cleanPunctuation(sub['a']);
            sistema_grabacion = cleanPunctuation(sub['b']);
          }
          if (fields['306'] && fields['306'][0]) {
            duracion = cleanPunctuation(fields['306'][0]);
          } else if (fields['300'] && fields['300'][0]) {
            const aVal = parseSubfields(fields['300'][0])['a'];
            const match = aVal?.match(/\(([^)]+)\)/);
            if (match) {
              duracion = match[1];
            }
          }
        }

        let descripcion_objeto: string | undefined = undefined;
        let dimensiones_3d: string | undefined = undefined;
        if (tipo_material === 'Objetos') {
          if (fields['300'] && fields['300'][0]) {
            const sub = parseSubfields(fields['300'][0]);
            descripcion_objeto = cleanPunctuation(sub['a']) || cleanPunctuation(sub['b']);
            dimensiones_3d = cleanPunctuation(sub['c']);
          }
        }
        
        // Notes (range 500-599, specifically 500)
        const notasList: string[] = [];
        const noteTags = ['500', '504', '520'];
        for (const tag of noteTags) {
          if (fields[tag]) {
            for (const val of fields[tag]) {
              const sub = parseSubfields(val);
              let parsedNote = '';
              
              if (sub['_raw']) {
                // Eliminar los dos primeros caracteres de indicadores (ej: "0#", "  ", "# ")
                let rawWithNoIndicators = sub['_raw'];
                if (rawWithNoIndicators.length > 2) {
                  rawWithNoIndicators = rawWithNoIndicators.replace(/^([0-9#\s]{2})/, '');
                }
                parsedNote = cleanPunctuation(rawWithNoIndicators) || '';
              } else {
                // Unir subcampos excluyendo prefijos de indicadores
                const subfieldValues = Object.entries(sub)
                  .filter(([k]) => k !== '_raw')
                  .map(([_, v]) => cleanPunctuation(v))
                  .filter(Boolean) as string[];
                
                parsedNote = subfieldValues.join(' ');
              }

              if (parsedNote) {
                notasList.push(parsedNote);
              }
            }
          }
        }

        // Contenidos (MARC 505) - Campo repetible
        const contenidoList: string[] = [];
        if (fields['505']) {
          for (const val of fields['505']) {
            let parsedContent = '';
            const idx = val.indexOf('^');
            
            if (idx === -1) {
              let rawWithNoIndicators = val;
              if (rawWithNoIndicators.length > 2) {
                rawWithNoIndicators = rawWithNoIndicators.replace(/^([0-9#\s]{2})/, '');
              }
              parsedContent = cleanPunctuation(rawWithNoIndicators) || '';
            } else {
              const subfieldsStr = val.substring(idx);
              const parts = subfieldsStr.split('^').filter(Boolean);
              
              const list: { key: string; value: string }[] = parts.map(part => ({
                key: part.charAt(0),
                value: cleanPunctuation(part.substring(1)) || ''
              })).filter(item => item.value !== '');
              
              let formatted = '';
              for (let i = 0; i < list.length; i++) {
                const current = list[i];
                if (i > 0) {
                  const prev = list[i - 1];
                  if (prev.key === 't' && current.key === 'r') {
                    formatted += ' / ';
                  } else if (current.key === 't') {
                    formatted += '; ';
                  } else {
                    formatted += ' ';
                  }
                }
                formatted += current.value;
              }
              parsedContent = formatted;
            }

            if (parsedContent) {
              contenidoList.push(parsedContent);
            }
          }
        }
        
        // Temas / Descriptores (MARC 650)
        const temasList: string[] = [];
        const subjectTags = ['650', '600', '610', '651'];
        for (const tag of subjectTags) {
          if (fields[tag]) {
            for (const val of fields[tag]) {
              // Los campos de temas generalmente tienen indicadores, ej: '#4^aLITERATURA'
              const sub = parseSubfields(val);
              const name = cleanPunctuation(sub['a']);
              if (name) {
                temasList.push(name.toUpperCase());
              }
            }
          }
        }

        // URL / Recurso Electrónico (MARC 856)
        let url_recurso: string | undefined = undefined;
        if (fields['856'] && fields['856'][0]) {
          const sub = parseSubfields(fields['856'][0]);
          if (sub['u']) {
            url_recurso = sub['u'].trim();
          } else {
            const rawVal = sub['_raw'] || fields['856'][0];
            const urlMatch = rawVal.match(/https?:\/\/[^\s^]+/);
            if (urlMatch) {
              url_recurso = urlMatch[0];
            } else if (rawVal.length > 2) {
              const cleanRaw = rawVal.substring(2).trim();
              if (cleanRaw) {
                url_recurso = cleanRaw;
              }
            }
          }
        }
        
        // Inventario y existencias (etiqueta personalizada de Aguapey 859)
        const ejemplares: Ejemplar[] = [];
        if (fields['859']) {
          for (const raw859 of fields['859']) {
            const sub = parseSubfields(raw859);
            let inventario = cleanPunctuation(sub['a']);
            if (inventario) {
              // Si es una cadena numérica, estandarizarla a 4 dígitos (ej: 000567 -> 0567)
              if (/^\d+$/.test(inventario)) {
                const num = parseInt(inventario, 10);
                inventario = String(num).padStart(4, '0');
              }
            }
            
            // Construir coordenadas de estante de clasificación (ubicación/sección + clasificación + etiqueta corta de autor + volumen)
            const signatureLocation = cleanPunctuation(sub['l']);
            const signatureClass = cleanPunctuation(sub['m']);
            const signatureAuthor = cleanPunctuation(sub['n']);
            const signatureVolume = cleanPunctuation(sub['c']);
            const signatureParts: string[] = [];
            if (signatureLocation) signatureParts.push(signatureLocation);
            if (signatureClass) signatureParts.push(signatureClass);
            if (signatureAuthor) signatureParts.push(signatureAuthor);
            if (signatureVolume) signatureParts.push(signatureVolume);
            const ubicacion = signatureParts.join(' ').trim();
            
            const dispoRaw = sub['d'] ? sub['d'].toLowerCase().trim() : '';
            let estadoEjemplar = EstadoRecurso.DISPONIBLE;
            if (dispoRaw.includes('no disponible') || dispoRaw.includes('no-disponible') || dispoRaw === 'no' || dispoRaw === 'no disponible') {
              estadoEjemplar = EstadoRecurso.NO_DISPONIBLE;
            } else if (dispoRaw.includes('reparac') || dispoRaw.includes('taller') || dispoRaw.includes('baja') || dispoRaw.includes('retirado')) {
              estadoEjemplar = EstadoRecurso.NO_DISPONIBLE;
            } else if (dispoRaw.includes('perdido') || dispoRaw.includes('extraviado')) {
              estadoEjemplar = EstadoRecurso.PERDIDO;
            } else if (dispoRaw.includes('prestado')) {
              estadoEjemplar = EstadoRecurso.PRESTADO;
            } else if (dispoRaw.includes('sala')) {
              estadoEjemplar = EstadoRecurso.SALA;
            }

            if (inventario) {
              ejemplares.push({
                inventario: inventario,
                estado: estadoEjemplar,
                ubicacion: ubicacion || undefined
              });
            }
          }
        }
        
        // Añadir una sola copia predeterminada si el registro no incluye existencias
        if (ejemplares.length === 0) {
          // ¿Es más seguro mantener vacío o generar un marcador de posición simple?
          // Mantengamos vacío porque el usuario asocia copias con carpetas reales,
          // pero podemos permitirles agregar copias en la interfaz de usuario.
        }
        
        const nuevoRecurso: Omit<Recurso, 'id'> = {
          tipo_material,
          titulo,
          variante_titulo,
          titulo_clave,
          responsabilidad_principal,
          responsabilidad_secundaria,
          lugar_publicacion: lugar_publicacion ? [lugar_publicacion] : [],
          editor: editorial ? [editorial] : [],
          fecha: anio ? [anio] : [],
          edicion,
          extension: paginas,
          otros_detalles_fisicos: ilustraciones,
          dimensiones,
          material_complementario,
          coleccion: coleccionesList,
          numero_normalizado: [...isbnList, ...issnList],
          frecuencia,
          volumen_numero,
          existencias,
          escala,
          proyeccion,
          coordenadas,
          soporte_fisico,
          color,
          formato_audio,
          duracion,
          detalles_reproduccion,
          instrumentacion,
          clave_tono,
          formato_video,
          sistema_grabacion,
          descripcion_objeto,
          dimensiones_3d,
          notas: notasList,
          contenido: contenidoList,
          temas: Array.from(new Set(temasList)), // Eliminar duplicados
          url_recurso,
          ejemplares
        };
        
        recordsToImport.push(nuevoRecurso);
        
      } catch (err) {
        errorCount++;
        console.error(`Error decoding record #${recordsCount}:`, err);
      }
    }
    
    // 3. Importación por lotes en el localStorage del sistema con devolución de llamada onProgress
    const totalRecordsToImport = recordsToImport.length;
    for (let i = 0; i < totalRecordsToImport; i++) {
      try {
        await dbService.crearRecurso(recordsToImport[i]);
        importedCount++;
        
        if (onProgress && i % 10 === 0) {
          onProgress(i + 1, totalRecordsToImport);
        }
      } catch (e) {
        errorCount++;
        console.error("Failed to insert book to localStorage db:", e);
      }
    }
    
    if (onProgress) {
      onProgress(totalRecordsToImport, totalRecordsToImport);
    }
    
    return {
      recordsImported: importedCount,
      recordsSkippedOrError: recordsCount - importedCount + errorCount,
      totalRecordsFound: recordsCount
    };
  },

  /**
   * Parses an ArrayBuffer containing raw Koha .mrc file data (standard MARC21)
   * and imports the books into the dbService using UTF-8 decoding.
   */
  importMrcFile: async (
    arrayBuffer: ArrayBuffer, 
    onProgress?: (current: number, total: number) => void
  ): Promise<{
    recordsImported: number;
    recordsSkippedOrError: number;
    totalRecordsFound: number;
    errors: string[];
  }> => {
    const uint8 = new Uint8Array(arrayBuffer);
    
    // 1. Eliminar saltos de línea (ASCII 10 y 13) para formar un flujo continuo
    const cleanedBytes: number[] = [];
    for (let i = 0; i < uint8.length; i++) {
      const b = uint8[i];
      if (b !== 10 && b !== 13) {
        cleanedBytes.push(b);
      }
    }
    
    const totalLength = cleanedBytes.length;
    let pointer = 0;
    let recordsCount = 0;
    let importedCount = 0;
    const errors: string[] = [];
    
    const recordsToImport: Omit<Recurso, 'id'>[] = [];
    
    // 2. Extraer registros secuencialmente según la cabecera de 5 dígitos
    while (pointer < totalLength) {
      if (pointer + 5 > totalLength) {
        break;
      }
      
      const lenStr = String.fromCharCode(
        cleanedBytes[pointer],
        cleanedBytes[pointer + 1],
        cleanedBytes[pointer + 2],
        cleanedBytes[pointer + 3],
        cleanedBytes[pointer + 4]
      );
      
      const len = parseInt(lenStr, 10);
      if (isNaN(len) || len <= 0) {
        pointer++; // Avanzar 1 posición para buscar el siguiente registro
        continue;
      }
      
      if (pointer + len > totalLength) {
        errors.push(`Registro #${recordsCount + 1}: Longitud especificada de ${len} supera el tamaño restante del archivo.`);
        break;
      }
      
      const recordBytes = new Uint8Array(cleanedBytes.slice(pointer, pointer + len));
      pointer += len;
      recordsCount++;
      
      try {
        const baseAddressStr = String.fromCharCode(
          recordBytes[12],
          recordBytes[13],
          recordBytes[14],
          recordBytes[15],
          recordBytes[16]
        );
        const baseAddress = parseInt(baseAddressStr, 10);
        if (isNaN(baseAddress)) {
          errors.push(`Registro #${recordsCount}: Dirección base no válida.`);
          continue;
        }
        
        // Extraer directorio (desde byte 24 hasta la dirección base)
        const directoryBytes = recordBytes.slice(24, baseAddress);
        const directoryStr = String.fromCharCode(...directoryBytes);
        
        const entries: { tag: string; length: number; offset: number }[] = [];
        for (let d = 0; d < directoryStr.length - 1; d += 12) {
          if (d + 12 > directoryStr.length) break;
          const entryStr = directoryStr.slice(d, d + 12);
          if (entryStr.startsWith('\x1e') || entryStr.startsWith('#')) break;
          
          const tag = entryStr.slice(0, 3);
          const length = parseInt(entryStr.slice(3, 7), 10);
          const offset = parseInt(entryStr.slice(7, 12), 10);
          
          entries.push({ tag, length, offset });
        }
        
        // Mapear valores utilizando las entradas del directorio
        const fields: Record<string, string[]> = {};
        for (const entry of entries) {
          const fieldStart = baseAddress + entry.offset;
          const fieldEnd = fieldStart + entry.length;
          if (fieldEnd > recordBytes.length) continue;
          
          let fieldBytes = recordBytes.slice(fieldStart, fieldEnd);
          // Eliminar separadores de campo al final (\x1e o #)
          if (fieldBytes[fieldBytes.length - 1] === 30 || fieldBytes[fieldBytes.length - 1] === 35) {
            fieldBytes = fieldBytes.slice(0, -1);
          }
          
          // Decodificar utilizando UTF-8
          const value = decodeUTF8(fieldBytes);
          if (!fields[entry.tag]) {
            fields[entry.tag] = [];
          }
          fields[entry.tag].push(value);
        }
        
        // Analizar subcampo $h del campo 245
        let gmd = '';
        if (fields['245'] && fields['245'][0]) {
          const sub = parseMrcSubfields(fields['245'][0]);
          if (sub['h'] && sub['h'][0]) {
            gmd = sub['h'][0].toLowerCase();
          }
        }

        // Analizar descripción física (campo 300)
        const physicalDesc = fields['300'] && fields['300'][0] ? fields['300'][0].toLowerCase() : '';

        // Clasificar tipos de material
        let tipo_material = 'Libro';
        const recType = recordBytes.length > 6 ? String.fromCharCode(recordBytes[6]).toLowerCase() : '';
        const bibLevel = recordBytes.length > 7 ? String.fromCharCode(recordBytes[7]).toLowerCase() : '';

        const tieneTituloClave = !!(fields['222'] && fields['222'][0]);
        const tieneIssn = !!(fields['022'] && fields['022'][0]);
        const tieneFrecuencia = !!(fields['310'] && fields['310'][0]);
        const tieneDesignacion = !!(fields['362'] && fields['362'][0]);

        if (tieneTituloClave || tieneIssn || tieneFrecuencia || tieneDesignacion || bibLevel === 's' || bibLevel === 'b' || bibLevel === 'i') {
          tipo_material = 'Publicación seriada';
        } else if (recType === 'e' || recType === 'f' || gmd.includes('carto') || physicalDesc.includes('mapa') || physicalDesc.includes('globo')) {
          tipo_material = 'Material cartográfico';
        } else if (recType === 'c' || recType === 'd' || gmd.includes('partit') || gmd.includes('música') || physicalDesc.includes('partitura')) {
          tipo_material = 'Partituras';
        } else if (recType === 'i' || recType === 'j' || gmd.includes('sonor') || gmd.includes('grabación') || gmd.includes('audio') || physicalDesc.includes('disco') || physicalDesc.includes('casete')) {
          tipo_material = 'Audio';
        } else if (recType === 'g' || gmd.includes('video') || gmd.includes('película') || gmd.includes('proyec') || physicalDesc.includes('video') || physicalDesc.includes('película') || physicalDesc.includes('dvd')) {
          tipo_material = 'Video';
        } else if (recType === 'k' || gmd.includes('gráfi') || gmd.includes('foto') || gmd.includes('diapos') || gmd.includes('pintura') || physicalDesc.includes('fotografía') || physicalDesc.includes('lámina')) {
          tipo_material = 'Material gráfico';
        } else if (recType === 'r' || gmd.includes('objet') || gmd.includes('juego') || gmd.includes('maquet') || gmd.includes('modelo') || gmd.includes('realia')) {
          tipo_material = 'Objetos';
        } else if (recType === 't') {
          tipo_material = 'Manuscrito';
        }

        // Título y mención de responsabilidad (MARC 245)
        let titulo = '';
        let variante_titulo: string | undefined = undefined;
        
        if (fields['245'] && fields['245'][0]) {
          const sub = parseMrcSubfields(fields['245'][0]);
          const a = sub['a']?.[0];
          const b = sub['b']?.[0];
          const n = sub['n']?.[0];
          const p = sub['p']?.[0];
          
          let titleParts: string[] = [];
          if (a) titleParts.push(cleanPunctuation(a) || '');
          if (b) titleParts.push(': ' + (cleanPunctuation(b) || ''));
          if (n) titleParts.push('. ' + (cleanPunctuation(n) || ''));
          if (p) titleParts.push('. ' + (cleanPunctuation(p) || ''));
          
          titulo = titleParts.join(' ').replace(/\s+:/g, ' :').replace(/\s+\./g, '.').trim();
          titulo = cleanPunctuation(titulo) || '';
        }

        // Forma variante del título (MARC 246)
        if (fields['246'] && fields['246'][0]) {
          const sub246 = parseMrcSubfields(fields['246'][0]);
          const a = sub246['a']?.[0];
          if (a) {
            variante_titulo = cleanPunctuation(a);
          }
        }

        // Título Clave (MARC 222)
        let titulo_clave: string | undefined = undefined;
        if (fields['222'] && fields['222'][0]) {
          const sub222 = parseMrcSubfields(fields['222'][0]);
          const a = sub222['a']?.[0];
          if (a) {
            titulo_clave = cleanPunctuation(a);
          }
        }
        
        // Omitir o asignar título por defecto si no existe
        if (!titulo) {
          if (titulo_clave) {
            titulo = titulo_clave;
          } else {
            titulo = 'Título Desconocido';
            errors.push(`Registro #${recordsCount}: Título no encontrado (campo 245 vacío o ausente).`);
          }
        }
        
        // Analizador de responsabilidad / autor
        let responsabilidad_principal: Responsabilidad = { tipo: 'AUTOR', nombre: 'Sin autor' };
        const responsabilidad_secundaria: Responsabilidad[] = [];

        const agregarSecundarioUnico = (nuevaResp: Responsabilidad) => {
          if (!nuevaResp.nombre) return;
          if (esAutorDuplicado(responsabilidad_principal.nombre, nuevaResp.nombre)) {
            return;
          }
          const existe = responsabilidad_secundaria.some(r => esAutorDuplicado(r.nombre, nuevaResp.nombre));
          if (!existe) {
            responsabilidad_secundaria.push(nuevaResp);
          }
        };
        
        // Tag 100: Personal Author
        if (fields['100'] && fields['100'][0]) {
          const sub = parseMrcSubfields(fields['100'][0]);
          const name = sub['a']?.[0];
          const dates = sub['d']?.[0];
          if (name) {
            responsabilidad_principal = {
              tipo: 'AUTOR',
              nombre: dates ? `${cleanPunctuation(name)}, ${cleanPunctuation(dates)}` : (cleanPunctuation(name) || '')
            };
          }
        } 
        // Tag 110: Corporate Author
        else if (fields['110'] && fields['110'][0]) {
          const sub = parseMrcSubfields(fields['110'][0]);
          const name = sub['a']?.[0];
          if (name) {
            responsabilidad_principal = {
              tipo: 'CORPORATIVA',
              nombre: cleanPunctuation(name) || ''
            };
          }
        }
        // Tag 111: Geographic or Conference
        else if (fields['111'] && fields['111'][0]) {
          const sub = parseMrcSubfields(fields['111'][0]);
          const name = sub['a']?.[0];
          if (name) {
            responsabilidad_principal = {
              tipo: 'GEOGRAFICA',
              nombre: cleanPunctuation(name) || ''
            };
          }
        }
        
        // Tag 700: Secondary Personal Authors
        if (fields['700']) {
          for (const rawVal of fields['700']) {
            const sub = parseMrcSubfields(rawVal);
            const name = sub['a']?.[0];
            const dates = sub['d']?.[0];
            if (name) {
              agregarSecundarioUnico({
                tipo: 'AUTOR',
                nombre: dates ? `${cleanPunctuation(name)}, ${cleanPunctuation(dates)}` : (cleanPunctuation(name) || '')
              });
            }
          }
        }
        // Tag 710: Secondary Corporate
        if (fields['710']) {
          for (const rawVal of fields['710']) {
            const sub = parseMrcSubfields(rawVal);
            const name = sub['a']?.[0];
            if (name) {
              agregarSecundarioUnico({
                tipo: 'CORPORATIVA',
                nombre: cleanPunctuation(name) || ''
              });
            }
          }
        }
        // Tag 711: Secondary Geographic or Conference
        if (fields['711']) {
          for (const rawVal of fields['711']) {
            const sub = parseMrcSubfields(rawVal);
            const name = sub['a']?.[0];
            if (name) {
              agregarSecundarioUnico({
                tipo: 'GEOGRAFICA',
                nombre: cleanPunctuation(name) || ''
              });
            }
          }
        }
        
        // Publication info (MARC 260 or 264)
        let lugar_publicacion: string[] = [];
        let editor: string[] = [];
        let fecha: string[] = [];
        
        const pubField = (fields['260'] && fields['260'][0]) || (fields['264'] && fields['264'][0]);
        if (pubField) {
          const sub = parseMrcSubfields(pubField);
          const a = sub['a']?.[0];
          const b = sub['b']?.[0];
          const c = sub['c']?.[0];
          
          if (a) lugar_publicacion.push(cleanPunctuation(a) || '');
          if (b) editor.push(cleanPunctuation(b) || '');
          if (c) {
            const cleanYear = c.replace(/[^0-9\-]/g, '');
            fecha.push(cleanYear || cleanPunctuation(c) || '');
          }
        }
        
        // Physical dimensions (300)
        let paginas: string | undefined = undefined;
        let otros_detalles_fisicos: string | undefined = undefined;
        let dimensiones: string | undefined = undefined;
        let material_complementario: string | undefined = undefined;
        
        if (fields['300'] && fields['300'][0]) {
          const sub = parseMrcSubfields(fields['300'][0]);
          paginas = cleanPunctuation(sub['a']?.[0]);
          otros_detalles_fisicos = cleanPunctuation(sub['b']?.[0]);
          dimensiones = cleanPunctuation(sub['c']?.[0]);
          material_complementario = cleanPunctuation(sub['e']?.[0]);
        }
        
        // Edition (250)
        let edicion: string | undefined = undefined;
        if (fields['250'] && fields['250'][0]) {
          const sub = parseMrcSubfields(fields['250'][0]);
          edicion = cleanPunctuation(sub['a']?.[0]);
        }
        
        // Series / Collection (490 or 440)
        const coleccionesList: string[] = [];
        const seriesFields = [...(fields['490'] || []), ...(fields['440'] || [])];
        for (const sf of seriesFields) {
          const sub = parseMrcSubfields(sf);
          const colName = sub['a']?.[0];
          if (colName) {
            coleccionesList.push(cleanPunctuation(colName) || '');
          }
        }
        
        // ISBN (020)
        const isbnList: string[] = [];
        if (fields['020']) {
          for (const val of fields['020']) {
            const sub = parseMrcSubfields(val);
            const rawIsbn = sub['a']?.[0];
            if (rawIsbn) {
              isbnList.push(cleanPunctuation(rawIsbn) || '');
            }
          }
        }

        // ISSN (022)
        const issnList: string[] = [];
        if (fields['022']) {
          for (const val of fields['022']) {
            const sub = parseMrcSubfields(val);
            const rawIssn = sub['a']?.[0];
            if (rawIssn) {
              issnList.push(cleanPunctuation(rawIssn) || '');
            }
          }
        }

        let frecuencia: string | undefined = undefined;
        if (fields['310'] && fields['310'][0]) {
          const sub = parseMrcSubfields(fields['310'][0]);
          frecuencia = cleanPunctuation(sub['a']?.[0]);
        }

        let volumen_numero: string | undefined = undefined;
        if (fields['362'] && fields['362'][0]) {
          const sub = parseMrcSubfields(fields['362'][0]);
          volumen_numero = cleanPunctuation(sub['a']?.[0]);
        }

        let existencias: string | undefined = undefined;
        if (fields['866']) {
          const extList: string[] = [];
          for (const val of fields['866']) {
            const sub = parseMrcSubfields(val);
            const rawVal = cleanPunctuation(sub['a']?.[0]) || cleanPunctuation(sub['_raw']?.[0]);
            if (rawVal) {
              extList.push(rawVal);
            }
          }
          if (extList.length > 0) {
            existencias = extList.join('; ');
          }
        }

        let escala: string | undefined = undefined;
        let proyeccion: string | undefined = undefined;
        let coordenadas: string | undefined = undefined;
        if (fields['255'] && fields['255'][0]) {
          const sub = parseMrcSubfields(fields['255'][0]);
          escala = cleanPunctuation(sub['a']?.[0]);
          proyeccion = cleanPunctuation(sub['b']?.[0]);
          coordenadas = cleanPunctuation(sub['c']?.[0]);
        }

        // Parse support/GMD
        let soporte_fisico: string | undefined = undefined;
        if (gmd) {
          soporte_fisico = gmd.replace(/[\[\]]/g, '').trim();
        } else if (fields['338'] && fields['338'][0]) {
          const sub = parseMrcSubfields(fields['338'][0]);
          soporte_fisico = cleanPunctuation(sub['a']?.[0]);
        } else if (fields['300'] && fields['300'][0]) {
          const sub = parseMrcSubfields(fields['300'][0]);
          if (sub['e']?.[0]) {
            soporte_fisico = cleanPunctuation(sub['e']?.[0]);
          }
        }

        let color: string | undefined = undefined;
        if (fields['300'] && fields['300'][0]) {
          const sub = parseMrcSubfields(fields['300'][0]);
          const details = cleanPunctuation(sub['b']?.[0]);
          if (details && (details.toLowerCase().includes('col') || details.toLowerCase().includes('b/n') || details.toLowerCase().includes('color') || details.toLowerCase().includes('negro'))) {
            color = details;
          }
        }

        let formato_audio: string | undefined = undefined;
        let duracion: string | undefined = undefined;
        let detalles_reproduccion: string | undefined = undefined;
        if (tipo_material === 'Audio') {
          if (fields['300'] && fields['300'][0]) {
            const sub = parseMrcSubfields(fields['300'][0]);
            formato_audio = cleanPunctuation(sub['a']?.[0]);
            detalles_reproduccion = cleanPunctuation(sub['b']?.[0]);
          }
          if (fields['306'] && fields['306'][0]) {
            duracion = cleanPunctuation(fields['306'][0]);
          } else if (fields['300'] && fields['300'][0]) {
            const aVal = parseMrcSubfields(fields['300'][0])['a']?.[0];
            const match = aVal?.match(/\(([^)]+)\)/);
            if (match) {
              duracion = match[1];
            }
          }
        }

        let instrumentacion: string | undefined = undefined;
        let clave_tono: string | undefined = undefined;
        if (tipo_material === 'Partituras') {
          if (fields['240'] && fields['240'][0]) {
            const sub = parseMrcSubfields(fields['240'][0]);
            instrumentacion = cleanPunctuation(sub['m']?.[0]);
            clave_tono = cleanPunctuation(sub['r']?.[0]);
          }
          if (!instrumentacion && fields['382'] && fields['382'][0]) {
            const sub = parseMrcSubfields(fields['382'][0]);
            instrumentacion = cleanPunctuation(sub['a']?.[0]);
          }
        }

        let formato_video: string | undefined = undefined;
        let sistema_grabacion: string | undefined = undefined;
        if (tipo_material === 'Video') {
          if (fields['300'] && fields['300'][0]) {
            const sub = parseMrcSubfields(fields['300'][0]);
            formato_video = cleanPunctuation(sub['a']?.[0]);
            sistema_grabacion = cleanPunctuation(sub['b']?.[0]);
          }
          if (fields['306'] && fields['306'][0]) {
            duracion = cleanPunctuation(fields['306'][0]);
          } else if (fields['300'] && fields['300'][0]) {
            const aVal = parseMrcSubfields(fields['300'][0])['a']?.[0];
            const match = aVal?.match(/\(([^)]+)\)/);
            if (match) {
              duracion = match[1];
            }
          }
        }

        let descripcion_objeto: string | undefined = undefined;
        let dimensiones_3d: string | undefined = undefined;
        if (tipo_material === 'Objetos') {
          if (fields['300'] && fields['300'][0]) {
            const sub = parseMrcSubfields(fields['300'][0]);
            descripcion_objeto = cleanPunctuation(sub['a']?.[0]) || cleanPunctuation(sub['b']?.[0]);
            dimensiones_3d = cleanPunctuation(sub['c']?.[0]);
          }
        }
        
        // Notas (rango 500-599, específicamente 500, 504, 520)
        const notasList: string[] = [];
        const noteTags = ['500', '504', '520'];
        for (const tag of noteTags) {
          if (fields[tag]) {
            for (const val of fields[tag]) {
              const sub = parseMrcSubfields(val);
              const subfieldValues = Object.entries(sub)
                .filter(([k]) => k !== '_raw')
                .map(([_, v]) => cleanPunctuation(v?.[0]))
                .filter(Boolean) as string[];
              
              const parsedNote = subfieldValues.length > 0 ? subfieldValues.join(' ') : (cleanPunctuation(sub['_raw']?.[0]) || '');
              if (parsedNote) {
                notasList.push(parsedNote);
              }
            }
          }
        }

        // Contenidos (MARC 505)
        const contenidoList: string[] = [];
        if (fields['505']) {
          for (const val of fields['505']) {
            const sub = parseMrcSubfields(val);
            const subfieldValues = Object.entries(sub)
              .filter(([k]) => k !== '_raw')
              .map(([_, v]) => cleanPunctuation(v?.[0]))
              .filter(Boolean) as string[];
            
            const parsedContent = subfieldValues.length > 0 ? subfieldValues.join(' ; ') : (cleanPunctuation(sub['_raw']?.[0]) || '');
            if (parsedContent) {
              contenidoList.push(parsedContent);
            }
          }
        }
        
        // Temas / Descriptores (MARC 650, 600, 610, 651)
        const temasList: string[] = [];
        const subjectTags = ['650', '600', '610', '651'];
        for (const tag of subjectTags) {
          if (fields[tag]) {
            for (const val of fields[tag]) {
              const sub = parseMrcSubfields(val);
              const name = sub['a']?.[0];
              if (name) {
                temasList.push(name.toUpperCase());
              }
            }
          }
        }

        // URL / Recurso Electrónico (MARC 856)
        let url_recurso: string | undefined = undefined;
        if (fields['856'] && fields['856'][0]) {
          const sub = parseMrcSubfields(fields['856'][0]);
          if (sub['u']?.[0]) {
            url_recurso = sub['u'][0].trim();
          } else {
            const rawVal = sub['_raw']?.[0] || fields['856'][0];
            const urlMatch = rawVal.match(/https?:\/\/[^\s^]+/);
            if (urlMatch) {
              url_recurso = urlMatch[0];
            }
          }
        }
        
        // Mapeo de inventario y existencias (952 específico de Koha o respaldo estándar 852)
        const ejemplares: Ejemplar[] = [];
        if (fields['952'] && fields['952'].length > 0) {
          for (const rawField of fields['952']) {
            const subs = parseMrcSubfields(rawField);
            const inventario = subs['p']?.[0]?.trim();
            const signatura = subs['o']?.[0]?.trim();
            const ubicacionSub = subs['c']?.[0]?.trim();
            
            if (inventario) {
              let finalInventario = inventario;
              if (/^\d+$/.test(finalInventario)) {
                const num = parseInt(finalInventario, 10);
                finalInventario = String(num).padStart(4, '0');
              }
              
              const parts: string[] = [];
              if (ubicacionSub) parts.push(cleanPunctuation(ubicacionSub) || '');
              if (signatura) parts.push(cleanPunctuation(signatura) || '');
              const ubicacion = parts.filter(Boolean).join(' - ').trim();
              
              ejemplares.push({
                inventario: finalInventario,
                estado: EstadoRecurso.DISPONIBLE,
                ubicacion: ubicacion || undefined
              });
            }
          }
        }
        
        // Respaldo al estándar 852 o 859 (Aguapey)
        if (ejemplares.length === 0 && fields['859'] && fields['859'].length > 0) {
          for (const rawField of fields['859']) {
            const subs = parseMrcSubfields(rawField);
            const inventario = subs['a']?.[0]?.trim();
            const signatureLocation = cleanPunctuation(subs['l']?.[0]);
            const signatureClass = cleanPunctuation(subs['m']?.[0]);
            const signatureAuthor = cleanPunctuation(subs['n']?.[0]);
            const signatureVolume = cleanPunctuation(subs['c']?.[0]);
            
            if (inventario) {
              let finalInventario = inventario;
              if (/^\d+$/.test(finalInventario)) {
                const num = parseInt(finalInventario, 10);
                finalInventario = String(num).padStart(4, '0');
              }
              
              const parts: string[] = [];
              if (signatureLocation) parts.push(signatureLocation);
              if (signatureClass) parts.push(signatureClass);
              if (signatureAuthor) parts.push(signatureAuthor);
              if (signatureVolume) parts.push(signatureVolume);
              const ubicacion = parts.join(' ').trim();
              
              ejemplares.push({
                inventario: finalInventario,
                estado: EstadoRecurso.DISPONIBLE,
                ubicacion: ubicacion || undefined
              });
            }
          }
        } else if (ejemplares.length === 0 && fields['852'] && fields['852'].length > 0) {
          for (const rawField of fields['852']) {
            const subs = parseMrcSubfields(rawField);
            const inventario = subs['p']?.[0]?.trim() || subs['j']?.[0]?.trim();
            const callNumber = [subs['h']?.[0]?.trim(), subs['i']?.[0]?.trim()].filter(Boolean).map(x => cleanPunctuation(x)).filter(Boolean).join(' ');
            const ubicacionSub = subs['c']?.[0]?.trim();
            
            if (inventario) {
              let finalInventario = inventario;
              if (/^\d+$/.test(finalInventario)) {
                const num = parseInt(finalInventario, 10);
                finalInventario = String(num).padStart(4, '0');
              }
              
              const parts: string[] = [];
              if (ubicacionSub) parts.push(cleanPunctuation(ubicacionSub) || '');
              if (callNumber) parts.push(callNumber);
              const ubicacion = parts.filter(Boolean).join(' - ').trim();
              
              ejemplares.push({
                inventario: finalInventario,
                estado: EstadoRecurso.DISPONIBLE,
                ubicacion: ubicacion || undefined
              });
            }
          }
        }
        
        if (ejemplares.length === 0) {
          errors.push(`Registro #${recordsCount} ("${titulo}"): No se detectaron ejemplares asociados (etiquetas 952 u 852 ausentes o incompletas).`);
        }
        
        const nuevoRecurso: Omit<Recurso, 'id'> = {
          tipo_material,
          titulo,
          variante_titulo,
          titulo_clave,
          responsabilidad_principal,
          responsabilidad_secundaria,
          lugar_publicacion,
          editor,
          fecha,
          edicion,
          extension: paginas,
          otros_detalles_fisicos,
          dimensiones,
          material_complementario,
          coleccion: coleccionesList,
          numero_normalizado: [...isbnList, ...issnList],
          frecuencia,
          volumen_numero,
          existencias,
          escala,
          proyeccion,
          coordenadas,
          soporte_fisico,
          color,
          formato_audio,
          duracion,
          detalles_reproduccion,
          instrumentacion,
          clave_tono,
          formato_video,
          sistema_grabacion,
          descripcion_objeto,
          dimensiones_3d,
          notas: notasList,
          contenido: contenidoList,
          temas: Array.from(new Set(temasList)),
          url_recurso,
          ejemplares
        };
        
        recordsToImport.push(nuevoRecurso);
        
      } catch (err: any) {
        errors.push(`Error al decodificar registro #${recordsCount}: ${err.message || err}`);
        console.error(`Error decoding record #${recordsCount}:`, err);
      }
    }
    
    // 3. Importación por lotes en el localStorage del sistema con devolución de llamada onProgress
    const totalRecordsToImport = recordsToImport.length;
    for (let i = 0; i < totalRecordsToImport; i++) {
      try {
        await dbService.crearRecurso(recordsToImport[i]);
        importedCount++;
        
        if (onProgress && i % 5 === 0) {
          onProgress(i + 1, totalRecordsToImport);
        }
      } catch (e: any) {
        errors.push(`Error al guardar en base de datos el registro #${i + 1} ("${recordsToImport[i].titulo}"): ${e.message || e}`);
        console.error("Failed to insert book to localStorage db:", e);
      }
    }
    
    if (onProgress) {
      onProgress(totalRecordsToImport, totalRecordsToImport);
    }
    
    return {
      recordsImported: importedCount,
      recordsSkippedOrError: recordsCount - importedCount,
      totalRecordsFound: recordsCount,
      errors
    };
  }
};
