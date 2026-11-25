/**
 * Jornada de Formación y Superación Docente · UVP
 * Apps Script ligado a la hoja de cálculo de la jornada.
 *
 * Pestañas que crea y usa:
 *   Inscripciones          · registro de docentes y sesiones elegidas
 *   Códigos de constancia  · panel de códigos (uno por sesión), vigencia y estado
 *   Constancias            · registros de participación, estatus, emisión y trazabilidad
 *
 * Después de cada cambio: Implementar → Administrar implementaciones → editar → Nueva versión.
 */

/* ===================== CONFIGURACIÓN ===================== */
const SITE_URL = "PEGA_AQUI_LA_URL_DE_GITHUB_PAGES";      // p. ej. https://usuario.github.io/jornada-uvp/
const CONTACT_EMAIL = "coord.formaciondocente@uvp.mx";
const REGISTRATION_OPEN = true;                            // false = cierra inscripciones a cursos
const MIN_COURSES = 3;
const CERT_OPEN = "";                                      // vacío = sin fecha de apertura. Formato 2027-01-16T09:00:00-06:00
const CERT_CLOSE = "";                                     // vacío = sin fecha de cierre
const FOLIO_PREFIX = "JFSD27";
const TZ = "America/Mexico_City";
const STATS_CACHE_SECONDS = 15;

/* ===================== HOJAS Y ENCABEZADOS ===================== */
const SHEET_NAME = "Inscripciones";
const HEADERS = [
  "Fecha de registro", "Folio", "Nombre completo", "Correo", "Plantel",
  "División o área", "Tipo de personal", "Nivel académico", "Nivel de posgrado",
  "Programa(s)", "Antigüedad UVP", "Clave docente o administrativa",
  "Sesiones (IDs JSON)", "Consentimiento de privacidad"
];
const CODES_SHEET = "Códigos de constancia";
const CODES_HEADERS = ["Código", "Sesión ID", "Curso o taller", "Fecha", "Horario", "Horas", "Clasificación", "Inicio", "Cierre", "Activo"];
const CERT_SHEET = "Constancias";
const CERT_HEADERS = [
  "Fecha de registro", "Folio", "Nombre completo", "Correo institucional", "Clave docente",
  "Código", "Curso o taller", "Fecha de participación", "Horario", "Horas", "Clasificación",
  "Plantilla", "Estatus", "Fecha de emisión", "Observaciones",
  "Descargas", "Última descarga", "Aviso enviado", "Historial"
];
const C = { fecha: 0, folio: 1, nombre: 2, correo: 3, clave: 4, codigo: 5, curso: 6, fechaCurso: 7, horario: 8, horas: 9,
  tipo: 10, plantilla: 11, estatus: 12, emision: 13, obs: 14, descargas: 15, ultima: 16, aviso: 17, historial: 18 };

const CERT_PENDING = "Pendiente de validación";
const CERT_READY = "Asistencia y evaluación validadas";
const CERT_OK = "Autorizada";
const CERT_NO = "No autorizada";
const CERT_STATUSES = [CERT_PENDING, CERT_READY, CERT_OK, CERT_NO];

