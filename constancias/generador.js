/*
 * Generador de constancias UVP (se ejecuta en el navegador y en Node).
 * Toma la plantilla institucional (constancias/plantilla-curso.pdf o plantilla-taller.pdf),
 * que ya trae logotipos, firmas y el lema, y completa solo los campos variables:
 * nombre, curso o taller, horas, fecha y horario, y fecha de emisión.
 */
(function (root) {
  "use strict";

  const LIB = typeof PDFLib !== "undefined" ? PDFLib : (typeof require === "function" ? require("pdf-lib") : null);

  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  // Medidas tomadas de la plantilla institucional (origen arriba-izquierda, puntos PDF).
  const POSICION = {
    nombre: { size: 22, base: 282, maxWidth: 600 },
    curso: { size: 14.5, bases: [333, 351], maxWidth: 430 },
    horas: { size: 13.5, base: 373 },
    horario: { size: 10.5, base: 391 },
    emision: { size: 12.8, base: 437 }
  };

  function fechaLarga(isoDate) {
    const [y, m, d] = String(isoDate || "").split("-").map(Number);
    if (!y || !m || !d) return "";
    return `${d} de ${MESES[m - 1]} de ${y}`;
  }

  function horasTexto(horas) {
    const n = Number(horas);
    if (!n) return "";
    return `${n} ${n === 1 ? "hora" : "horas"}`;
  }

  function ajustarLinea(font, texto, size, maxWidth) {
    let s = size;
    while (s > 9 && font.widthOfTextAtSize(texto, s) > maxWidth) s -= 0.5;
    return s;
  }

  function partirEnLineas(font, texto, size, maxWidth) {
    const palabras = String(texto).split(/\s+/);
    const lineas = [];
    let actual = "";
    palabras.forEach((p) => {
      const prueba = actual ? `${actual} ${p}` : p;
      if (font.widthOfTextAtSize(prueba, size) <= maxWidth) {
        actual = prueba;
      } else {
        if (actual) lineas.push(actual);
        actual = p;
      }
    });
    if (actual) lineas.push(actual);
    return lineas;
  }

  /**
   * @param {object} datos  { nombre, curso, horas, fechaCurso, horario, emision, autogestivo }
   * @param {ArrayBuffer|Uint8Array} plantilla  bytes del PDF base
   * @returns {Promise<Uint8Array>} bytes del PDF generado
   */
  async function generarConstancia(datos, plantilla) {
    if (!LIB) throw new Error("Biblioteca pdf-lib no disponible.");
    const { PDFDocument, StandardFonts, rgb } = LIB;
    const pdf = await PDFDocument.load(plantilla);
    const page = pdf.getPages()[0];
    const { height } = page.getSize();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const tinta = rgb(0.13, 0.12, 0.16);
    const centrar = (texto, font, size, baseTop) => {
      const ancho = font.widthOfTextAtSize(texto, size);
      const pageWidth = page.getSize().width;
      page.drawText(texto, { x: (pageWidth - ancho) / 2, y: height - baseTop, size, font, color: tinta });
    };

    const nombre = String(datos.nombre || "").trim();
    const sizeNombre = ajustarLinea(bold, nombre, POSICION.nombre.size, POSICION.nombre.maxWidth);
    centrar(nombre, bold, sizeNombre, POSICION.nombre.base);

    const lineasCurso = partirEnLineas(regular, datos.curso, POSICION.curso.size, POSICION.curso.maxWidth).slice(0, 2);
    lineasCurso.forEach((linea, i) => centrar(linea, regular, POSICION.curso.size, POSICION.curso.bases[i]));

    const horas = horasTexto(datos.horas);
    if (horas) {
      centrar(`con una duración de ${horas}.`, regular, POSICION.horas.size, POSICION.horas.base);
    }

    const detalle = datos.autogestivo
      ? "Modalidad autogestiva en la plataforma UVP Online"
      : `Impartido el ${fechaLarga(datos.fechaCurso)}, de ${String(datos.horario || "").replace("-", " a ")} h`;
    centrar(detalle, regular, POSICION.horario.size, POSICION.horario.base);

    const emision = fechaLarga(datos.emision);
    centrar(`H. Puebla de Z., a ${emision}.`, regular, POSICION.emision.size, POSICION.emision.base);

    // Folio de verificación (esquina inferior derecha, discreto): permite comprobar la autenticidad en el sitio.
    if (datos.folio) {
      const gris = rgb(0.45, 0.42, 0.5);
      const pageWidth = page.getSize().width;
      const linea1 = `Folio: ${datos.folio}`;
      const linea2 = datos.verificarUrl ? `Verifica su autenticidad en ${datos.verificarUrl}` : "";
      page.drawText(linea1, { x: pageWidth - 24 - bold.widthOfTextAtSize(linea1, 7.5), y: 20, size: 7.5, font: bold, color: gris });
      if (linea2) {
        const s = ajustarLinea(regular, linea2, 6.5, 360);
        page.drawText(linea2, { x: pageWidth - 24 - regular.widthOfTextAtSize(linea2, s), y: 11, size: s, font: regular, color: gris });
      }
      pdf.setKeywords([String(datos.folio)]);
    }

    pdf.setTitle(`Constancia - ${nombre}`);
    pdf.setAuthor("Universidad del Valle de Puebla");
    pdf.setSubject("Constancia de participación");
    return pdf.save();
  }

  const api = { generarConstancia, fechaLarga };
  root.GeneradorConstancia = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
