# Publicación del sitio de la Jornada UVP

Sigue estos pasos en orden. Cada paso dice dónde se hace y qué debe verse al terminar.

## Archivos del repositorio

| Archivo o carpeta | Para qué sirve |
|---|---|
| `index.html` | Sitio público completo (estilos y scripts incluidos). Va en la raíz. |
| `admin.html` | Panel de coordinación: cupos, códigos, QR, validación y ZIP de constancias. Protegido con clave. |
| `catalog.json` | Oferta, calendario, opciones del formulario y preguntas frecuentes. |
| `assets/img/` | Logotipo UVP y representación 3D del edificio Teocalli. |
| `constancias/` | Plantillas oficiales de CURSO y TALLER y el generador de PDF. |
| `Code.gs` | Código de Apps Script. Se pega en la hoja de cálculo; no se ejecuta desde GitHub. |
| `.nojekyll` | Indica a GitHub Pages que publique todo tal cual. No borrar. |
| `.gitignore` | Evita subir material privado por accidente. |

**No subas al repositorio:** el Excel de planeación, el ZIP de recursos ni la carpeta `constancias-PRIVADO` (contiene los códigos de acceso). Ya están fuera de la carpeta `sitio-jornada`.

---

## Paso 1. Subir el sitio a GitHub

1. Entra a <https://github.com/new> con la cuenta de `coord.formaciondocente@uvp.mx`.
2. Nombre del repositorio: por ejemplo `jornada-uvp`. Visibilidad: **Public** (GitHub Pages gratuito solo publica repositorios públicos). No marques "Add a README".
3. Pulsa **Create repository** y copia la dirección que termina en `.git`.
4. En PowerShell, dentro de la carpeta `sitio-jornada` (el repositorio local ya está creado y con el primer commit):

```powershell
git remote add origin https://github.com/TU_USUARIO/jornada-uvp.git
git push -u origin main
```

La primera vez se abre una ventana para iniciar sesión en GitHub; inicia sesión ahí.

5. En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
6. Espera uno o dos minutos. La dirección queda como `https://TU_USUARIO.github.io/jornada-uvp/`.

Resultado esperado: el sitio abre en esa dirección y el contador muestra cifras.

## Paso 2. Preparar la hoja de cálculo

1. Abre la hoja de cálculo de Google ligada al proyecto actual (la misma de la implementación que ya existe).
2. Si todavía no existe: sube el Excel a Drive, **Archivo → Guardar como Hojas de cálculo de Google**, y desde ahí **Extensiones → Apps Script**.
3. En Apps Script, **Configuración del proyecto** (engrane): zona horaria `America/Mexico_City`.

## Paso 3. Pegar el código nuevo y publicar una versión

1. En el editor de Apps Script borra todo y pega el contenido de `Code.gs`.
2. En la línea `const SITE_URL = "PEGA_AQUI_LA_URL_DE_GITHUB_PAGES";` escribe la dirección del Paso 1 (por ejemplo `https://TU_USUARIO.github.io/jornada-uvp/`). Se usa en los correos y en los enlaces QR.
3. Guarda. Elige la función **`authorizeServices`** y pulsa **Ejecutar**. Autoriza hoja y correo. Si aparece "Google no verificó esta app", entra en **Configuración avanzada → Ir a … (no seguro)**: es tu propio script.
4. **Implementar → Administrar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar.** Así la URL `/exec` no cambia y no hay que tocar `index.html`.
   - **Ejecutar como:** tu cuenta. **Quién tiene acceso:** **Cualquier usuario**. Con "Solo yo" el sitio no puede leer ni escribir y no aparece ningún error visible.
   - **Cada vez que cambies `Code.gs` hay que publicar una nueva versión.** Si no, sigue corriendo el código anterior aunque el editor muestre el nuevo.
5. Si creaste una implementación nueva (URL distinta), reemplaza `API_URL` al inicio del script en `index.html` **y** en `admin.html`, y vuelve a subir a GitHub (Paso 9).

Resultado esperado: la hoja tiene las pestañas `Inscripciones`, `Códigos de constancia` y `Constancias`, y al recargarla aparece el menú **Jornada UVP**.

## Paso 4. Clave del panel administrativo

1. En la hoja: **Jornada UVP → Configurar clave del panel administrativo**.
2. Escribe una clave de al menos 10 caracteres y compártela solo con coordinación. Se guarda en las propiedades del script, nunca en GitHub.
3. Abre `https://TU_USUARIO.github.io/jornada-uvp/admin.html` y entra con esa clave.