/* Sesiones publicadas: [id, curso, cupo, fecha, bloque, título, horario, modalidad, aula] */
const SESSION_ROWS = [
  ["D3V-2026-12-21-b1-c3","D3V",50,"2026-12-21",1,"Diseño de instrumentos de evaluación en la era digital, innovación y eficiencia con IA","09:00-12:00","Virtual","ZOOM (no necesitan aula)"],
  ["B4V-2026-12-21-b1-c4","B4V",50,"2026-12-21",1,"Estrategias de ciberseguridad","09:00-12:00","Virtual",""],
  ["PS9P-2026-12-21-b3-c10","PS9P",30,"2026-12-21",3,"¿Cómo ayudar a que el estudiante gestione sus emociones durante la clase desde una perspectiva académica?","15:00-18:00","Presencial","Aula 6003"],
  ["T6P-2026-12-22-b1-c3","T6P",30,"2026-12-22",1,"Realidad extendida y simulación inmersiva en el aula","09:00-12:00","Presencial","Lab. de Comp. 01 Complejo Teocalli"],
  ["D1V-2026-12-22-b2-c7","D1V",50,"2026-12-22",2,"Momentos Clave: Estructurando la evaluación en el aula y estrategias de retroalimentación efectiva","12:00-14:00","Virtual","ZOOM (no necesita aula)"],
  ["P11P-2026-12-28-b1-c3","P11P",30,"2026-12-28",1,"Empoderamiento y autoridad asertiva en el aula","09:00-12:00","Presencial","Aula 6003"],
  ["D2P-2026-12-28-b3-c10","D2P",30,"2026-12-28",3,"Pausas activas y técnicas de mindfulness o atención plena en el aula","15:00-18:00","Presencial","Aula 6003"],
  ["P5V-2026-12-29-b2-c7","P5V",50,"2026-12-29",2,"Diseño de instrumentos inclusivos y retroalimentación efectiva","12:00-14:00","Virtual","ZOOM (no necesita aula)"],
  ["PS10P-2026-12-29-b3-c10","PS10P",30,"2026-12-29",3,"Primeros Auxilios Psicológicos y Gestión de Crisis en el Aula","15:00-18:00","Presencial","Aula 6003"],
  ["F2V-2027-01-04-b2-c7","F2V",50,"2027-01-04",2,"La ética del cuidado en la docencia, humanizando la educación desde la empatía y la coresponsabilidad","12:00-14:00","Virtual","ZOOM (no necesita aula)"],
  ["PS11P-2027-01-04-b3-c10","PS11P",30,"2027-01-04",3,"Salud mental y bienestar digital en el docente: ansiedad, atención y uso de pantallas","15:00-18:00","Presencial","Aula 6003"],
  ["P10P-2027-01-04-b3-c11","P10P",30,"2027-01-04",3,"Metodologías activas en la educación superior: aprendizaje basado en retos, investigación y servicio","15:00-18:00","Presencial","Aula 6004"],
  ["T2P-2027-01-05-b1-c3","T2P",15,"2027-01-05",1,"Introducción a la IA agéntica (AULA MOVIL 6303)","09:00-12:00","Presencial","Aula 6303"],
  ["D4P-2027-01-05-b1-c4","D4P",30,"2027-01-05",1,"Proyectos formativos y retroalimentación efectiva","09:00-12:00","Presencial","Aula 6104"],
  ["P6P-2027-01-05-b1-c5","P6P",20,"2027-01-05",1,"Arte-terapia en el aula: creatividad, expresión y bienestar","09:00-12:00","Presencial","Ágora Teocalli"],
  ["F3V-2027-01-05-b2-c7","F3V",50,"2027-01-05",2,"Dilemas éticos que viven los docentes, dialogos reflexivos para concretar criterios para tomar decisiones","12:00-14:00","Virtual","ZOOM (no necesita aula)"],
  ["T1P-2027-01-05-b3-c10","T1P",30,"2027-01-05",3,"Tecnología para educar, manejo básico de equipos y proyectores","15:00-18:00","Presencial","Lab. de Comp. 01 Complejo Teocalli"],
  ["SO3P-2027-01-05-b3-c11","SO3P",30,"2027-01-05",3,"Prevención del Burnout y Autocuidado: Reflexión entre Pares y Salud Ocupacional Docente","15:00-18:00","Presencial","Aula 6104"],
  ["T2P-2027-01-07-b1-c3","T2P",15,"2027-01-07",1,"Introducción a la IA agéntica (AULA MOVIL 6303)","09:00-12:00","Presencial","Aula 6303"],
  ["D5P-2027-01-07-b1-c4","D5P",30,"2027-01-07",1,"Estrategias didácticas para motivar al estudiante universitario","09:00-12:00","Presencial","Aula 6104"],
  ["P2V-2027-01-07-b1-c5","P2V",50,"2027-01-07",1,"Diseño Universal del Aprendizaje (DUA).","09:00-12:00","Virtual",""],
  ["G1V-2027-01-07-b2-c7","G1V",50,"2027-01-07",2,"Protocolos de atención ante situaciones de género, violencia o discriminación de la UVP","12:00-14:00","Virtual",""],
  ["E8V-2027-01-07-b3-c10","E8V",50,"2027-01-07",3,"Bioinformática aplicada a las ciencias biomédicas","15:00-18:00","Virtual","ZOOM (no necesita aula)"],
  ["F8P-2027-01-08-b1-c3","F8P",30,"2027-01-08",1,"Humanismo y formación integral: el sentido de educar en la universidad","09:00-12:00","Presencial","Aula 6003"],
  ["PS6P-2027-01-08-b1-c5","PS6P",30,"2027-01-08",1,"Laboratorio de soluciones: técnicas para manejar conflictos en el aula","09:00-12:00","Presencial","Aula 6004"],
  ["T5V-2027-01-08-b2-c7","T5V",50,"2027-01-08",2,"Gamificación en la educación: recomendaciones para introducirla en el aula","12:00-14:00","Virtual","ZOOM (no necesita aula)"],
  ["P3V-2027-01-08-b2-c8","P3V",50,"2027-01-08",2,"Retos y posibilidades del DUA en los materiales digitales","12:00-14:00","Virtual",""],
  ["T3P-2027-01-08-b3-c10","T3P",30,"2027-01-08",3,"Conoce la nueva plataforma UVP Online","15:00-18:00","Presencial","Lab. de Comp. 01 Complejo Teocalli"],
  ["SO5P-2027-01-08-b3-c11","SO5P",30,"2027-01-08",3,"Prevención de la discriminación y promoción de la inclusión en el aula universitaria","15:00-18:00","Presencial","Aula 6104"],
  ["E2V-2027-01-08-b3-c12","E2V",50,"2027-01-08",3,"Aprende a usar Power BI","15:00-18:00","Virtual","ZOOM"],
  ["F6P-2027-01-11-b1-c4","F6P",30,"2027-01-11",1,"Repensar la enseñanza universitaria: hacia experiencias de aprendizaje significativo.","09:00-12:00","Presencial","Aula 6003"],
  ["PS4P-2027-01-11-b1-c5","PS4P",30,"2027-01-11",1,"Neurociencia del aprendizaje y neuronas espejo: aplicaciones en la enseñanza universitaria.","09:00-12:00","Presencial","Aula 6004"],
  ["T7V-2027-01-11-b2-c7","T7V",50,"2027-01-11",2,"Gestión de aulas virtuales y generación de evidencias online","12:00-14:00","Virtual","ZOOM (no necesita aula)"],
  ["SO2V-2027-01-11-b3-c10","SO2V",50,"2027-01-11",3,"Pedagogía de la esperanza, repensando la docencia desde otra mirada.","15:00-18:00","Virtual","ZOOM (no necesita aula)"],
  ["E3V-2027-01-11-b3-c11","E3V",50,"2027-01-11",3,"Terapias alternativas para especies de grande porte (solicitud de la coordinación de veterinaria de Tehuacán)","15:00-18:00","Virtual",""],
  ["PS2V-2027-01-11-b3-c12","PS2V",50,"2027-01-11",3,"Estrategias para disminuir las Barreras de Aprendizaje y Participación en la universidad","15:00-18:00","Virtual",""],
  ["T2P-2027-01-12-b1-c3","T2P",15,"2027-01-12",1,"Introducción a la IA agéntica (AULA MOVIL 6303)","09:00-12:00","Presencial","Aula 6303"],
  ["PS5P-2027-01-12-b1-c4","PS5P",30,"2027-01-12",1,"Incognita, ¿mi enseñanza docente es un ejemplo para mis estudiantes?","09:00-12:00","Presencial","Aula 6104"],
  ["PS3V-2027-01-12-b1-c5","PS3V",50,"2027-01-12",1,"Más allá de la etiqueta, comprendiendo a las personas neurodivergentes en el aula","09:00-12:00","Virtual","ZOOM (no necesita aula)"],
  ["SO1V-2027-01-12-b2-c7","SO1V",50,"2027-01-12",2,"Herramientas educativas para tejer la perspectiva de género en el aula","12:00-14:00","Virtual","ZOOM (no necesita aula)"],
  ["T4P-2027-01-12-b3-c10","T4P",30,"2027-01-12",3,"Diseñar con IA, no con prompts: taller de producción de materiales de clase","15:00-18:00","Presencial","Lab. de Comp. 01 Complejo Teocalli"],
  ["P4P-2027-01-12-b3-c11","P4P",30,"2027-01-12",3,"Aprendizaje basado en juegos, rol y narrativa: escape rooms, simulaciones y juegos de mesa educativos","15:00-18:00","Presencial","Ágora Teocalli"],
  ["T10P-2027-01-14-b1-c3","T10P",15,"2027-01-14",1,"Programación Asistida con IA","09:00-12:00","Presencial","Aula 6303"],
  ["P9P-2027-01-14-b1-c4","P9P",30,"2027-01-14",1,"Estrategias para la enseñanza y el aprendizaje en el área de la salud","09:00-12:00","Presencial","Aula 6104"],
  ["E8V-2027-01-14-b3-c10","E8V",50,"2027-01-14",3,"Bioinformática aplicada a las ciencias biomédicas","15:00-18:00","Virtual","ZOOM (no necesita aula)"],
  ["P7P-2027-01-14-b3-c11","P7P",20,"2027-01-14",3,"Teatro aplicado e improvisación para la docencia: voz, escucha y presencia","15:00-18:00","Presencial","Ágora Teocalli"],
  ["P8P-2027-01-15-b1-c3","P8P",30,"2027-01-15",1,"Metodologías activas para grupos numerosos","09:00-12:00","Presencial","Aula 6003"],
  ["D6P-2027-01-15-b1-c4","D6P",30,"2027-01-15",1,"El uso responsable de la IA en estudiantes","09:00-12:00","Presencial","Aula 6004"],
  ["G2V-2027-01-15-b2-c7","G2V",50,"2027-01-15",2,"Protocolos de seguridad y actuación ante emergencias de la UVP","12:00-14:00","Virtual","ZOOM (no necesita aula)"],
  ["PS8V-2027-01-15-b2-c8","PS8V",50,"2027-01-15",2,"Inteligencia emocional y autorregulación en la práctica docente","12:00-14:00","Virtual",""],
  ["E2V-2027-01-15-b3-c10","E2V",50,"2027-01-15",3,"Aprende a usar Power BI","15:00-18:00","Virtual","ZOOM"],
  ["TA1P-2027-01-15-b3-c11","TA1P",30,"2027-01-15",3,"Genially en Acción micrositios e Imágenes Interactivas","15:00-18:00","Presencial","Aula 6104"],
  ["D7P-2027-01-15-b3-c12","D7P",30,"2027-01-15",3,"Enfoque de competencias en el proceso enseñanza-aprendizaje","15:00-18:00","Presencial","Aula 6105"],
  ["B1O-asincrono","B1O",50,"",0,"El ABC del Docente Universitario","Autogestivo","Online (plataforma)","Plataforma UVP Online"],
  ["B2O-asincrono","B2O",50,"",0,"Ser docente UVP","Autogestivo","Online (plataforma)","Plataforma UVP Online"],
  ["B3O-asincrono","B3O",50,"",0,"Modelo Educativo Tlamatini","Autogestivo","Online (plataforma)","Plataforma UVP Online"],
  ["B5O-asincrono","B5O",50,"",0,"Construcción de Entornos Virtuales de Aprendizaje en UVP Online","Autogestivo","Online (plataforma)","Plataforma UVP Online"],
  ["B6O-asincrono","B6O",50,"",0,"Competencias Tecnológicas - Workspaces","Autogestivo","Online (plataforma)","Plataforma UVP Online"]
];

