(function(window){
  "use strict";

  function normalizeRows(rows, options){
    options = options || {};
    rows = Array.isArray(rows) ? rows : [];
    var mapped = window.CargaFieldMap ? window.CargaFieldMap.mapRows(rows) : rows;
    var periodoDetectado = window.CargaDetectPeriodo ? window.CargaDetectPeriodo.detect(mapped, options.periodoId, options.periodoLabel) : { periodoId: options.periodoId || "SIN_PERIODO", periodoLabel: options.periodoLabel || options.periodoId || "Sin período" };
    var normalized = { origen: options.origen || "", fileName: options.fileName || "", periodoDetectado: periodoDetectado, rowsOriginales: rows, rowsMapeadas: mapped, total: mapped.length, createdAt: new Date().toISOString() };
    return normalized;
  }

  window.CargaNormalizer = { normalizeRows: normalizeRows };
})(window);