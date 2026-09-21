# Auralib - Sistema de Gestión Bibliotecaria

**Auralib** es una plataforma moderna, ágil e intuitiva diseñada para la gestión integral de bibliotecas pequeñas y medianas (escolares, públicas, institucionales). Ofrece un control eficiente del fondo bibliográfico, gestión de usuarios, préstamos, devoluciones, estadísticas e importación masiva de catálogos compatibles con formatos estándar como MARC21 / ISO 2709 (Aguapey, Koha) y CSV.

---

## 📌 Propósito

El objetivo principal de **Auralib** es simplificar la labor cotidiana del bibliotecario mediante una interfaz clara, rápida y sin distracciones. Permite automatizar la circulación de material, llevar un registro detallado de inventario y generar diagnósticos estadísticos del catálogo en tiempo real. No se trata de un OPAC de consulta para usuarios, sino de un software especializado, desarrollado por y para bibliotecarios.

---

## ✨ Funcionalidades principales

- **Inicio:** panel general con métricas de recursos, ejemplares, préstamos y usuarios.
- **Circulación:** registro ágil de préstamos, devoluciones y seguimiento de morosos.
- **Catálogo:** gestión de recursos, ejemplares, inventario, estados y metadatos bibliográficos.
- **Usuarios:** registro de socios, datos de contacto, estados activos/baja y historial de préstamos.
- **Estadísticas:** indicadores de circulación y uso del sistema.
- **Importación, respaldos y configuración:** carga masiva desde CSV, migración desde Aguapey/Koha, backups JSON y ajustes básicos del sistema.

---

## 🛠️ Tecnologías utilizadas

- **Frontend:** React 18, TypeScript, Tailwind CSS.
- **Iconos:** Lucide React.
- **Empaquetador & Servidor:** Vite.
- **Compatibilidad Desktop:** Preparado para distribución mediante Electron.

---

## 🚀 Instalación y ejecución local

Requisitos: Node.js 18+ y npm o yarn.

```bash
git clone <URL_DEL_REPOSITORIO>
cd auralib
npm install
npm run dev
```

La app quedará disponible en `http://localhost:3000`.

---

## ✍️ Créditos

Desarrollado por Facundo Belascoain Kirby para brindar una solución libre, potente y amigable a las bibliotecas.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **GNU General Public License v3.0 (GPL-3.0)**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---
*Auralib — Sistema de Gestión Bibliotecaria.*