/* ===================== ENTRADAS WEB ===================== */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = String(p.callback || "");
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
    return ContentService.createTextOutput("Callback JSONP inválido.").setMimeType(ContentService.MimeType.TEXT);
  }
  let data;
  try {
    const action = String(p.action || "stats");
    if (action === "config") data = getCertificateConfig();
    else if (action === "codigo") data = validateAccessCode(p.codigo);
    else if (action === "verificar") data = verifyFolio(p.folio);
    else data = getPublicStats();
  } catch (error) {
    console.error("Consulta fallida: " + error.message);
    data = { ok: false, message: "Servicio no disponible en este momento." };
  }
  return ContentService.createTextOutput(callback + "(" + JSON.stringify(data) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  let payload = {};
  try {
    if (!e || !e.parameter || !e.parameter.payload) throw new Error("No se recibieron los datos del formulario.");
    payload = JSON.parse(e.parameter.payload);
    let result;
    if (payload.kind === "constancia") result = registerCertificate(payload);
    else if (payload.kind === "consultaConstancia") result = lookupCertificate(payload);
    else if (payload.kind === "admin") result = handleAdmin(payload);
    else result = saveRegistration(payload);
    return responsePage(result, payload.origin);
  } catch (error) {
    console.error("Solicitud fallida: " + error.message);
    return responsePage({
      type: resultType(payload.kind),
      requestId: payload.requestId || "",
      ok: false,
      message: error.message || "No fue posible completar la solicitud."
    }, payload.origin);
  }
}

function resultType(kind) {
  if (kind === "constancia" || kind === "consultaConstancia") return "uvp-constancia-result";
  if (kind === "admin") return "uvp-admin-result";
  return "uvp-registration-result";
}

/* La respuesta viaja al sitio por postMessage. window.top alcanza la página del sitio
   aunque Google envuelva la respuesta en un iframe intermedio. */
function responsePage(result, origin) {
  result.type = result.type || "uvp-registration-result";
  const target = isAllowedOrigin(origin) ? origin : "*";
  if (result.type === "uvp-admin-result" && target === "*") {
    result = { type: result.type, requestId: result.requestId, ok: false, message: "Origen no permitido para el panel." };
  }
  const serialized = JSON.stringify(result).replace(/</g, "\\<");
  const html = '<!doctype html><meta charset="utf-8"><script>(window.top||window.parent).postMessage(' +
    serialized + ', ' + JSON.stringify(target) + ');</script>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function isAllowedOrigin(origin) {
  const o = String(origin || "");
  return /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) ||
    (SITE_URL.indexOf("http") === 0 && SITE_URL.indexOf(o) === 0 && o.length > 8);
}

/* ===================== MENÚ DE LA HOJA (panel rápido) ===================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu("Jornada UVP")
    .addItem("Configurar clave del panel administrativo", "configurarClaveAdmin")
    .addSeparator()
    .addItem("Autorizar filas validadas", "autorizarValidadas")
    .addItem("Enviar avisos de constancias autorizadas", "notificarAutorizadas")
    .addItem("Crear códigos para sesiones sin código", "generarCodigosFaltantes")
    .addItem("Escribir enlaces QR de cada código", "escribirEnlacesQR")
    .addSeparator()
    .addItem("Enviar enlaces de Zoom pendientes", "enviarEnlacesZoom")
    .addItem("Activar envío diario de enlaces de Zoom (7:00)", "activarEnvioDiarioZoom")
    .addToUi();
}

function authorizeServices() {
  getRegistrationSheet();
  getCodesSheet();
  getCertificateSheet();
  getZoomSheet();
  getZoomLog();
  MailApp.getRemainingDailyQuota();
  ScriptApp.getProjectTriggers();
  const me = Session.getEffectiveUser().getEmail();
  if (me && me.toLowerCase() !== CONTACT_EMAIL.toLowerCase()) {
    console.warn("Atención: los correos saldrán desde " + me + ". Para que salgan desde " + CONTACT_EMAIL + ", crea y publica el script con esa cuenta.");
  }
  console.log("Servicios autorizados. Configura la clave del panel con configurarClaveAdmin desde el menú Jornada UVP.");
}

function configurarClaveAdmin() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt("Clave del panel administrativo", "Escribe una clave de al menos 10 caracteres. Compártela solo con coordinación.", ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const key = res.getResponseText().trim();
  if (key.length < 10) { ui.alert("La clave debe tener al menos 10 caracteres."); return; }
  PropertiesService.getScriptProperties().setProperty("ADMIN_KEY", key);
  ui.alert("Clave guardada. Úsala para entrar a admin.html en el sitio publicado.");
}

/* ===================== INSCRIPCIONES Y CUPOS ===================== */
function getRegistrationSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Vincula este proyecto de Apps Script a la hoja de cálculo de la jornada.");
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    const current = sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0];
    if (HEADERS.some(function (h, i) { return current[i] !== h; })) {
      throw new Error("La fila 1 de la pestaña Inscripciones no coincide con los encabezados esperados.");
    }
  }
  return sheet;
}

function getSessionMap() {
  const map = {};
  SESSION_ROWS.forEach(function (r) {
    map[r[0]] = { id: r[0], courseId: r[1], capacity: Number(r[2]), date: r[3], block: Number(r[4]), title: r[5], time: r[6], modality: r[7], room: r[8] };
  });
  return map;
}

function computeStats() {
  const sheet = getRegistrationSheet();
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues() : [];
  const sessionMap = getSessionMap();
  const counts = {};
  Object.keys(sessionMap).forEach(function (id) { counts[id] = 0; });
  const keys = {};
  rows.forEach(function (row) {
    const key = normalizeKey(row[11]);
    if (key) keys[key] = true;
    parseSessionIds(row[12]).forEach(function (id) { if (counts.hasOwnProperty(id)) counts[id] += 1; });
  });
  const bySession = {};
  let totalCapacity = 0, available = 0;
  Object.keys(sessionMap).forEach(function (id) {
    const cap = sessionMap[id].capacity;
    const left = Math.max(0, cap - counts[id]);
    totalCapacity += cap; available += left;
    bySession[id] = { inscritos: counts[id], capacidad: cap, disponibles: left };
  });
  return {
    ok: true,
    totalInscritos: Object.keys(keys).length,
    cuposProgramados: totalCapacity,
    cuposDisponibles: available,
    bySession: bySession,
    actualizado: new Date().toISOString()
  };
}

/* Las cifras se guardan en caché unos segundos y se invalidan con cada inscripción:
   así cientos de pantallas abiertas no saturan la hoja y el cupo nunca queda desfasado. */
function getPublicStats() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get("stats");
  if (hit) return JSON.parse(hit);
  const stats = computeStats();
  cache.put("stats", JSON.stringify(stats), STATS_CACHE_SECONDS);
  return stats;
}