Tras 8 intentos fallidos el panel se bloquea 15 minutos.

## Paso 5. Cargar los códigos de constancia

Elige una opción:

- **A. Usar los códigos ya generados:** abre `constancias-PRIVADO/codigos_constancias.csv`, copia las filas (sin encabezado) y pégalas como valores en `Códigos de constancia` desde A2.
- **B. Generarlos solos:** en la hoja, **Jornada UVP → Crear códigos para sesiones sin código**. Calcula las horas desde el horario; revísalas.

Después:

1. Revisa la columna **Horas** de cada fila. Define la plantilla: 2 h = CURSO, 3 h = TALLER, 4 a 12 h = CURSO. Las filas con `REVISIÓN` (autogestivos sin horas) no emiten constancia hasta que les pongas horas.
2. **Inicio** y **Cierre** vacíos = el código funciona sin límite de fechas. Para limitarlo, escribe fecha y hora (o hazlo desde el panel, pestaña Códigos).
3. **Jornada UVP → Escribir enlaces QR de cada código** agrega el enlace que debe ir en el QR del curso. Desde el panel, botón **QR**, se imprime una hoja con el QR y el código grandes.

## Paso 5 bis. Enlaces de Zoom de las sesiones virtuales

1. Al ejecutar `authorizeServices` se crea la pestaña **Enlaces Zoom** con una fila por sesión virtual.
2. Pega en la columna **Enlace de Zoom** el enlace completo (`https://…zoom.us/j/…`) y, si quieres, el ID y el código de acceso.
3. Desde ese momento, cada correo de confirmación incluye el botón **Entrar a Zoom** de las sesiones virtuales que eligió la persona. Si todavía no hay enlace, el correo avisa que llegará después.
4. Para quienes se inscribieron antes de que cargaras el enlace: **Jornada UVP → Enviar enlaces de Zoom pendientes**, o una sola vez **Jornada UVP → Activar envío diario de enlaces de Zoom (7:00)** para que se manden solos cada mañana.
5. La pestaña **Envíos Zoom** registra qué enlace se mandó a quién; nunca se envía dos veces el mismo.

Los enlaces de Zoom no se publican en la página, solo viajan por correo a los inscritos.

**Remitente:** los correos salen de la cuenta que publicó la implementación. Para que salgan de `coord.formaciondocente@uvp.mx`, el script debe crearse y publicarse con esa cuenta. Si se ejecuta con otra, el registro de ejecución de `authorizeServices` lo avisa; las respuestas siempre llegan a `coord.formaciondocente@uvp.mx`. Límite de Google Workspace: unos 1,500 correos al día.

## Paso 6. Periodo general de constancias

Además del periodo de cada código hay un periodo general en `Code.gs`: `CERT_OPEN` y `CERT_CLOSE`. Vacíos = abierto siempre. Formato: `2027-01-16T09:00:00-06:00`. Si los cambias, publica una nueva versión (Paso 3.4). El botón **Descargar constancia** del sitio se habilita o deshabilita solo según este periodo.

## Paso 7. Flujo de constancias (qué hace cada quien)

1. **Al final del curso**, el facilitador proyecta el QR del código (o dicta el código). El QR abre el sitio con el código ya escrito.
2. **El docente** registra su participación: código → nombre, correo y clave → recibe un **folio** (`JFSD27-XXXXXXXX`). Queda en estatus **Pendiente de validación**.
3. **Coordinación** cruza contra la lista de asistencia por QR y la evaluación final, y en el panel (pestaña Constancias):
   - filtra por curso, selecciona y pulsa **Autorizar selección** (con "Enviar aviso por correo" marcado), o
   - en la hoja cambia el estatus a **Asistencia y evaluación validadas** y usa **Jornada UVP → Autorizar filas validadas**.
4. **El docente** recibe el correo "Tu constancia está lista", entra a **Descargar constancia** con clave, código y correo, y se descarga el PDF con la plantilla correcta y su folio.
5. **Cualquiera** puede comprobar una constancia en el sitio con **Verificar un folio** (o en `…/?verificar=FOLIO`).

Controles que ya trae:

