(function(window){
  "use strict";

  var B = window.BDLRepoBase;
  var K = window.BDLKeys;
  var S = window.BDLSyncConfig;

  if(!B || !K || !S){
    throw new Error("BDLSyncLog requiere BDLRepoBase, BDLKeys y BDLSyncConfig.");
  }

  function crear(tipo, estado, detalle){
    var row = {
      id: K.id("sync_log"),
      tipo: tipo || "sync",
      estado: estado || S.estados.idle,
      detalle: detalle || {},
      inicio: S.now(),
      fin: "",
      createdAt: S.now()
    };
    return B.put(B.stores.syncLog, row).then(function(){ return row; });
  }

  function cerrar(log, estado, detalle){
    log.estado = estado || log.estado;
    log.detalle = Object.assign({}, log.detalle || {}, detalle || {});
    log.fin = S.now();
    return B.put(B.stores.syncLog, log).then(function(){ return log; });
  }

  function listar(limit){
    return B.list(B.stores.syncLog, { limit: Number(limit || 50) });
  }

  window.BDLSyncLog = { crear: crear, cerrar: cerrar, listar: listar };
})(window);