function saveRegistration(payload) {
  if (!REGISTRATION_OPEN) throw new Error("El periodo de inscripción está cerrado.");
  if (!payload || typeof payload !== "object") throw new Error("Los datos recibidos no son válidos.");
  if (String(payload.website || "").trim()) throw new Error("No se pudo validar el formulario.");

  const fullName = cleanText(payload.fullName, 120, "nombre");
  const email = cleanText(payload.email, 160, "correo");
  const teacherKey = cleanText(payload.teacherKey, 50, "clave docente");
  const campus = cleanText(payload.campus, 80, "plantel");
  const division = cleanText(payload.division, 120, "división");
  const personType = cleanText(payload.personType, 120, "tipo de personal");
  const academicLevel = cleanText(payload.academicLevel || "No aplica", 220, "nivel académico");
  const postgraduateLevel = cleanText(payload.postgraduateLevel || "No aplica", 100, "nivel de posgrado");
  const experience = cleanText(payload.experience, 60, "antigüedad");
  const programs = Array.isArray(payload.programs) ? payload.programs.map(function (p) { return cleanText(p, 160, "programa"); }) : [];
  const requestId = cleanText(payload.requestId, 80, "folio");
  const sessions = Array.isArray(payload.sessions) ? payload.sessions.map(String) : [];

  if (!isInstitutionalEmail(email)) throw new Error("Escribe tu correo institucional (terminación @uvp.mx).");
  if (!payload.privacyConsent) throw new Error("Debes aceptar el aviso de uso de datos para continuar.");
  if (sessions.length < MIN_COURSES) throw new Error("Elige al menos " + MIN_COURSES + " sesiones.");
  if (new Set(sessions).size !== sessions.length) throw new Error("Hay sesiones duplicadas en tu selección.");

  const sessionMap = getSessionMap();
  sessions.forEach(function (id) {
    if (!sessionMap.hasOwnProperty(id)) throw new Error("La selección incluye una sesión que no pertenece a la oferta publicada.");
  });
  validateNoOverlaps(sessions, sessionMap);

  // El candado impide que dos personas ocupen al mismo tiempo el último lugar de una sesión.
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const sheet = getRegistrationSheet();
    const lastRow = sheet.getLastRow();
    const rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues() : [];
    const key = normalizeKey(teacherKey);
    const matches = [];
    rows.forEach(function (row, i) { if (normalizeKey(row[11]) === key) matches.push(i); });
    if (matches.length > 1) throw new Error("Hay registros repetidos para esta clave. Contacta a coordinación para revisar tu inscripción.");
    const existing = matches.length ? matches[0] : -1;

    // Reenvío del mismo formulario (doble clic, reintento): no se duplica.
    if (existing >= 0 && String(rows[existing][1]) === requestId) {
      return { type: "uvp-registration-result", requestId: requestId, ok: true, message: "Tu inscripción ya estaba registrada.", stats: computeStats() };
    }

    const usage = {};
    sessions.forEach(function (id) { usage[id] = 0; });
    rows.forEach(function (row, i) {
      if (i === existing) return;
      parseSessionIds(row[12]).forEach(function (id) { if (usage.hasOwnProperty(id)) usage[id] += 1; });
    });
    const full = sessions.filter(function (id) { return usage[id] >= sessionMap[id].capacity; });
    if (full.length) {
      CacheService.getScriptCache().remove("stats");
      return {
        type: "uvp-registration-result", requestId: requestId, ok: false, full: full,
        message: "El cupo de " + full.map(function (id) { return sessionMap[id].title; }).join(", ") + " se completó hace un momento. Quítala de tu selección y elige otra.",
        stats: computeStats()
      };
    }

    const values = [
      new Date(), safeCellValue(requestId), safeCellValue(fullName), safeCellValue(email), safeCellValue(campus),
      safeCellValue(division), safeCellValue(personType), safeCellValue(academicLevel), safeCellValue(postgraduateLevel),
      safeCellValue(programs.join(" | ")), safeCellValue(experience), safeCellValue(teacherKey), JSON.stringify(sessions), "Sí"
    ];
    const targetRow = existing >= 0 ? existing + 2 : lastRow + 1;
    sheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([values]);
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove("stats");

    let mailNote = "";
    try { sendConfirmation(email, fullName, sessions, sessionMap, existing >= 0); }
    catch (mailError) {
      console.error("Correo de confirmación fallido: " + mailError.message);
      mailNote = " No se pudo enviar el correo de confirmación; escribe a coordinación si lo necesitas.";
    }
    return {
      type: "uvp-registration-result", requestId: requestId, ok: true,
      message: (existing >= 0 ? "Tu inscripción se actualizó correctamente." : "Tu inscripción quedó registrada correctamente.") + mailNote,
      stats: computeStats()
    };
  } finally {
    lock.releaseLock();
  }
}

function validateNoOverlaps(ids, sessionMap) {
  const used = {};
  ids.forEach(function (id) {
    const s = sessionMap[id];
    if (!s.date || !s.block) return;
    const slot = s.date + "-b" + s.block;
    if (used[slot]) throw new Error("Elegiste dos actividades que coinciden en fecha y horario.");
    used[slot] = true;
  });
}

function sendConfirmation(email, fullName, ids, sessionMap, isUpdate) {
  const zoom = readZoomLinks();
  const sentZoom = [];
  const items = ids.map(function (id) {
    const s = sessionMap[id];
    const date = s.date ? s.date.split("-").reverse().join("/") : "Autogestivo";
    let extra = "";
    if (isVirtual(s)) {
      if (zoom[id]) { extra = zoomHtml(zoom[id]); sentZoom.push(id); }
      else extra = "<br><span style='color:#8a4a10'>El enlace de Zoom te llegará a este correo antes de la sesión.</span>";
    }
    return "<li style='margin-bottom:10px'><strong>" + escapeHtml(s.title) + "</strong><br>" + escapeHtml(date) + " · " + escapeHtml(s.time) +
      " · " + escapeHtml(s.modality) + (s.room && !isVirtual(s) ? " · " + escapeHtml(s.room) : "") + extra + "</li>";
  }).join("");
  const subject = isUpdate ? "Actualización de tu inscripción · Jornada UVP" : "Confirmación de inscripción · Jornada UVP";
  const html = "<div style='font-family:Arial,sans-serif;color:#1f1828;max-width:560px'>" +
    "<h2 style='color:#4a176d'>Jornada de Formación y Superación Docente</h2>" +
    "<p>Hola " + escapeHtml(fullName) + ":</p><p>" + (isUpdate ? "Tu selección se actualizó." : "Tu inscripción quedó registrada.") +
    " Estas son tus sesiones:</p><ul>" + items + "</ul>" +
    "<p style='background:#fff5e3;padding:12px;border-radius:10px'><strong>Para recibir constancia:</strong> al terminar cada curso o taller registra tu asistencia con el código QR y responde la evaluación final.</p>" +
    "<p>Para liberar un lugar o resolver dudas, escribe a " + CONTACT_EMAIL + ".</p></div>";
  const plain = "Hola " + fullName + ":\n\nTu inscripción quedó registrada. Consulta tus sesiones en la página de la Jornada UVP.\n\nPara recibir constancia registra tu asistencia con el código QR y responde la evaluación final.\n\nDudas: " + CONTACT_EMAIL;
  sendMail({ to: email, subject: subject, body: plain, htmlBody: html });
  logZoomSent(email, sentZoom);
}

/* ===================== ENLACES DE ZOOM ===================== */
const ZOOM_SHEET = "Enlaces Zoom";
const ZOOM_HEADERS = ["Sesión ID", "Curso", "Fecha", "Horario", "Enlace de Zoom", "ID de reunión", "Código de acceso"];
const ZOOM_LOG_SHEET = "Envíos Zoom";

function isVirtual(s) { return /virtual/i.test(String(s.modality || "")); }