- Un registro por docente y curso (misma clave + mismo código). Los reenvíos y dobles clics no duplican.
- Códigos incorrectos, desactivados o fuera de fecha se rechazan con un mensaje claro.
- **Corregir nombre** en el panel: la siguiente descarga sale corregida y el cambio queda en **Historial**.
- Columnas de trazabilidad: Fecha de registro, Fecha de emisión, Descargas, Última descarga, Aviso enviado e Historial (autorizaciones, correcciones y reimpresiones con fecha y hora).
- **Descargar ZIP del curso**: todas las constancias autorizadas de un curso en un archivo.
- **Descargar registros (CSV)**: se abre en Excel. La hoja de Google es la base central y Excel es solo para consulta.

## Paso 8. Probar todo desde el enlace publicado

Prueba siempre desde `https://TU_USUARIO.github.io/...`, no desde el archivo local: es la única prueba que usa el camino real hacia Apps Script.

1. **Contador:** "Docentes inscritos" y "Lugares disponibles" cargan y el punto verde dice "Actualizado en vivo".
2. **Inscripción:** agrega 3 sesiones (desde la agenda o la oferta), llena el formulario con un correo `@uvp.mx` de prueba. Debe salir el aviso de constancia, luego la confirmación, el correo y la fila en `Inscripciones`. El cupo de esas sesiones baja en todas las secciones.
3. **Constancia:** en el panel activa un código, regístrate con él desde el sitio, autoriza en el panel, revisa el correo y descarga el PDF. Verifica el folio.
4. **ZIP:** en el panel elige ese curso y descarga el ZIP.

Borra las filas de prueba de `Inscripciones` y `Constancias` antes de abrir el registro.

## Paso 9. Publicar cambios futuros

Después de editar cualquier archivo de `sitio-jornada`:

```powershell
git add -A
git commit -m "Describe el cambio"
git push
```

GitHub Pages tarda uno o dos minutos. Recarga sin caché (Ctrl + F5).

---

## Ajustes frecuentes

| Quiero… | Dónde se cambia |
|---|---|
| Cerrar inscripciones a cursos | `Code.gs`: `REGISTRATION_OPEN = false` y nueva versión |
| Desactivar un código | Panel → Códigos → interruptor **Activo** → Guardar (o `Activo = NO` en la hoja) |
| Cambiar el periodo de un código | Panel → Códigos → Inicio / Cierre → Guardar |
| Invalidar un código que se filtró | Panel → Códigos → **Regenerar** (los registros previos se conservan) |
| Crear un código para un curso extra | Panel → Códigos → "Crear un código manual" |
| Cambiar la regla CURSO / TALLER | `Code.gs`: función `clasificarHoras` |
| Reemplazar una plantilla de constancia | Sustituye el PDF en `constancias/` con el mismo nombre |
| Mover el texto de la constancia | `constancias/generador.js`: objeto `POSICION` |
| Agregar o quitar una sesión | `catalog.json` (`sessions` y el curso en `courses`) **y** `SESSION_ROWS` en `Code.gs`; nueva versión |
| Cambiar los cursos del carrusel | `index.html`: constante `FEATURED` (claves de curso) |
| Ajustar los niveles del mapa del Teocalli | `index.html`: constante `TEOCALLI_LEVELS` |
| Cada cuánto se actualizan los cupos | `index.html`: `STATS_REFRESH_MS` (20 s) |
| Texto del aviso previo a la inscripción | `index.html`: diálogo `noticeDialog` |
| Correo de contacto | `index.html`, `catalog.json` y `CONTACT_EMAIL` en `Code.gs` |

## Cómo se evita el sobrecupo

Cada inscripción entra con un candado (`LockService`): mientras una persona se guarda, la siguiente espera. Antes de escribir, el servidor vuelve a contar los lugares; si una sesión se llenó en ese instante, rechaza solo esa, el sitio la quita de la selección y avisa. Las cifras públicas se guardan en caché 15 s y se borran con cada inscripción, así que todas las secciones (carrusel, agenda, oferta y contadores) muestran lo mismo.

## Privacidad

- La URL de Apps Script solo permite escribir filas y leer cifras agregadas. No guardes ahí contraseñas.
- El panel solo responde con la clave correcta y solo a páginas publicadas en `github.io` o a `localhost`.
- Nunca publiques la hoja de cálculo: quien tenga acceso ve nombres, correos y claves docentes.
- Los datos personales viajan por POST y nunca aparecen en la URL.
- La clave docente y el correo los declara quien llena el formulario; el sistema no autentica identidad. Por eso la validación de asistencia por coordinación es obligatoria antes de autorizar.
