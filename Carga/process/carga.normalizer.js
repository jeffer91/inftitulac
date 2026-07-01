/* =========================================================
Nombre completo: carga.normalizer.js
Ruta: /Carga/process/carga.normalizer.js
Función:
- Mapear filas leídas a campos internos.
- Normalizar carrera.
- Aplicar seguridad contra carreras dañadas o duplicadas.
- Detectar período, carreras y metadata de lectura.
- Conservar información útil del lector para validación y reporte.
========================================================= */
(function(window){
  "use strict";

  function safeArray(value){
    return Array.isArray(value) ? value : [];
  }

  function countDamagedCharacters(rows){
    var total = 0;

    safeArray(rows).forEach(function(row){
      Object.keys(row || {}).forEach(function(field){
        var fieldText = String(field || "");
        var valueText = String(row[field] == null ? "" : row[field]);

        total += (fieldText.match(/\uFFFD/g) || []).length;
        total += (valueText.match(/\uFFFD/g) || []).length;
      });
    });

    return total;
  }

  function normalizeCareerRows(rows){
    rows = safeArray(rows);

    if(!window.BDLNormCarrera || typeof window.BDLNormCarrera.normalizeRow !== "function"){
      return rows;
    }

    return rows.map(function(row){
      return window.BDLNormCarrera.normalizeRow(row || {});
    });
  }

  function applyCareerGuard(rows, options){
    rows = safeArray(rows);
    options = options || {};

    if(!window.CargaCarrerasGuard || typeof window.CargaCarrerasGuard.cleanRows !== "function"){
      return {
        rows: rows,
        report: {
          ok: true,
          skipped: true,
          reason: "CargaCarrerasGuard no está cargado.",
          applied: [],
          doubtful: [],
          unresolved: [],
          totalApplied: 0,
          totalDoubtful: 0,
          totalUnresolved: 0
        }
      };
    }

    return window.CargaCarrerasGuard.cleanRows(rows, {
      periodoId: options.periodoId || "",
      periodoLabel: options.periodoLabel || "",
      carrerasReferencia: options.carrerasReferencia || []
    });
  }

  function buildMetadata(options, rowsOriginales, rowsMapeadas, carreraGuardReport){
    options = options || {};

    var readerMeta = options.readerMeta || {};

    return {
      fileName: options.fileName || "",
      origen: options.origen || "",
      detectedType: options.detectedType || readerMeta.detectedType || "",
      encoding: options.encoding || readerMeta.encoding || "",
      sheetName: options.sheetName || readerMeta.sheetName || "",
      sheetCount: Number(options.sheetCount || readerMeta.sheetCount || 0),
      confidence: readerMeta.confidence || "",
      replacements: Number(readerMeta.replacements || 0),
      mojibake: Number(readerMeta.mojibake || 0),
      columnsRemoved: safeArray(readerMeta.columnsRemoved),
      tableIndex: readerMeta.tableIndex,
      totalTables: Number(readerMeta.totalTables || 0),
      headerIndex: readerMeta.headerIndex,
      rowCount: Number(readerMeta.rowCount || safeArray(rowsOriginales).length || 0),
      damagedCharactersOriginal: countDamagedCharacters(rowsOriginales),
      damagedCharactersMapped: countDamagedCharacters(rowsMapeadas),
      carreraGuardReport: carreraGuardReport || {
        ok: true,
        applied: [],
        doubtful: [],
        unresolved: [],
        totalApplied: 0,
        totalDoubtful: 0,
        totalUnresolved: 0
      }
    };
  }

  function normalizeRows(rows, options){
    options = options || {};
    rows = safeArray(rows);

    var mapped = window.CargaFieldMap
      ? window.CargaFieldMap.mapRows(rows)
      : rows;

    mapped = normalizeCareerRows(mapped);

    var guarded = applyCareerGuard(mapped, options);
    mapped = safeArray(guarded.rows);

    mapped = normalizeCareerRows(mapped);

    var periodoDetectado = window.CargaDetectPeriodo
      ? window.CargaDetectPeriodo.detect(mapped, options.periodoId, options.periodoLabel)
      : {
          periodoId: options.periodoId || "SIN_PERIODO",
          periodoLabel: options.periodoLabel || options.periodoId || "Sin período",
          counts: {}
        };

    var carrerasDetectadas = window.CargaDetectCarrera
      ? window.CargaDetectCarrera.detect(mapped)
      : {};

    var metadata = buildMetadata(options, rows, mapped, guarded.report);

    return {
      origen: options.origen || "",
      detectedType: options.detectedType || metadata.detectedType || "",
      fileName: options.fileName || "",
      encoding: metadata.encoding || "",
      metadata: metadata,
      periodoDetectado: periodoDetectado,
      carrerasDetectadas: carrerasDetectadas,
      carreraGuardReport: guarded.report || metadata.carreraGuardReport,
      rowsOriginales: rows,
      rowsMapeadas: mapped,
      total: mapped.length,
      createdAt: new Date().toISOString()
    };
  }

  window.CargaNormalizer = {
    normalizeRows: normalizeRows,
    countDamagedCharacters: countDamagedCharacters,
    applyCareerGuard: applyCareerGuard
  };
})(window);