/* Crea la pestaña con una fila por sesión virtual; coordinación solo pega el enlace en la columna E. */
function getZoomSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ZOOM_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ZOOM_SHEET);
    sheet.getRange(1, 1, 1, ZOOM_HEADERS.length).setValues([ZOOM_HEADERS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  const present = {};
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().forEach(function (r) { present[String(r[0])] = true; });
  const missing = SESSION_ROWS.filter(function (r) { return /virtual/i.test(r[7]) && !present[r[0]]; })
    .map(function (r) { return [r[0], r[5], r[3], r[6], "", "", ""]; });
  if (missing.length) sheet.getRange(sheet.getLastRow() + 1, 1, missing.length, ZOOM_HEADERS.length).setValues(missing);
  return sheet;
}

function readZoomLinks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ZOOM_SHEET);
  const map = {};
  if (!sheet || sheet.getLastRow() < 2) return map;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, ZOOM_HEADERS.length).getDisplayValues().forEach(function (r) {
    const link = String(r[4]).trim();
    if (/^https:\/\//i.test(link)) map[String(r[0])] = { link: link, meetingId: String(r[5]).trim(), pass: String(r[6]).trim() };
  });
  return map;
}

function zoomHtml(z) {
  return "<br><a href='" + escapeHtml(z.link) + "' style='display:inline-block;margin-top:6px;background:#2d8cff;color:#fff;padding:8px 14px;border-radius:999px;text-decoration:none;font-weight:bold'>Entrar a Zoom</a>" +
    (z.meetingId ? "<br><span style='font-size:13px'>ID de reunión: " + escapeHtml(z.meetingId) + "</span>" : "") +
    (z.pass ? "<br><span style='font-size:13px'>Código de acceso: " + escapeHtml(z.pass) + "</span>" : "");
}

function getZoomLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ZOOM_LOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ZOOM_LOG_SHEET);
    sheet.getRange(1, 1, 1, 3).setValues([["Fecha de envío", "Correo", "Sesión ID"]]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function logZoomSent(email, ids) {
  if (!ids.length) return;
  const sheet = getZoomLog();
  const now = new Date();
  sheet.getRange(sheet.getLastRow() + 1, 1, ids.length, 3).setValues(ids.map(function (id) { return [now, email, id]; }));
}

/* Menú y activador diario: envía a cada inscrito los enlaces de Zoom de sus sesiones virtuales
   que aún no recibió (por ejemplo, si se inscribió antes de que se cargara el enlace). Nunca repite un envío. */
function enviarEnlacesZoom() {
  const zoom = readZoomLinks();
  if (!Object.keys(zoom).length) { toast("Todavía no hay enlaces en la pestaña " + ZOOM_SHEET + "."); return; }
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const sessionMap = getSessionMap();
    const log = getZoomLog();
    const sent = {};
    if (log.getLastRow() > 1) log.getRange(2, 2, log.getLastRow() - 1, 2).getValues().forEach(function (r) { sent[String(r[0]).toLowerCase() + "|" + r[1]] = true; });
    const reg = getRegistrationSheet();
    const rows = reg.getLastRow() > 1 ? reg.getRange(2, 1, reg.getLastRow() - 1, HEADERS.length).getValues() : [];
    let emails = 0;
    rows.forEach(function (row) {
      const email = String(row[3]).trim(), name = String(row[2]);
      if (!isInstitutionalEmail(email)) return;
      const today = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
      const pendingIds = parseSessionIds(row[12]).filter(function (id) {
        const s = sessionMap[id];
        return s && isVirtual(s) && zoom[id] && (!s.date || s.date >= today) && !sent[email.toLowerCase() + "|" + id];
      });
      if (!pendingIds.length || MailApp.getRemainingDailyQuota() < 1) return;
      const items = pendingIds.map(function (id) {
        const s = sessionMap[id];
        return "<li style='margin-bottom:12px'><strong>" + escapeHtml(s.title) + "</strong><br>" +
          escapeHtml(s.date ? s.date.split("-").reverse().join("/") : "") + " · " + escapeHtml(s.time) + " h" + zoomHtml(zoom[id]) + "</li>";
      }).join("");
      const html = "<div style='font-family:Arial,sans-serif;color:#1f1828;max-width:560px'><h2 style='color:#4a176d'>Tus enlaces de Zoom</h2>" +
        "<p>Hola " + escapeHtml(name) + ":</p><p>Estos son los enlaces de tus sesiones virtuales de la Jornada de Formación y Superación Docente:</p><ul>" + items + "</ul>" +
        "<p style='background:#fff5e3;padding:12px;border-radius:10px'>Conéctate con tu nombre completo y cámara encendida. Al terminar, registra tu asistencia con el código QR y responde la evaluación final para obtener tu constancia.</p>" +
        "<p>Dudas: " + CONTACT_EMAIL + "</p></div>";
      try {
        sendMail({ to: email, subject: "Enlaces de Zoom de tus sesiones · Jornada UVP", htmlBody: html,
          body: "Tus enlaces de Zoom:\n" + pendingIds.map(function (id) { return sessionMap[id].title + ": " + zoom[id].link; }).join("\n") });
        logZoomSent(email, pendingIds);
        emails += 1;
      } catch (err) { console.error("Zoom no enviado a " + email + ": " + err.message); }
    });
    toast("Correos con enlaces de Zoom enviados: " + emails + ".");
  } finally { lock.releaseLock(); }
}

/* Menú: programa enviarEnlacesZoom todos los días a las 7:00 (una sola vez basta). */
function activarEnvioDiarioZoom() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "enviarEnlacesZoom") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("enviarEnlacesZoom").timeBased().everyDays(1).atHour(7).inTimezone(TZ).create();
  toast("Listo: cada día a las 7:00 se enviarán los enlaces de Zoom pendientes.");
}

/* Todos los correos salen de la cuenta que publica la implementación (debe ser CONTACT_EMAIL)
   y las respuestas llegan a CONTACT_EMAIL. */
function sendMail(opts) {
  opts.name = "Jornada de Formación Docente UVP";
  opts.replyTo = CONTACT_EMAIL;
  MailApp.sendEmail(opts);
}

/* ===================== CÓDIGOS DE CONSTANCIA ===================== */
function clasificarHoras(horas) {
  const h = Number(horas);
  if (h === 2) return { tipo: "CURSO", plantilla: "plantilla-curso.pdf" };
  if (h === 3) return { tipo: "TALLER", plantilla: "plantilla-taller.pdf" };
  if (h >= 4 && h <= 12) return { tipo: "CURSO", plantilla: "plantilla-curso.pdf" };
  return { tipo: "REVISIÓN", plantilla: "" };
}

function isCertificateWindowOpen(now) {
  if (CERT_OPEN && now.getTime() < new Date(CERT_OPEN).getTime()) return false;
  if (CERT_CLOSE && now.getTime() > new Date(CERT_CLOSE).getTime()) return false;
  return true;
}

function getCertificateConfig() {
  return { ok: true, abierto: isCertificateWindowOpen(new Date()), apertura: CERT_OPEN, cierre: CERT_CLOSE };
}

function getCodesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Vincula este proyecto de Apps Script a la hoja de cálculo de la jornada.");
  let sheet = ss.getSheetByName(CODES_SHEET);
  if (!sheet) sheet = ss.insertSheet(CODES_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, CODES_HEADERS.length).setValues([CODES_HEADERS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readCodes() {
  const sheet = getCodesSheet();
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, CODES_HEADERS.length).getValues().map(function (r, i) {
    return {
      row: i + 2,
      codigo: normalizeCode(r[0]),
      sesionId: String(r[1]),
      curso: String(r[2]),
      fecha: formatIsoDate(r[3]),
      horario: String(r[4]),
      horas: Number(r[5]),
      clasificacion: String(r[6]),
      inicio: toDateValue(r[7]),
      cierre: toDateValue(r[8]),
      activo: String(r[9]).trim().toUpperCase() === "SI"
    };
  }).filter(function (c) { return c.codigo; });
}

function validateAccessCode(codigo) {
  const code = normalizeCode(codigo);
  if (!code) return { ok: false, message: "Escribe el código de acceso de tu curso." };
  if (!isCertificateWindowOpen(new Date())) return { ok: false, message: "El registro de constancias no está abierto en este momento." };
  const found = readCodes().filter(function (c) { return c.codigo === code; })[0];
  if (!found) return { ok: false, message: "El código no es válido. Revísalo e inténtalo de nuevo." };
  const now = new Date();
  if (!found.activo) return { ok: false, message: "Este código está desactivado. Contacta a coordinación." };
  if (found.inicio && now < found.inicio) return { ok: false, message: "El registro de este curso abre el " + fmtDateTime(found.inicio) + "." };
  if (found.cierre && now > found.cierre) return { ok: false, message: "El registro de este curso cerró el " + fmtDateTime(found.cierre) + "." };
  const clase = clasificarHoras(found.horas);
  if (!clase.plantilla) return { ok: false, message: "Esta actividad requiere revisión administrativa antes de emitir constancia. Contacta a coordinación." };
  return {
    ok: true, codigo: code, curso: found.curso, fecha: found.fecha, horario: found.horario, horas: found.horas,
    autogestivo: !/^\d{4}-\d{2}-\d{2}$/.test(found.fecha), tipo: clase.tipo
  };
}

function newCode(existing) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sin 0/O ni 1/I para evitar confusiones
  let code;
  do {
    code = "";
    for (let i = 0; i < 6; i++) code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  } while (existing[code]);
  existing[code] = true;
  return code;
}

/* Menú: crea un código para cada sesión publicada que todavía no tenga uno. */
function generarCodigosFaltantes() {
  const sheet = getCodesSheet();
  const codes = readCodes();
  const used = {}, sessionsWithCode = {};
  codes.forEach(function (c) { used[c.codigo] = true; sessionsWithCode[c.sesionId] = true; });
  const rows = [];
  SESSION_ROWS.forEach(function (r) {
    if (sessionsWithCode[r[0]]) return;
    const horas = horasDeSesion(r[6]);
    rows.push([newCode(used), r[0], r[5], r[3] || "Autogestivo", r[6], horas || "", horas ? clasificarHoras(horas).tipo : "REVISIÓN", "", "", "SI"]);
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, CODES_HEADERS.length).setValues(rows);
  toast("Códigos nuevos: " + rows.length + ". Revisa la columna Horas de cada uno antes de abrir el registro.");
}

function horasDeSesion(horario) {
  const m = String(horario || "").match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return Math.round(((Number(m[3]) * 60 + Number(m[4])) - (Number(m[1]) * 60 + Number(m[2]))) / 60);
}

/* Menú: agrega a la derecha del panel de códigos el enlace que debe ir en el QR de cada curso. */
function escribirEnlacesQR() {
  if (SITE_URL.indexOf("http") !== 0) { toast("Primero escribe SITE_URL al inicio del código."); return; }
  const sheet = getCodesSheet();
  const codes = readCodes();
  sheet.getRange(1, CODES_HEADERS.length + 1).setValue("Enlace para el QR").setFontWeight("bold");
  codes.forEach(function (c) {
    sheet.getRange(c.row, CODES_HEADERS.length + 1).setValue(siteBase() + "?constancia=" + c.codigo);
  });
  toast("Enlaces escritos. También puedes imprimir los QR desde admin.html.");
}

/* ===================== CONSTANCIAS ===================== */
function getCertificateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Vincula este proyecto de Apps Script a la hoja de cálculo de la jornada.");
  let sheet = ss.getSheetByName(CERT_SHEET);
  if (!sheet) sheet = ss.insertSheet(CERT_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, CERT_HEADERS.length).setValues([CERT_HEADERS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(CERT_STATUSES, true).build();
    sheet.getRange(2, C.estatus + 1, 2000, 1).setDataValidation(rule);
  } else if (sheet.getLastColumn() < CERT_HEADERS.length) {
    // Migración: agrega las columnas de trazabilidad a hojas creadas con la versión anterior.
    const from = sheet.getLastColumn();
    sheet.getRange(1, from + 1, 1, CERT_HEADERS.length - from).setValues([CERT_HEADERS.slice(from)]).setFontWeight("bold");
  }
  return sheet;
}

function readCertificateRows(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, CERT_HEADERS.length).getValues().map(function (r, i) {
    return {
      row: i + 2, registro: r[C.fecha], folio: String(r[C.folio]), nombre: String(r[C.nombre]), correo: String(r[C.correo]),
      clave: normalizeKey(r[C.clave]), claveTexto: String(r[C.clave]), codigo: normalizeCode(r[C.codigo]), curso: String(r[C.curso]),
      fechaCurso: formatIsoDate(r[C.fechaCurso]), horario: String(r[C.horario]), horas: Number(r[C.horas]),
      tipo: String(r[C.tipo]), plantilla: String(r[C.plantilla]), estatus: String(r[C.estatus]).trim(),
      emision: r[C.emision], obs: String(r[C.obs]), descargas: Number(r[C.descargas]) || 0,
      ultima: r[C.ultima], aviso: r[C.aviso], historial: String(r[C.historial] || "")
    };
  });
}

function newFolio(rows) {
  const used = {};
  rows.forEach(function (r) { used[r.folio] = true; });
  let folio;
  do { folio = FOLIO_PREFIX + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 8).toUpperCase(); } while (used[folio]);
  return folio;
}

function addHistory(sheet, row, text) {
  const cell = sheet.getRange(row, C.historial + 1);
  const prev = String(cell.getValue() || "");
  const line = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm") + " · " + text;
  cell.setValue(prev ? prev + "\n" + line : line);
}

function registerCertificate(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Los datos recibidos no son válidos.");
  if (String(payload.website || "").trim()) throw new Error("No se pudo validar el formulario.");
  const requestId = cleanText(payload.requestId, 80, "folio");
  const nombre = cleanText(payload.nombre, 120, "nombre");
  const correo = cleanText(payload.correo, 160, "correo institucional");
  const clave = cleanText(payload.clave, 50, "clave docente");
  if (!isInstitutionalEmail(correo)) throw new Error("Escribe tu correo institucional (terminación @uvp.mx).");
  if (!payload.privacyConsent) throw new Error("Debes aceptar el aviso de uso de datos para continuar.");

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const access = validateAccessCode(payload.codigo);
    if (!access.ok) throw new Error(access.message);
    const sheet = getCertificateSheet();
    const rows = readCertificateRows(sheet);
    const key = normalizeKey(clave);
    const dup = rows.filter(function (r) { return r.clave === key && r.codigo === access.codigo; })[0];
    if (dup) {
      return {
        type: "uvp-constancia-result", requestId: requestId, ok: true, duplicado: true, folio: dup.folio, estatus: dup.estatus,
        message: "Ya tenías un registro para este curso. Estatus actual: " + dup.estatus + "."
      };
    }
    const folio = newFolio(rows);
    sheet.appendRow([
      new Date(), folio, safeCellValue(nombre), safeCellValue(correo), safeCellValue(clave),
      access.codigo, safeCellValue(access.curso), access.fecha, access.horario, access.horas,
      access.tipo, clasificarHoras(access.horas).plantilla, CERT_PENDING, "", "", 0, "", "",
      Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm") + " · Registro desde el sitio"
    ]);
    SpreadsheetApp.flush();
    return {
      type: "uvp-constancia-result", requestId: requestId, ok: true, folio: folio, estatus: CERT_PENDING,
      message: "Tu registro quedó guardado. Te avisaremos por correo cuando coordinación valide tu asistencia y tu evaluación final."
    };
  } finally {
    lock.releaseLock();
  }
}

