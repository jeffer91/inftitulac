/* =========================================================
Nombre completo: carga.verify.js
Ruta: /Carga/process/carga.verify.js
Función:
- Verificar que la cantidad de estudiantes guardados en BDLocal
  coincida con la cantidad detectada en la carga.
- Generar resumen claro para la pantalla Carga.
========================================================= */
(function(window){
  "use strict";

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function now(){
    return new Date().toISOString();
  }

  function progress(options, current, total, message, phase){
    options = options || {};

    var detail = {
      current: Number(current || 0),
      total: Number(total || 0),
      message: message || "",
      phase: phase || "verify",
      at: now()
    };

    if(typeof options.onProgress === "function"){
      try{
        options.onProgress(detail);
      }catch(error){
        console.warn("[CargaVerify] Error ejecutando onProgress", error);
      }
    }

    try{
      window.dispatchEvent(new CustomEvent("carga:progress", { detail: detail }));
    }catch(error){}

    return detail;
  }

  function countByRepo(periodoId){
    if(
      window.BDLRepoEstudiantes &&
      typeof window.BDLRepoEstudiantes.contarPorPeriodo === "function"
    ){
      return window.BDLRepoEstudiantes.contarPorPeriodo(periodoId);
    }

    if(
      window.BDLRepoEstudiantes &&
      typeof window.BDLRepoEstudiantes.listarResumen === "function"
    ){
      return window.BDLRepoEstudiantes.listarResumen(periodoId, { limit: 0 }).then(function(rows){
        return Array.isArray(rows) ? rows.length : 0;
      });
    }

    return Promise.reject(new Error("No hay método disponible para contar estudiantes por período."));
  }

  function countByDB(periodoId){
    if(!window.BDLDB || !window.BDLConfig || !window.BDLConfig.stores){
      return Promise.reject(new Error("BDLDB o BDLConfig no están disponibles."));
    }

    if(typeof window.BDLDB.byIndex === "function"){
      return window.BDLDB.byIndex(
        window.BDLConfig.stores.estudiantesResumen,
        "by_periodoId",
        periodoId,
        { limit: 0 }
      ).then(function(rows){
        return Array.isArray(rows) ? rows.length : 0;
      });
    }

    if(typeof window.BDLDB.list === "function"){
      return window.BDLDB.list(
        window.BDLConfig.stores.estudiantesResumen,
        { index: "by_periodoId", value: periodoId, limit: 0 }
      ).then(function(rows){
        return Array.isArray(rows) ? rows.length : 0;
      });
    }

    return Promise.reject(new Error("BDLDB no tiene método de conteo compatible."));
  }

  function count(periodoId){
    periodoId = text(periodoId);

    if(!periodoId){
      return Promise.resolve(0);
    }

    return countByRepo(periodoId).catch(function(){
      return countByDB(periodoId);
    });
  }

  function verifyPeriod(periodoId, expected, options){
    options = options || {};
    periodoId = text(periodoId);
    expected = Number(expected || 0);

    if(!periodoId){
      return Promise.resolve({
        ok: false,
        periodoId: "",
        esperados: expected,
        guardados: 0,
        diferencia: -expected,
        message: "No se pudo verificar porque el período está vacío.",
        at: now()
      });
    }

    progress(options, 0, expected || 1, "Verificando BDLocal", "verify");

    return count(periodoId).then(function(saved){
      saved = Number(saved || 0);

      var result = {
        ok: saved === expected,
        periodoId: periodoId,
        esperados: expected,
        guardados: saved,
        diferencia: saved - expected,
        message: saved === expected
          ? "Verificación correcta: todos los estudiantes detectados están guardados."
          : "Verificación con diferencias: la cantidad guardada no coincide con la cantidad detectada.",
        at: now()
      };

      progress(options, saved, expected || saved || 1, result.message, "verify");

      try{
        window.dispatchEvent(new CustomEvent("carga:verified", { detail: result }));
      }catch(error){}

      return result;
    }).catch(function(error){
      var result = {
        ok: false,
        periodoId: periodoId,
        esperados: expected,
        guardados: 0,
        diferencia: -expected,
        message: "No se pudo verificar la carga: " + (error && error.message ? error.message : String(error)),
        at: now()
      };

      progress(options, 0, expected || 1, result.message, "verify");

      return result;
    });
  }

  function verifyNormalized(normalized, options){
    normalized = normalized || {};
    options = options || {};

    var rows = Array.isArray(normalized.rowsMapeadas) ? normalized.rowsMapeadas : [];
    var detected = normalized.periodoDetectado || {};
    var first = rows[0] || {};

    var periodoId = text(
      options.periodoId ||
      detected.periodoId ||
      detected.id ||
      detected.value ||
      first.periodoId ||
      first.PeriodoId ||
      first.periodo ||
      first.Periodo ||
      ""
    );

    return verifyPeriod(periodoId, rows.length, options);
  }

  function buildSummary(verification){
    verification = verification || {};

    var ok = verification.ok === true;
    var expected = Number(verification.esperados || 0);
    var saved = Number(verification.guardados || 0);
    var diff = Number(verification.diferencia || 0);

    return {
      ok: ok,
      titulo: ok ? "Carga verificada" : "Carga con diferencias",
      estado: ok ? "correcta" : "revisar",
      periodoId: verification.periodoId || "",
      esperados: expected,
      guardados: saved,
      diferencia: diff,
      mensaje: verification.message || "",
      detalle: ok
        ? "Detectados: " + expected + " · Guardados: " + saved
        : "Detectados: " + expected + " · Guardados: " + saved + " · Diferencia: " + diff,
      at: verification.at || now()
    };
  }

  window.CargaVerify = {
    count: count,
    verifyPeriod: verifyPeriod,
    verifyNormalized: verifyNormalized,
    buildSummary: buildSummary
  };
})(window);