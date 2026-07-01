(function(window){
  "use strict";

  var cfg = window.CargaConfig;
  var state = window.CargaState;
  if(!cfg || !state){ throw new Error("CargaConfig y CargaState deben cargarse antes de CargaApp."); }

  function safeArray(value){ return Array.isArray(value) ? value : []; }

  function processRows(rows, options){
    options = options || {};
    state.setProgress(0, 0, "Normalizando datos");
    state.setStatus(cfg.estados.mapping, "Normalizando datos");

    var normalized = window.CargaNormalizer.normalizeRows(rows, options);
    state.patch({ rows: rows, normalized: normalized });

    state.setProgress(0, 0, "Validando datos");
    state.setStatus(cfg.estados.validating, "Validando datos");

    var validation = window.CargaValidator.validate(normalized);
    var preview = window.CargaPreview.build(normalized, validation);

    state.patch({
      preview: preview.rows,
      errors: safeArray(validation.errors),
      warnings: safeArray(validation.warnings)
    });

    state.setProgress(normalized.total || safeArray(normalized.rowsMapeadas).length || 0, normalized.total || safeArray(normalized.rowsMapeadas).length || 0, validation.ok ? "Carga lista" : "Carga con errores");
    state.setStatus(validation.ok ? cfg.estados.ready : cfg.estados.error, validation.ok ? "Carga lista" : "Carga con errores");

    return { normalized: normalized, validation: validation, preview: preview };
  }

  function readFile(file, options){
    options = options || {};
    state.reset();
    state.setProgress(0, 0, "Leyendo archivo");
    state.setStatus(cfg.estados.reading, "Leyendo archivo");

    return window.CargaReaderFile.read(file).then(function(result){
      var meta = Object.assign({}, result, options || {});
      state.patch({ origen: result.origen, fileName: result.fileName, rows: result.rows });
      return processRows(result.rows, meta);
    });
  }

  function readClipboard(text, options){
    options = options || {};
    state.reset();
    state.setProgress(0, 0, "Leyendo datos pegados");
    state.setStatus(cfg.estados.reading, "Leyendo datos pegados");

    return window.CargaReaderClipboard.read(text).then(function(result){
      var meta = Object.assign({}, result, options || {});
      state.patch({ origen: result.origen, fileName: result.fileName, rows: result.rows });
      return processRows(result.rows, meta);
    });
  }

  function save(options){
    options = options || {};

    var current = state.get();
    var validation = {
      errors: safeArray(current.errors),
      warnings: safeArray(current.warnings),
      ok: safeArray(current.errors).length === 0,
      total: safeArray(current.rows).length
    };

    var originalProgress = typeof options.onProgress === "function" ? options.onProgress : null;

    options.onProgress = function(progress){
      progress = progress || {};
      state.setProgress(progress.current || 0, progress.total || 0, progress.message || "Guardando en BDLocal");
      if(originalProgress){ originalProgress(progress); }
    };

    state.setProgress(0, validation.total || 0, "Preparando guardado");
    state.setStatus(cfg.estados.committing, "Guardando en BDLocal");

    return window.CargaSave.save(current.normalized, validation, options).then(function(result){
      var latest = state.get();
      var latestValidation = {
        errors: safeArray(latest.errors),
        warnings: safeArray(latest.warnings),
        ok: safeArray(latest.errors).length === 0,
        total: safeArray(latest.rows).length
      };

      var report = window.CargaReport.build(result, latestValidation, latest);
      report.verificacion = result.verification || result.verificacion || null;
      report.modoGuardado = result.mode || result.modo || "actualizar";
      report.reemplazoPeriodo = !!result.replaced;
      report.mensajeGuardado = result.message || "";

      state.patch({ lastResult: report });

      var ok = report.ok && (!report.verificacion || report.verificacion.ok !== false);
      state.setProgress(report.guardados || 0, report.total || 0, ok ? "Guardado verificado" : "Guardado con diferencias");
      state.setStatus(ok ? cfg.estados.done : cfg.estados.error, ok ? "Carga guardada y verificada" : "Carga guardada con diferencias");

      return report;
    }).catch(function(error){
      state.setStatus(cfg.estados.error, error && error.message ? error.message : String(error));
      throw error;
    });
  }

  window.CargaApp = {
    processRows: processRows,
    readFile: readFile,
    readClipboard: readClipboard,
    save: save,
    state: state.get
  };
})(window);