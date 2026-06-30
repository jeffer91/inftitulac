(function(window){
  "use strict";

  var B = window.BDLRepoBase;
  var K = window.BDLKeys;
  var S = window.BDLSyncConfig;

  if(!B || !K || !S){
    throw new Error("BDLSyncQueue requiere BDLRepoBase, BDLKeys y BDLSyncConfig.");
  }

  function agregar(tabla, accion, idRegistro, datos){
    var row = {
      id: K.id("sync_queue"),
      tabla: tabla || "",
      accion: accion || "upsert",
      idRegistro: idRegistro || "",
      datos: datos || {},
      estado: S.queueEstados.pendiente,
      intentos: 0,
      error: "",
      createdAt: S.now(),
      updatedAt: S.now()
    };
    return B.put(B.stores.syncQueue, row).then(function(){ return row; });
  }

  function pendientes(limit){
    return B.byIndex(B.stores.syncQueue, "by_estado", S.queueEstados.pendiente, { limit: Number(limit || S.limites.loteSubida) });
  }

  function marcarProcesando(item){
    item.estado = S.queueEstados.procesando;
    item.updatedAt = S.now();
    return B.put(B.stores.syncQueue, item);
  }

  function marcarSincronizado(item){
    item.estado = S.queueEstados.sincronizado;
    item.error = "";
    item.updatedAt = S.now();
    return B.put(B.stores.syncQueue, item);
  }

  function marcarError(item, error){
    item.estado = S.queueEstados.error;
    item.intentos = Number(item.intentos || 0) + 1;
    item.error = error && error.message ? error.message : String(error || "Error de sincronización");
    item.updatedAt = S.now();
    return B.put(B.stores.syncQueue, item);
  }

  window.BDLSyncQueue = {
    agregar: agregar,
    pendientes: pendientes,
    marcarProcesando: marcarProcesando,
    marcarSincronizado: marcarSincronizado,
    marcarError: marcarError
  };
})(window);
