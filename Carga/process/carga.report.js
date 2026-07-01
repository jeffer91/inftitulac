/* =========================================================
Nombre completo: carga.report.js
Ruta: /Carga/process/carga.report.js
Función:
- Generar resumen final de la carga.
- Mostrar campos, carreras, requisitos y metadata de lectura.
- Ayudar a verificar si el archivo .xls viejo fue leído correctamente.
========================================================= */
(function(window){
  "use strict";

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function safeArray(value){
    return Array.isArray(value) ? value : [];
  }

  function unique(values){
    var map = {};
    var out = [];

    safeArray(values).forEach(function(value){
      var clean = text(value);
      var key = clean.toLowerCase();

      if(clean && !map[key]){
        map[key] = true;
        out.push(clean);
      }
    });

    return out;
  }

  function rowsFromState(state){
    state = state || {};

    var normalized = state.normalized || {};

    return Array.isArray(normalized.rowsMapeadas) ? normalized.rowsMapeadas : [];
  }

  function collectFields(rows){
    var fields = [];

    safeArray(rows).slice(0, 100).forEach(function(row){
      Object.keys(row || {}).forEach(function(key){
        fields.push(key);
      });
    });

    return unique(fields).sort(function(a, b){
      return a.localeCompare(b, "es");
    });
  }

  function collectCareers(rows){
    return unique(safeArray(rows).map(function(row){
      row = row || {};

      return row.nombreCarrera ||
        row.NombreCarrera ||
        row.Carrera ||
        row.carrera ||
        row.carreraNormalizada ||
        row.nombreCarreraOriginal ||
        row.programa ||
        "";
    })).sort(function(a, b){
      return a.localeCompare(b, "es");
    });
  }

  function collectRequirements(rows){
    if(window.CargaDetectRequisitos && typeof window.CargaDetectRequisitos.detect === "function"){
      return window.CargaDetectRequisitos.detect(rows)
        .filter(function(item){
          return !!item.detected;
        })
        .map(function(item){
          return item.campoFirebase || item.requisitoId || "";
        });
    }

    return [];
  }

  function shortErrors(errors, limit){
    limit = Number(limit || 8);

    return safeArray(errors).slice(0, limit).map(function(error){
      return {
        row: error.row || 0,
        tipo: error.tipo || "",
        mensaje: error.mensaje || ""
      };
    });
  }

  function shortWarnings(warnings, limit){
    limit = Number(limit || 8);

    return safeArray(warnings).slice(0, limit).map(function(warning){
      return {
        row: warning.row || 0,
        tipo: warning.tipo || "",
        mensaje: warning.mensaje || ""
      };
    });
  }

  function buildLectura(normalized){
    normalized = normalized || {};

    var metadata = normalized.metadata || {};
    var columnsRemoved = safeArray(metadata.columnsRemoved);

    return {
      tipoDetectado: metadata.detectedType || normalized.detectedType || "",
      encoding: metadata.encoding || normalized.encoding || "",
      confianza: metadata.confidence || "",
      hoja: metadata.sheetName || "",
      totalHojas: Number(metadata.sheetCount || 0),
      tablaHtml: metadata.tableIndex == null ? "" : metadata.tableIndex,
      totalTablasHtml: Number(metadata.totalTables || 0),
      filaEncabezado: metadata.headerIndex == null ? "" : Number(metadata.headerIndex || 0) + 1,
      caracteresDanados: Number(metadata.damagedCharactersMapped || metadata.damagedCharactersOriginal || 0),
      reemplazos: Number(metadata.replacements || 0),
      mojibake: Number(metadata.mojibake || 0),
      columnasEliminadas: columnsRemoved,
      totalColumnasEliminadas: columnsRemoved.length,
      filasLeidas: Number(metadata.rowCount || normalized.total || 0)
    };
  }

  function build(result, validation, state){
    result = result || {};
    validation = validation || {};
    state = state || {};

    var normalized = state.normalized || {};
    var periodo = normalized.periodoDetectado || {};
    var rows = rowsFromState(state);
    var campos = collectFields(rows);
    var carreras = collectCareers(rows);
    var requisitos = unique(collectRequirements(rows));
    var lectura = buildLectura(normalized);
    var errors = safeArray(validation.errors);
    var warnings = safeArray(validation.warnings);

    return {
      ok: !!result.ok && validation.ok !== false,
      total: result.total || validation.total || normalized.total || rows.length || 0,
      guardados: result.saved || 0,
      errores: errors.length + Number(result.errors || 0),
      advertencias: warnings.length,
      archivo: normalized.fileName || state.fileName || "",
      periodo: {
        id: periodo.periodoId || "",
        label: periodo.periodoLabel || periodo.periodoId || ""
      },
      lectura: lectura,
      campos: {
        total: campos.length,
        nombres: campos
      },
      carreras: {
        total: carreras.length,
        nombres: carreras
      },
      requisitos: {
        total: requisitos.length,
        nombres: requisitos
      },
      erroresDetalle: shortErrors(errors, 10),
      advertenciasDetalle: shortWarnings(warnings, 10),
      detalle: {
        result: result,
        validation: validation,
        normalized: normalized
      },
      createdAt: new Date().toISOString()
    };
  }

  window.CargaReport = {
    build: build,
    buildLectura: buildLectura
  };
})(window);