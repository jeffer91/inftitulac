/* =========================================================
Nombre completo: carga.full-save.js
Ruta: /Carga/process/carga.full-save.js
Función:
- Ejecutar carga completa de estudiantes por período.
- Limpiar datos anteriores del período antes de guardar.
- Guardar estudiantes nuevos con progreso.
- Verificar conteo final contra BDLocal.
- Mantener esta lógica separada de carga.save.js.
========================================================= */
(function(window){
  "use strict";

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function safeArray(value){
    return Array.isArray(value) ? value : [];
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
      phase: phase || "",
      at: now()
    };

    if(typeof options.onProgress === "function"){
      try{
        options.onProgress(detail);
      }catch(error){
        console.warn("[CargaFullSave] Error ejecutando onProgress", error);
      }
    }

    try{
      window.dispatchEvent(new CustomEvent("carga:progress", { detail: detail }));
    }catch(error){}

    return detail;
  }

  function getPeriodoInfo(normalized, options){
    normalized = normalized || {};
    options = options || {};

    var detected = normalized.periodoDetectado || {};
    var first = safeArray(normalized.rowsMapeadas)[0] || {};

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

    var periodoLabel = text(
      options.periodoLabel ||
      detected.periodoLabel ||
      detected.label ||
      first.periodoLabel ||
      first.PeriodoLabel ||
      first.periodo ||
      first.Periodo ||
      periodoId
    );

    return {
      periodoId: periodoId,
      periodoLabel: periodoLabel || periodoId
    };
  }

  function ensureRepos(){
    if(!window.BDLRepoEstudiantes){
      throw new Error("BDLRepoEstudiantes no está disponible.");
    }

    if(typeof window.BDLRepoEstudiantes.guardarMuchos !== "function"){
      throw new Error("BDLRepoEstudiantes.guardarMuchos no está disponible.");
    }

    if(typeof window.BDLRepoEstudiantes.borrarPorPeriodo !== "function"){
      throw new Error("BDLRepoEstudiantes.borrarPorPeriodo no está disponible.");
    }
  }

  function validateInput(normalized, validation, options){
    normalized = normalized || {};
    validation = validation || {};
    options = options || {};

    var rows = safeArray(normalized.rowsMapeadas);
    var periodoInfo = getPeriodoInfo(normalized, options);

    if(validation.ok === false && options.allowErrors !== true){
      return {
        ok: false,
        stop: true,
        result: {
          ok: false,
          mode: "replacePeriod",
          replaced: false,
          saved: 0,
          total: rows.length,
          errors: safeArray(validation.errors).length,
          periodoId: periodoInfo.periodoId,
          periodoLabel: periodoInfo.periodoLabel,
          message: "La carga tiene errores y no fue guardada."
        }
      };
    }

    if(!periodoInfo.periodoId){
      return {
        ok: false,
        stop: true,
        result: {
          ok: false,
          mode: "replacePeriod",
          replaced: false,
          saved: 0,
          total: rows.length,
          errors: 1,
          periodoId: "",
          periodoLabel: "",
          message: "No se detectó período de destino."
        }
      };
    }

    if(!rows.length){
      return {
        ok: false,
        stop: true,
        result: {
          ok: false,
          mode: "replacePeriod",
          replaced: false,
          saved: 0,
          total: 0,
          errors: 0,
          periodoId: periodoInfo.periodoId,
          periodoLabel: periodoInfo.periodoLabel,
          message: "No hay estudiantes para guardar."
        }
      };
    }

    return {
      ok: true,
      stop: false,
      rows: rows,
      periodoInfo: periodoInfo
    };
  }

  function postTasks(rows, periodoInfo, options){
    rows = safeArray(rows);
    options = options || {};

    var tasks = [];
    var totalTasks = 0;
    var doneTasks = 0;

    if(window.BDLRepoCarreras && typeof window.BDLRepoCarreras.guardarDesdeEstudiantes === "function"){
      totalTasks += 1;
      tasks.push(function(){
        return window.BDLRepoCarreras.guardarDesdeEstudiantes(rows).then(function(result){
          doneTasks += 1;
          progress(options, doneTasks, totalTasks, "Carreras actualizadas", "post");
          return result;
        });
      });
    }

    if(window.BDLRepoRequisitos && typeof window.BDLRepoRequisitos.guardarCatalogo === "function"){
      totalTasks += 1;
      tasks.push(function(){
        return window.BDLRepoRequisitos.guardarCatalogo().then(function(result){
          doneTasks += 1;
          progress(options, doneTasks, totalTasks, "Catálogo de requisitos actualizado", "post");
          return result;
        });
      });
    }

    if(
      window.BDLRepoDashboard &&
      typeof window.BDLRepoDashboard.recalcularBasico === "function" &&
      periodoInfo &&
      periodoInfo.periodoId
    ){
      totalTasks += 1;
      tasks.push(function(){
        return window.BDLRepoDashboard.recalcularBasico(periodoInfo.periodoId).then(function(result){
          doneTasks += 1;
          progress(options, doneTasks, totalTasks, "Dashboard recalculado", "post");
          return result;
        });
      });
    }

    if(!tasks.length){
      progress(options, 1, 1, "No hay tareas posteriores pendientes", "post");
      return Promise.resolve({ ok:true, tasks:0 });
    }

    progress(options, 0, totalTasks, "Actualizando datos relacionados", "post");

    var chain = Promise.resolve();
    tasks.forEach(function(task){
      chain = chain.then(task);
    });

    return chain.then(function(){
      return { ok:true, tasks:totalTasks };
    });
  }

  function verify(periodoInfo, expected, options){
    options = options || {};
    expected = Number(expected || 0);

    progress(options, 0, expected || 1, "Verificando estudiantes guardados", "verify");

    if(window.CargaVerify && typeof window.CargaVerify.verifyPeriod === "function"){
      return window.CargaVerify.verifyPeriod(periodoInfo.periodoId, expected, options);
    }

    if(window.BDLRepoEstudiantes && typeof window.BDLRepoEstudiantes.verificarPeriodo === "function"){
      return window.BDLRepoEstudiantes.verificarPeriodo(periodoInfo.periodoId, expected);
    }

    return Promise.resolve({
      ok: false,
      periodoId: periodoInfo.periodoId,
      esperados: expected,
      guardados: 0,
      diferencia: -expected,
      message: "No hay verificador disponible."
    });
  }

  function replacePeriod(normalized, validation, options){
    options = options || {};
    normalized = normalized || {};
    validation = validation || {};

    ensureRepos();

    var input = validateInput(normalized, validation, options);

    if(input.stop){
      return Promise.resolve(input.result);
    }

    var rows = input.rows;
    var periodoInfo = input.periodoInfo;

    var result = {
      ok: true,
      mode: "replacePeriod",
      replaced: true,
      periodoId: periodoInfo.periodoId,
      periodoLabel: periodoInfo.periodoLabel,
      total: rows.length,
      saved: 0,
      errors: 0,
      cleanup: null,
      verification: null,
      startedAt: now(),
      finishedAt: ""
    };

    progress(options, 0, rows.length, "Iniciando carga completa del período", "prepare");

    return window.BDLRepoEstudiantes.borrarPorPeriodo(periodoInfo.periodoId, options)
      .then(function(cleanup){
        result.cleanup = cleanup;
        progress(options, 0, rows.length, "Datos anteriores eliminados. Guardando estudiantes nuevos", "save");

        return window.BDLRepoEstudiantes.guardarMuchos(rows, periodoInfo, options);
      })
      .then(function(saveResult){
        result.saved = Number(saveResult && saveResult.saved || 0);
        result.errors = Number(saveResult && saveResult.errors || 0);

        return postTasks(rows, periodoInfo, options);
      })
      .then(function(postResult){
        result.post = postResult;

        return verify(periodoInfo, rows.length, options);
      })
      .then(function(verification){
        result.verification = verification;
        result.verificacion = verification;
        result.ok = verification && verification.ok !== false;
        result.finishedAt = now();
        result.message = result.ok
          ? "Carga completa guardada y verificada correctamente."
          : "La carga completa se guardó, pero la verificación encontró diferencias.";

        progress(
          options,
          verification ? verification.guardados : result.saved,
          verification ? verification.esperados : rows.length,
          result.message,
          "done"
        );

        return result;
      });
  }

  function updatePeriod(normalized, validation, options){
    options = options || {};
    normalized = normalized || {};
    validation = validation || {};

    if(!window.BDLRepoEstudiantes || typeof window.BDLRepoEstudiantes.guardarMuchos !== "function"){
      return Promise.reject(new Error("BDLRepoEstudiantes.guardarMuchos no está disponible."));
    }

    var input = validateInput(normalized, validation, options);

    if(input.stop){
      return Promise.resolve(Object.assign({}, input.result, {
        mode: "updatePeriod",
        replaced: false
      }));
    }

    var rows = input.rows;
    var periodoInfo = input.periodoInfo;

    progress(options, 0, rows.length, "Actualizando estudiantes del período", "save");

    return window.BDLRepoEstudiantes.guardarMuchos(rows, periodoInfo, options)
      .then(function(saveResult){
        return postTasks(rows, periodoInfo, options).then(function(){
          return saveResult;
        });
      })
      .then(function(saveResult){
        return verify(periodoInfo, rows.length, options).then(function(verification){
          return Object.assign({}, saveResult || {}, {
            ok: verification && verification.ok !== false,
            mode: "updatePeriod",
            replaced: false,
            periodoId: periodoInfo.periodoId,
            periodoLabel: periodoInfo.periodoLabel,
            total: rows.length,
            saved: Number(saveResult && saveResult.saved || 0),
            verification: verification,
            verificacion: verification,
            message: verification && verification.ok
              ? "Carga actualizada y verificada correctamente."
              : "La carga se actualizó, pero la verificación encontró diferencias."
          });
        });
      });
  }

  function save(normalized, validation, options){
    options = options || {};
    var replace = options.replacePeriod === true || options.mode === "replacePeriod" || options.modo === "replacePeriod";

    if(replace){
      return replacePeriod(normalized, validation, options);
    }

    return updatePeriod(normalized, validation, options);
  }

  window.CargaFullSave = {
    save: save,
    replacePeriod: replacePeriod,
    updatePeriod: updatePeriod,
    getPeriodoInfo: getPeriodoInfo,
    progress: progress
  };
})(window);