import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Auralib',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Elimina la barra de menú predeterminada de Electron para esta ventana (Windows/Linux)
  win.setMenu(null);

  // Como usamos Vite, el frontend compilado se encuentra en dist/
  win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(() => {
  // Desactiva el menú global de la aplicación (incluyendo macOS si se prefiere una interfaz limpia)
  Menu.setApplicationMenu(null);

  createWindow();

  // Selección de ruta mediante ventana de diálogo
  ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (canceled) {
      return null;
    }
    return filePaths[0];
  });

  // Lector de fotos
  ipcMain.handle('get-user-photo', async (event, folderPath, dni) => {
    try {
      if (!folderPath || !dni) return null;
      const normalizedFolder = path.normalize(folderPath.trim());
      if (!fs.existsSync(normalizedFolder)) return null;

      const rawDni = String(dni).trim();
      const cleanDni = rawDni.replace(/[^a-zA-Z0-9]/g, ''); // solo caracteres alfanuméricos (sin puntos, guiones ni espacios)
      const noSpacesDni = rawDni.replace(/\s+/g, '');

      const candidates = Array.from(new Set([rawDni, cleanDni, noSpacesDni])).filter(Boolean);
      const files = await fs.promises.readdir(normalizedFolder);
      const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

      for (const candidate of candidates) {
        const candidateLower = candidate.toLowerCase();
        for (const file of files) {
          const fileExt = path.extname(file).toLowerCase();
          if (extensions.includes(fileExt)) {
            const fileNameWithoutExt = path.basename(file, path.extname(file)).toLowerCase().trim();
            if (fileNameWithoutExt === candidateLower) {
              const fullPath = path.join(normalizedFolder, file);
              const data = await fs.promises.readFile(fullPath);
              const extName = fileExt.substring(1);
              const mime = extName === 'jpg' ? 'jpeg' : extName;
              return `data:image/${mime};base64,${data.toString('base64')}`;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error al leer foto del usuario desde el directorio local:', error);
    }
    return null;
  });

  // Lector de imágenes de registro
  ipcMain.handle('get-registro-imagen', async (event, folderPath, params: { inventarios?: string[] }) => {
    try {
      if (!folderPath || !params) return null;
      const normalizedFolder = path.normalize(folderPath.trim());
      if (!fs.existsSync(normalizedFolder)) return null;

      const { inventarios = [] } = params;
      const candidates: string[] = [];

      // Candidatos por números de inventario
      for (const inv of inventarios) {
        if (inv && inv.trim()) {
          const rawInv = inv.trim();
          candidates.push(rawInv);
          
          // También probar con el número de inventario limpio (por ejemplo, sin caracteres no alfanuméricos)
          const cleaned = rawInv.replace(/[^a-zA-Z0-9]/g, '');
          if (cleaned && cleaned !== rawInv) {
            candidates.push(cleaned);
          }
          
          // Probar sin ceros a la izquierda (por ejemplo, "0001" -> "1")
          const withoutLeadingZeros = rawInv.replace(/^0+/, '');
          if (withoutLeadingZeros && withoutLeadingZeros !== rawInv) {
            candidates.push(withoutLeadingZeros);
          }
        }
      }

      const uniqueCandidates = Array.from(new Set(candidates)).filter(Boolean);
      const files = await fs.promises.readdir(normalizedFolder);
      const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

      for (const candidate of uniqueCandidates) {
        const candidateLower = candidate.toLowerCase();
        for (const file of files) {
          const fileExt = path.extname(file).toLowerCase();
          if (extensions.includes(fileExt)) {
            const fileNameWithoutExt = path.basename(file, path.extname(file)).toLowerCase().trim();
            if (fileNameWithoutExt === candidateLower) {
              const fullPath = path.join(normalizedFolder, file);
              const data = await fs.promises.readFile(fullPath);
              const extName = fileExt.substring(1);
              const mime = extName === 'jpg' ? 'jpeg' : extName;
              return `data:image/${mime};base64,${data.toString('base64')}`;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error al leer imagen del registro desde el directorio local:', error);
    }
    return null;
  });

  // Guardar archivo de backup automático
  ipcMain.handle('save-backup-file', async (event, params: { folderPath: string; filename: string; content: string }) => {
    try {
      if (!params || !params.folderPath || !params.filename) {
        return { success: false, error: 'Parámetros inválidos' };
      }
      const normalizedFolder = path.normalize(params.folderPath.trim());
      if (!fs.existsSync(normalizedFolder)) {
        await fs.promises.mkdir(normalizedFolder, { recursive: true });
      }
      const fullPath = path.join(normalizedFolder, params.filename);
      await fs.promises.writeFile(fullPath, params.content, 'utf-8');
      return { success: true, fullPath };
    } catch (error: any) {
      console.error('Error al guardar archivo de respaldo automático:', error);
      return { success: false, error: error.message || 'Error desconocido' };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