function lookupCertificate(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Los datos recibidos no son válidos.");
  if (String(payload.website || "").trim()) throw new Error("No se pudo validar el formulario.");
  const requestId = cleanText(payload.requestId, 80, "folio");
  const clave = normalizeKey(cleanText(payload.clave, 50, "clave docente"));
  const codigo = normalizeCode(cleanText(payload.codigo, 20, "código"));
  const ident = cleanText(payload.identificador, 160, "correo o nombre");
  const base = { type: "uvp-constancia-result", requestId: requestId };
  if (!isCertificateWindowOpen(new Date())) return Object.assign(base, { ok: false, message: "La consulta de constancias no está abierta en este momento." });

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const sheet = getCertificateSheet();
    const row = readCertificateRows(sheet).filter(function (r) { return r.clave === clave && r.codigo === codigo; })[0];
    const matches = row && (row.correo.trim().toLowerCase() === ident.trim().toLowerCase() || normalizeName(row.nombre) === normalizeName(ident));
    if (!matches) return Object.assign(base, { ok: false, message: "No encontramos un registro con esos datos. Revisa tu clave, el código del curso y tu correo institucional." });
    if (row.estatus !== CERT_OK) {
      return Object.assign(base, { ok: true, estatus: row.estatus, folio: row.folio,
        message: row.estatus === CERT_NO ? "Tu registro no fue autorizado. Escribe a " + CONTACT_EMAIL + " si crees que es un error." : "Tu registro está en revisión (" + row.estatus + "). Te avisaremos por correo cuando tu constancia esté lista." });
    }
    let emision = toDateValue(row.emision);
    if (!emision) { emision = new Date(); sheet.getRange(row.row, C.emision + 1).setValue(emision); }
    sheet.getRange(row.row, C.descargas + 1).setValue(row.descargas + 1);
    sheet.getRange(row.row, C.ultima + 1).setValue(new Date());
    if (row.descargas >= 1) addHistory(sheet, row.row, "Reimpresión #" + (row.descargas + 1));
    return Object.assign(base, { ok: true, estatus: row.estatus, folio: row.folio, message: "", constancia: certificatePayload(row, emision) });
  } finally {
    lock.releaseLock();
  }
}

function certificatePayload(row, emision) {
  return {
    folio: row.folio, nombre: row.nombre, curso: row.curso, fechaCurso: row.fechaCurso, horario: row.horario,
    horas: row.horas, tipo: row.tipo, emision: formatIsoDate(emision || row.emision || new Date()),
    autogestivo: !/^\d{4}-\d{2}-\d{2}$/.test(row.fechaCurso)
  };
}

/* Verificación pública: cualquiera puede confirmar que un folio impreso es auténtico. */
function verifyFolio(folio) {
  const f = String(folio || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{8,40}$/.test(f)) return { ok: false, message: "Folio no válido." };
  const row = readCertificateRows(getCertificateSheet()).filter(function (r) { return r.folio.toUpperCase() === f; })[0];
  if (!row || row.estatus !== CERT_OK) return { ok: true, valida: false, message: "No existe una constancia autorizada con ese folio." };
  return { ok: true, valida: true, folio: row.folio, nombre: row.nombre, curso: row.curso, fecha: row.fechaCurso, horas: row.horas, emision: formatIsoDate(row.emision) };
}

/* Menú o panel: cambia a "Autorizada" todas las filas marcadas como validadas. */
function autorizarValidadas() {
  const sheet = getCertificateSheet();
  let total = 0;
  readCertificateRows(sheet).forEach(function (r) {
    if (r.estatus === CERT_READY) {
      sheet.getRange(r.row, C.estatus + 1).setValue(CERT_OK);
      if (!r.emision) sheet.getRange(r.row, C.emision + 1).setValue(new Date());
      addHistory(sheet, r.row, "Autorizada (lote de validadas)");
      total += 1;
    }
  });
  const sent = notificarAutorizadas(true);
  toast("Constancias autorizadas: " + total + ". Avisos enviados: " + sent + ".");
}

/* Envía un correo a cada persona con constancia autorizada que aún no recibió aviso. */
function notificarAutorizadas(silent) {
  const sheet = getCertificateSheet();
  let sent = 0;
  readCertificateRows(sheet).forEach(function (r) {
    if (r.estatus !== CERT_OK || r.aviso || !isInstitutionalEmail(r.correo)) return;
    if (MailApp.getRemainingDailyQuota() < 1) return;
    const link = siteBase() ? siteBase() + "?constancia=" + r.codigo + "&descargar=1" : "";
    const html = "<div style='font-family:Arial,sans-serif;color:#1f1828;max-width:560px'><h2 style='color:#4a176d'>Tu constancia está lista</h2>" +
      "<p>Hola " + escapeHtml(r.nombre) + ":</p><p>Coordinación validó tu participación en <strong>" + escapeHtml(r.curso) + "</strong>.</p>" +
      (link ? "<p><a href='" + link + "' style='display:inline-block;background:#4a176d;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none'>Descargar mi constancia</a></p>" : "") +
      "<p>Para descargarla escribe tu clave docente, el código del curso (<strong>" + r.codigo + "</strong>) y tu correo institucional.</p>" +
      "<p style='color:#6b6474;font-size:12px'>Folio: " + r.folio + "</p></div>";
    try {
      sendMail({ to: r.correo, subject: "Tu constancia está lista · Jornada UVP", htmlBody: html,
        body: "Tu constancia de " + r.curso + " está lista. Código: " + r.codigo + ". Folio: " + r.folio });
      sheet.getRange(r.row, C.aviso + 1).setValue(new Date());
      sent += 1;
    } catch (err) { console.error("Aviso no enviado a fila " + r.row + ": " + err.message); }
  });
  if (silent !== true) toast("Avisos enviados: " + sent + ".");
  return sent;
}

