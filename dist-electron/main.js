// electron/main.ts
import { app, BrowserWindow, ipcMain, dialog, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function createWindow() {
  const iconPath = path.join(__dirname, "../assets/icon.png");
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Auralib",
    icon: fs.existsSync(iconPath) ? iconPath : void 0,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, "../dist/index.html"));
}
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  ipcMain.handle("select-directory", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"]
    });
    if (canceled) {
      return null;
    }
    return filePaths[0];
  });
  ipcMain.handle("get-user-photo", async (event, folderPath, dni) => {
    try {
      if (!folderPath || !dni) return null;
      const normalizedFolder = path.normalize(folderPath.trim());
      if (!fs.existsSync(normalizedFolder)) return null;
      const rawDni = String(dni).trim();
      const cleanDni = rawDni.replace(/[^a-zA-Z0-9]/g, "");
      const noSpacesDni = rawDni.replace(/\s+/g, "");
      const candidates = Array.from(/* @__PURE__ */ new Set([rawDni, cleanDni, noSpacesDni])).filter(Boolean);
      const files = await fs.promises.readdir(normalizedFolder);
      const extensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
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
              const mime = extName === "jpg" ? "jpeg" : extName;
              return `data:image/${mime};base64,${data.toString("base64")}`;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error al leer foto del usuario desde el directorio local:", error);
    }
    return null;
  });
  ipcMain.handle("get-registro-imagen", async (event, folderPath, params) => {
    try {
      if (!folderPath || !params) return null;
      const normalizedFolder = path.normalize(folderPath.trim());
      if (!fs.existsSync(normalizedFolder)) return null;
      const { inventarios = [] } = params;
      const candidates = [];
      for (const inv of inventarios) {
        if (inv && inv.trim()) {
          const rawInv = inv.trim();
          candidates.push(rawInv);
          const cleaned = rawInv.replace(/[^a-zA-Z0-9]/g, "");
          if (cleaned && cleaned !== rawInv) {
            candidates.push(cleaned);
          }
          const withoutLeadingZeros = rawInv.replace(/^0+/, "");
          if (withoutLeadingZeros && withoutLeadingZeros !== rawInv) {
            candidates.push(withoutLeadingZeros);
          }
        }
      }
      const uniqueCandidates = Array.from(new Set(candidates)).filter(Boolean);
      const files = await fs.promises.readdir(normalizedFolder);
      const extensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
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
              const mime = extName === "jpg" ? "jpeg" : extName;
              return `data:image/${mime};base64,${data.toString("base64")}`;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error al leer imagen del registro desde el directorio local:", error);
    }
    return null;
  });
  ipcMain.handle("save-backup-file", async (event, params) => {
    try {
      if (!params || !params.folderPath || !params.filename) {
        return { success: false, error: "Par\xE1metros inv\xE1lidos" };
      }
      const normalizedFolder = path.normalize(params.folderPath.trim());
      if (!fs.existsSync(normalizedFolder)) {
        await fs.promises.mkdir(normalizedFolder, { recursive: true });
      }
      const fullPath = path.join(normalizedFolder, params.filename);
      await fs.promises.writeFile(fullPath, params.content, "utf-8");
      return { success: true, fullPath };
    } catch (error) {
      console.error("Error al guardar archivo de respaldo autom\xE1tico:", error);
      return { success: false, error: error.message || "Error desconocido" };
    }
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
