# Directiva de Privacidad de Auralib (Privacy Policy)

**Última actualización:** 31 de octubre de 2026

**Auralib** es un software de código abierto desarrollado por **Facundo Belascoain Kirby** (`facundo.belascoain@gmail.com`), disponible en [https://github.com/shaku90/Auralib](https://github.com/shaku90/Auralib).

Esta directiva de privacidad describe cómo **Auralib** gestiona la información y garantiza la total privacidad y soberanía de los datos de los usuarios y de las instituciones que utilizan la aplicación.

---

## 1. Principio fundamental: Arquitectura local ("Local-First")

Auralib está diseñado bajo el principio de **privacidad por diseño**:
- **Todos los datos permanecen exclusivamente en el dispositivo del usuario.**
- La aplicación **NO recopila, NO almacena en servidores externos, NO transmite ni vende ningún tipo de información personal, bibliográfica o de uso.**
- La aplicación funciona de manera completamente independiente y autónoma sin necesidad de conexión a internet para sus operaciones de gestión.

---

## 2. Información gestionada dentro de la aplicación

La información que el bibliotecario o administrador registra en Auralib (tales como nombres de usuarios de la biblioteca, números de documento/DNI, registros de catálogo bibliográfico, inventarios y préstamos) se almacena **únicamente de forma local** en el almacenamiento del navegador/dispositivo donde está instalada la aplicación (mediante `localStorage` y archivos de respaldo generados localmente).

Ni el desarrollador de Auralib ni terceros tienen acceso en ningún momento a los registros cargados en la base de datos de la biblioteca.

---

## 3. Telemetría, analíticas y publicidad

- **Sin telemetría ni seguimiento:** Auralib no incluye herramientas de seguimiento, rastreadores de comportamiento, analíticas remotas ni telemetría oculta.
- **Sin publicidad:** La aplicación es completamente libre de anuncios comerciales y de redes de monetización publicitaria.
- **Sin cookies de rastreo:** No se utilizan cookies ni identificadores publicitarios.

---

## 4. Permisos del sistema y acceso a archivos

Auralib solo solicita acceso a funciones del sistema operativo en los siguientes casos de interacción directa y explícita del usuario:
- **Importación y exportación de archivos:** Cuando el usuario decide voluntariamente importar catálogos (archivos CSV, ISO 2709 / MARC21) o exportar copias de seguridad (archivos JSON o MARCXML), o configurar una carpeta para respaldos automáticos en la versión de escritorio. Estos archivos se procesan localmente en el equipo y nunca se envían a servidores externos.
- **Enlaces externos:** Si el usuario pulsa un enlace hacia recursos externos o páginas web catalogadas, este se abre en el navegador predeterminado del sistema operativo, sujeto a las políticas de privacidad de dicho sitio web.

---

## 5. Control, retención y eliminación de datos

El usuario tiene el control total sobre la información:
- **Exportación:** Los datos pueden ser exportados íntegramente en cualquier momento en formatos abiertos (JSON, MARCXML).
- **Eliminación definitiva:** El usuario puede eliminar registros individuales o restablecer/vaciar la totalidad de la base de datos directamente desde el menú *Configuración > Datos de demostración y prueba > Borrar todo y empezar desde cero*. Al desinstalar la aplicación o limpiar los datos del sistema, la información local se elimina de manera permanente.

---

## 6. Privacidad de menores

Dado que Auralib puede ser utilizado en bibliotecas escolares o educativas que registran a alumnos y menores de edad, reiteramos que **ningún dato de menores es transmitido fuera del equipo local**, garantizando el cumplimiento de normativas de protección de datos (como COPPA y RGPD).

---

## 7. Cambios a esta directiva de privacidad

Cualquier actualización futura de esta directiva será publicada en este mismo documento dentro del repositorio oficial del proyecto. Las modificaciones mantendrán siempre el compromiso de proteger la privacidad del usuario.

---

## 8. Contacto

Si tienes alguna pregunta, duda o consulta sobre esta directiva de privacidad o sobre el tratamiento de datos en Auralib, puedes comunicarte directamente con el desarrollador:

- **Desarrollador:** Facundo Belascoain Kirby
- **Correo electrónico:** [facundo.belascoain@gmail.com](mailto:facundo.belascoain@gmail.com)
- **Repositorio oficial:** [https://github.com/shaku90/Auralib](https://github.com/shaku90/Auralib)