/* ===================== PANEL ADMINISTRATIVO (admin.html) ===================== */
function handleAdmin(payload) {
  const requestId = cleanText(payload.requestId, 80, "folio");
  const base = { type: "uvp-admin-result", requestId: requestId };
  checkAdminKey(payload.key);
  const op = String(payload.op || "");

  if (op === "resumen") {
    const stats = computeStats();
    const certRows = readCertificateRows(getCertificateSheet());
    const perCode = {};
    certRows.forEach(function (r) {
      const p = perCode[r.codigo] = perCode[r.codigo] || { registros: 0, autorizadas: 0, pendientes: 0 };
      p.registros += 1;
      if (r.estatus === CERT_OK) p.autorizadas += 1;
      if (r.estatus === CERT_PENDING || r.estatus === CERT_READY) p.pendientes += 1;
    });
    const sessions = getSessionMap();
    return Object.assign(base, {
      ok: true, stats: stats, ventana: getCertificateConfig(),
      sesiones: Object.keys(sessions).map(function (id) { return Object.assign({}, sessions[id], stats.bySession[id]); }),
      codigos: readCodes().map(function (c) {
        return { codigo: c.codigo, sesionId: c.sesionId, curso: c.curso, fecha: c.fecha, horario: c.horario, horas: c.horas,
          clasificacion: clasificarHoras(c.horas).tipo, activo: c.activo, inicio: c.inicio ? c.inicio.toISOString() : "",
          cierre: c.cierre ? c.cierre.toISOString() : "", conteo: perCode[c.codigo] || { registros: 0, autorizadas: 0, pendientes: 0 } };
      }),
      totales: { registros: certRows.length, autorizadas: certRows.filter(function (r) { return r.estatus === CERT_OK; }).length }
    });
  }

  if (op === "registros") {
    const code = normalizeCode(payload.codigo || "");
    const rows = readCertificateRows(getCertificateSheet()).filter(function (r) { return !code || r.codigo === code; });
    return Object.assign(base, { ok: true, registros: rows.map(function (r) {
      return { folio: r.folio, registro: r.registro ? new Date(r.registro).toISOString() : "", nombre: r.nombre, correo: r.correo, clave: r.claveTexto,
        codigo: r.codigo, curso: r.curso, fechaCurso: r.fechaCurso, horario: r.horario, horas: r.horas, tipo: r.tipo, estatus: r.estatus,
        emision: formatIsoDate(r.emision), descargas: r.descargas, aviso: r.aviso ? formatIsoDate(r.aviso) : "", historial: r.historial };
    }) });
  }

  if (op === "estatus") {
    const estatus = String(payload.estatus || "");
    if (CERT_STATUSES.indexOf(estatus) < 0) throw new Error("Estatus no válido.");
    const folios = (payload.folios || []).map(String);
    const lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try {
      const sheet = getCertificateSheet();
      let n = 0;
      readCertificateRows(sheet).forEach(function (r) {
        if (folios.indexOf(r.folio) < 0 || r.estatus === estatus) return;
        sheet.getRange(r.row, C.estatus + 1).setValue(estatus);
        if (estatus === CERT_OK && !r.emision) sheet.getRange(r.row, C.emision + 1).setValue(new Date());
        addHistory(sheet, r.row, estatus + " (panel)" + (payload.nota ? " · " + String(payload.nota).slice(0, 140) : ""));
        n += 1;
      });
      SpreadsheetApp.flush();
      const avisos = estatus === CERT_OK && payload.notificar ? notificarAutorizadas(true) : 0;
      return Object.assign(base, { ok: true, message: "Registros actualizados: " + n + (avisos ? ". Avisos enviados: " + avisos : "") + "." });
    } finally { lock.releaseLock(); }
  }

  if (op === "corregir") {
    const folio = String(payload.folio || "");
    const nombre = cleanText(payload.nombre, 120, "nombre");
    const sheet = getCertificateSheet();
    const r = readCertificateRows(sheet).filter(function (x) { return x.folio === folio; })[0];
    if (!r) throw new Error("No existe ese folio.");
    sheet.getRange(r.row, C.nombre + 1).setValue(safeCellValue(nombre));
    addHistory(sheet, r.row, "Corrección de nombre: «" + r.nombre + "» → «" + nombre + "»");
    return Object.assign(base, { ok: true, message: "Nombre corregido. La próxima descarga usará el nombre nuevo." });
  }

  if (op === "codigo") {
    const lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try {
      const sheet = getCodesSheet();
      const codes = readCodes();
      const code = normalizeCode(payload.codigo || "");
      const target = codes.filter(function (c) { return c.codigo === code; })[0];
      const horas = Number(payload.horas);
      if (payload.accion === "nuevo") {
        const used = {}; codes.forEach(function (c) { used[c.codigo] = true; });
        const nuevo = newCode(used);
        sheet.appendRow([nuevo, safeCellValue(payload.sesionId || "MANUAL"), safeCellValue(cleanText(payload.curso, 200, "curso")),
          safeCellValue(payload.fecha || "Autogestivo"), safeCellValue(payload.horario || ""), horas || "", horas ? clasificarHoras(horas).tipo : "REVISIÓN",
          payload.inicio || "", payload.cierre || "", "SI"]);
        return Object.assign(base, { ok: true, codigo: nuevo, message: "Código creado: " + nuevo });
      }
      if (!target) throw new Error("No existe ese código.");
      if (payload.accion === "regenerar") {
        const used = {}; codes.forEach(function (c) { used[c.codigo] = true; });
        const nuevo = newCode(used);
        sheet.getRange(target.row, 1).setValue(nuevo);
        return Object.assign(base, { ok: true, codigo: nuevo, message: "Código reemplazado. El anterior (" + code + ") ya no funciona para registros nuevos." });
      }
      sheet.getRange(target.row, 10).setValue(payload.activo ? "SI" : "NO");
      sheet.getRange(target.row, 8).setValue(payload.inicio ? new Date(payload.inicio) : "");
      sheet.getRange(target.row, 9).setValue(payload.cierre ? new Date(payload.cierre) : "");
      if (horas) { sheet.getRange(target.row, 6).setValue(horas); sheet.getRange(target.row, 7).setValue(clasificarHoras(horas).tipo); }
      return Object.assign(base, { ok: true, message: "Código " + code + " actualizado." });
    } finally { lock.releaseLock(); }
  }

  if (op === "lote") {
    const code = normalizeCode(payload.codigo || "");
    const rows = readCertificateRows(getCertificateSheet()).filter(function (r) { return r.codigo === code && r.estatus === CERT_OK; });
    return Object.assign(base, { ok: true, constancias: rows.map(function (r) { return certificatePayload(r, r.emision); }) });
  }

  throw new Error("Operación no reconocida.");
}

function checkAdminKey(key) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get("admin-fails") || 0);
  if (fails >= 8) throw new Error("Demasiados intentos. Espera 15 minutos.");
  const real = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY");
  if (!real) throw new Error("Configura la clave del panel desde el menú Jornada UVP de la hoja.");
  if (String(key || "") !== real) {
    cache.put("admin-fails", String(fails + 1), 900);
    throw new Error("Clave incorrecta.");
  }
}

/* ===================== UTILIDADES ===================== */
function siteBase() {
  if (SITE_URL.indexOf("http") !== 0) return "";
  return SITE_URL.replace(/index\.html$/, "").replace(/\/?$/, "/");
}

function toast(msg) {
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, "Jornada UVP", 8); } catch (e) { /* sin interfaz */ }
  console.log(msg);
}

function isInstitutionalEmail(v) { return /^[^\s@]+@([a-z0-9-]+\.)*uvp\.mx$/i.test(String(v || "").trim()); }
function normalizeCode(v) { return String(v == null ? "" : v).trim().toUpperCase().replace(/\s+/g, ""); }
function normalizeKey(v) { return String(v == null ? "" : v).trim().toUpperCase().replace(/\s+/g, ""); }
function normalizeName(v) {
  return String(v == null ? "" : v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
function formatIsoDate(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, "yyyy-MM-dd");
  return String(v == null ? "" : v).slice(0, 10);
}
function fmtDateTime(d) { return Utilities.formatDate(d, TZ, "dd/MM/yyyy HH:mm"); }
function toDateValue(v) {
  if (v instanceof Date) return v;
  let t = String(v == null ? "" : v).trim();
  if (!t) return null;
  t = t.replace(" ", "T");
  if (!/([zZ]|[+-]\d\d:?\d\d)$/.test(t)) t += "-06:00";
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}
function cleanText(v, max, label) {
  const t = String(v == null ? "" : v).trim();
  if (!t || t.length > max) throw new Error("Revisa el campo " + label + ".");
  return t;
}
function safeCellValue(v) {
  const t = String(v == null ? "" : v).trim();
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}
function parseSessionIds(v) {
  if (!v) return [];
  try { const p = JSON.parse(String(v)); return Array.isArray(p) ? p.map(String) : []; }
  catch (e) { return []; }
}
function escapeHtml(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
