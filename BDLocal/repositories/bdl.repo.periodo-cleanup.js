/* =========================================================
Nombre completo: bdl.repo.periodo-cleanup.js
Ruta: /BDLocal/repositories/bdl.repo.periodo-cleanup.js
Función:
- Limpiar de forma segura todos los datos asociados a un período.
- Usarse antes de una carga completa/reemplazo.
- Borrar estudiantes, requisitos, notas, divisiones, errores y dashboard.
- No borrar el período salvo que se pida explícitamente.
========================================================= */
(function(window){
  "use strict";

  var B = window.BDLRepoBase;

  if(!B){
    throw new Error("BDLRepoPeriodoCleanup requiere BDLRepoBase.");
  }

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function now(){
    return new Date().toISOString();
  }

  function safeArray(value){
    return Array.isArray(value) ? value : [];
  }

  function progress(options, current, total, message, phase){
    options = options || {};

    var detail = {
      current: Number(current || 0),
      total: Number(total || 0),
      message: message || "",
      phase: phase || "cleanup",
      at: now()
    };

    if(typeof options.onProgress === "function"){
      try{
        options.onProgress(detail);
      }catch(error){
        console.warn("[BDLRepoPeriodoCleanup] Error ejecutando onProgress", error);
      }
    }

    try{
      window.dispatchEvent(new CustomEvent("bdlocal:estudiantes-progress", { detail: detail }));
    }catch(error){}

    try{
      window.dispatchEvent(new CustomEvent("carga:progress", { detail: detail }));
    }catch(error){}

    return detail;
  }

  function storePlan(){
    var stores = B.stores || {};

    return [
      {
        key: "estudianteRequisitos",
        store: stores.estudianteRequisitos,
        index: "by_periodoId",
        idField: "id",
        label: "requisitos de estudiantes"
      },
      {
        key: "estudianteNotas",
        store: stores.estudianteNotas,
        index: "by_periodoId",
        idField: "idNota",
        label: "notas de estudiantes"
      },
      {
        key: "estudianteDivisiones",
        store: stores.estudianteDivisiones,
        index: "by_periodoId",
        idField: "id",
        label: "divisiones de estudiantes"
      },
      {
        key: "erroresDatos",
        store: stores.erroresDatos,
        index: "by_periodoId",
        idField: "id",
        label: "errores de datos"
      },
      {
        key: "estudiantesDetalle",
        store: stores.estudiantesDetalle,
        index: "by_periodoId",
        idField: "idEstudiantePeriodo",
        label: "detalles de estudiantes"
      },
      {
        key: "estudiantesResumen",
        store: stores.estudiantesResumen,
        index: "by_periodoId",
        idField: "idEstudiantePeriodo",
        label: "resúmenes de estudiantes"
      },
      {
        key: "dashboardCache",
        store: stores.dashboardCache,
        index: "by_periodoId",
        idField: "id",
        label: "dashboard del período"
      }
    ].filter(function(item){
      return !!item.store;
    });
  }

  function listByPeriod(storeName, indexName, periodoId){
    if(!storeName){
      return Promise.resolve([]);
    }

    if(typeof B.byIndex === "function"){
      return B.byIndex(storeName, indexName || "by_periodoId", periodoId, { limit: 0 })
        .then(function(rows){ return safeArray(rows); });
    }

    if(typeof B.list === "function"){
      return B.list(storeName, {
        index: indexName || "by_periodoId",
        value: periodoId,
        limit: 0
      }).then(function(rows){ return safeArray(rows); });
    }

    return Promise.resolve([]);
  }

  function removeOne(storeName, key){
    key = text(key);

    if(!storeName || !key){
      return Promise.resolve(false);
    }

    if(typeof B.remove === "function"){
      return B.remove(storeName, key).then(function(){
        return true;
      });
    }

    if(typeof B.delete === "function"){
      return B.delete(storeName, key).then(function(){
        return true;
      });
    }

    return Promise.resolve(false);
  }

  function cleanupStore(item, periodoId, options){
    options = options || {};

    return listByPeriod(item.store, item.index, periodoId).then(function(rows){
      var result = {
        key: item.key,
        store: item.store,
        label: item.label,
        found: rows.length,
        deleted: 0,
        failed: 0,
        errors: []
      };

      var chain = Promise.resolve();

      rows.forEach(function(row, index){
        chain = chain.then(function(){
          var id = text(row && row[item.idField]);

          if(!id){
            result.failed += 1;
            result.errors.push({
              index: index,
              message: "Registro sin clave primaria " + item.idField
            });
            return result;
          }

          return removeOne(item.store, id).then(function(done){
            if(done){
              result.deleted += 1;
            }else{
              result.failed += 1;
              result.errors.push({
                id: id,
                message: "No se pudo borrar el registro."
              });
            }
            return result;
          }).catch(function(error){
            result.failed += 1;
            result.errors.push({
              id: id,
              message: error && error.message ? error.message : String(error)
            });
            return result;
          });
        });
      });

      return chain.then(function(){
        return result;
      });
    });
  }

  function refreshSnapshot(){
    if(window.BDLRepoEstudiantes && typeof window.BDLRepoEstudiantes.mirrorSnapshot === "function"){
      return window.BDLRepoEstudiantes.mirrorSnapshot().catch(function(error){
        console.warn("[BDLRepoPeriodoCleanup] No se pudo refrescar snapshot legacy", error);
        return null;
      });
    }

    return Promise.resolve(null);
  }

  function clearCache(){
    try{
      if(typeof B.cacheClear === "function"){
        B.cacheClear();
      }
    }catch(error){}

    try{
      if(window.BDLCache && typeof window.BDLCache.clear === "function"){
        window.BDLCache.clear();
      }
    }catch(error){}
  }

  function cleanupPeriod(periodoId, options){
    options = options || {};
    periodoId = text(periodoId);

    if(!periodoId){
      return Promise.resolve({
        ok: false,
        periodoId: "",
        deleted: 0,
        failed: 0,
        stores: [],
        message: "No se limpió nada porque periodoId está vacío.",
        startedAt: now(),
        finishedAt: now()
      });
    }

    var plan = storePlan();
    var result = {
      ok: true,
      periodoId: periodoId,
      deleted: 0,
      failed: 0,
      stores: [],
      message: "",
      startedAt: now(),
      finishedAt: ""
    };

    progress(options, 0, plan.length || 1, "Iniciando limpieza del período", "cleanup");

    var chain = Promise.resolve();

    plan.forEach(function(item, index){
      chain = chain.then(function(){
        progress(options, index, plan.length, "Limpiando " + item.label, "cleanup");

        return cleanupStore(item, periodoId, options).then(function(storeResult){
          result.stores.push(storeResult);
          result.deleted += Number(storeResult.deleted || 0);
          result.failed += Number(storeResult.failed || 0);

          progress(
            options,
            index + 1,
            plan.length,
            "Limpieza de " + item.label + " finalizada",
            "cleanup"
          );

          return storeResult;
        });
      });
    });

    return chain.then(function(){
      clearCache();

      return refreshSnapshot();
    }).then(function(){
      result.ok = result.failed === 0;
      result.finishedAt = now();
      result.message = result.ok
        ? "Limpieza del período finalizada correctamente."
        : "Limpieza del período finalizada con algunos registros no eliminados.";

      progress(options, plan.length, plan.length, result.message, "cleanup");

      try{
        window.dispatchEvent(new CustomEvent("bdlocal:periodo-cleaned", { detail: result }));
      }catch(error){}

      return result;
    });
  }

  function deletePeriodOnly(periodoId){
    periodoId = text(periodoId);

    if(!periodoId){
      return Promise.resolve({
        ok: false,
        periodoId: "",
        message: "No se puede borrar un período vacío."
      });
    }

    if(!B.stores || !B.stores.periodos){
      return Promise.reject(new Error("No existe el store de períodos."));
    }

    return removeOne(B.stores.periodos, periodoId).then(function(){
      clearCache();
      return {
        ok: true,
        periodoId: periodoId,
        message: "Período eliminado."
      };
    });
  }

  function deletePeriodWithData(periodoId, options){
    options = options || {};

    return cleanupPeriod(periodoId, options).then(function(cleanup){
      return deletePeriodOnly(periodoId).then(function(deletedPeriod){
        return {
          ok: cleanup.ok && deletedPeriod.ok,
          periodoId: periodoId,
          cleanup: cleanup,
          deletedPeriod: deletedPeriod,
          message: cleanup.ok
            ? "Período y datos asociados eliminados correctamente."
            : "El período fue eliminado, pero la limpieza tuvo observaciones."
        };
      });
    });
  }

  function installAdapters(){
    if(window.BDLRepoEstudiantes && typeof window.BDLRepoEstudiantes.borrarPorPeriodo !== "function"){
      window.BDLRepoEstudiantes.borrarPorPeriodo = cleanupPeriod;
    }

    if(window.BDLRepoPeriodos){
      if(typeof window.BDLRepoPeriodos.borrarConDatos !== "function"){
        window.BDLRepoPeriodos.borrarConDatos = deletePeriodWithData;
      }

      if(typeof window.BDLRepoPeriodos.limpiarDatosPeriodo !== "function"){
        window.BDLRepoPeriodos.limpiarDatosPeriodo = cleanupPeriod;
      }
    }
  }

  var api = {
    cleanupPeriod: cleanupPeriod,
    deletePeriodOnly: deletePeriodOnly,
    deletePeriodWithData: deletePeriodWithData,
    storePlan: storePlan,
    installAdapters: installAdapters
  };

  window.BDLRepoPeriodoCleanup = api;

  try{
    installAdapters();
  }catch(error){
    console.warn("[BDLRepoPeriodoCleanup] No se pudieron instalar adaptadores", error);
  }
})(window);