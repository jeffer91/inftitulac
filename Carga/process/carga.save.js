(function(window){
  "use strict";

  function safeArray(value){ return Array.isArray(value) ? value : []; }
  function text(value){ return String(value == null ? "" : value).trim(); }

  function progress(options, current, total, message, phase){
    options = options || {};
    var detail = {
      current: Number(current || 0),
      total: Number(total || 0),
      message: message || "",
      phase: phase || ""
    };

    if(typeof options.onProgress === "function"){
      try{ options.onProgress(detail); }catch(error){ console.warn("[CargaSave] Error en onProgress", error); }
    }

    try{ window.dispatchEvent(new CustomEvent("carga:progress", { detail: detail })); }catch(error){}
    return detail;
  }

  function periodoInfoFrom(normalized, options){
    normalized = normalized || {};
    options = options || {};

    var detected = normalized.periodoDetectado || {};
    var periodoId = text(options.periodoId || detected.periodoId || detected.id || detected.value || "");
    var periodoLabel = text(options.periodoLabel || detected.periodoLabel || detected.label || periodoId || "");

    if(!periodoId && normalized.rowsMapeadas && normalized.rowsMapeadas[0]){
      var first = normalized.rowsMapeadas[0] || {};
      periodoId = text(first.periodoId || first.PeriodoId || first.periodo || first.Periodo || "");
      periodoLabel = text(first.periodoLabel || first.PeriodoLabel || first.periodo || first.Periodo || periodoId);
    }

    return {
      periodoId: periodoId,
      periodoLabel: periodoLabel || periodoId
    };
  }

  function verify(periodoInfo, expected, options){
    options = options || {};
    var periodoId = text(periodoInfo && periodoInfo.periodoId);
    expected = Number(expected || 0);

    progress(options, expected, expected, "Verificando guardado en BDLocal", "verify");

    if(!periodoId || !window.BDLRepoEstudiantes || typeof window.BDLRepoEstudiantes.verificarPeriodo !== "function"){
      return Promise.resolve({
        ok: false,
        periodoId: periodoId,
        esperados: expected,
        guardados: 0,
        message: "No se pudo verificar porque falta BDLRepoEstudiantes.verificarPeriodo."
      });
    }

    return window.BDLRepoEstudiantes.verificarPeriodo(periodoId, expected).then(function(result){
      progress(options, result.guardados || 0, expected, result.ok ? "Verificación correcta" : "Verificación con diferencias", "verify");
      return result;
    });
  }

  function runPostTasks(rows, periodoInfo, options){
    options = options || {};
    var tasks = [];

    progress(options, 0, 3, "Recalculando datos relacionados", "post");

    if(window.BDLRepoCarreras){
      tasks.push(window.BDLRepoCarreras.guardarDesdeEstudiantes(rows).then(function(result){
        progress(options, 1, 3, "Carreras actualizadas", "post");
        return result;
      }));
    }

    if(window.BDLRepoRequisitos){
      tasks.push(window.BDLRepoRequisitos.guardarCatalogo().then(function(result){
        progress(options, 2, 3, "Catálogo de requisitos actualizado", "post");
        return result;
      }));
    }

    if(window.BDLRepoDashboard && periodoInfo && periodoInfo.periodoId){
      tasks.push(window.BDLRepoDashboard.recalcularBasico(periodoInfo.periodoId).then(function(result){
        progress(options, 3, 3, "Dashboard recalculado", "post");
        return result;
      }));
    }

    if(!tasks.length){
      progress(options, 3, 3, "No hay tareas posteriores pendientes", "post");
    }

    return Promise.all(tasks).then(function(){ return true; });
  }

  function save(normalized, validation, options){
    options = options || {};
    normalized = normalized || {};
    validation = validation || {};

    var rows = safeArray(normalized.rowsMapeadas);
    var periodoInfo = periodoInfoFrom(normalized, options);
    var replacePeriod = options.replacePeriod === true || options.modo === "replacePeriod" || options.mode === "replacePeriod";

    if(validation.ok === false && options.allowErrors !== true){
      return Promise.resolve({
        ok: false,
        saved: 0,
        total: normalized.total || rows.length || 0,
        errors: safeArray(validation.errors).length,
        message: "La carga tiene errores y no fue guardada."
      });
    }

    if(!window.BDLRepoEstudiantes){
      return Promise.reject(new Error("BDLRepoEstudiantes no está disponible."));
    }

    if(!rows.length){
      return Promise.resolve({
        ok: false,
        saved: 0,
        total: 0,
        errors: 0,
        message: "No hay estudiantes para guardar."
      });
    }

    if(!periodoInfo.periodoId){
      return Promise.resolve({
        ok: false,
        saved: 0,
        total: rows.length,
        errors: 1,
        message: "No se detectó período de destino."
      });
    }

    progress(options, 0, rows.length, replacePeriod ? "Preparando reemplazo completo del período" : "Preparando actualización del período", "prepare");

    var savePromise;

    if(replacePeriod && typeof window.BDLRepoEstudiantes.reemplazarPorPeriodo === "function"){
      savePromise = window.BDLRepoEstudiantes.reemplazarPorPeriodo(rows, periodoInfo, options);
    }else if(replacePeriod && typeof window.BDLRepoEstudiantes.borrarPorPeriodo === "function"){
      savePromise = window.BDLRepoEstudiantes.borrarPorPeriodo(periodoInfo.periodoId, options).then(function(cleanup){
        return window.BDLRepoEstudiantes.guardarMuchos(rows, periodoInfo, options).then(function(result){
          return Object.assign({}, result, { cleanup: cleanup, replaced: true });
        });
      });
    }else{
      savePromise = window.BDLRepoEstudiantes.guardarMuchos(rows, periodoInfo, options).then(function(result){
        return Object.assign({}, result, { replaced: false });
      });
    }

    return savePromise.then(function(result){
      return runPostTasks(rows, periodoInfo, options).then(function(){ return result; });
    }).then(function(result){
      return verify(periodoInfo, rows.length, options).then(function(verification){
        return Object.assign({
          ok: verification.ok !== false,
          mode: replacePeriod ? "replacePeriod" : "updatePeriod",
          replaced: replacePeriod,
          periodoId: periodoInfo.periodoId,
          periodoLabel: periodoInfo.periodoLabel,
          total: rows.length,
          saved: result.saved || 0,
          errors: result.errors || 0,
          verification: verification,
          message: verification.ok ? "Carga guardada y verificada correctamente." : "Carga guardada, pero la verificación encontró diferencias."
        }, result);
      });
    });
  }

  window.CargaSave = { save: save };
})(window);