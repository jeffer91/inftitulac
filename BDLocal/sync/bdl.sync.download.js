(function(window){
  "use strict";

  var S = window.BDLSyncConfig;

  if(!S){ throw new Error("BDLSyncDownload requiere configuración."); }

  function firebaseReader(){
    if(window.BDLConnFirebase && typeof window.BDLConnFirebase.listUpdated === "function"){
      return function(collectionName, since, limit){ return window.BDLConnFirebase.listUpdated(collectionName, since, limit); };
    }
    if(window.BDLFirebaseDownload && typeof window.BDLFirebaseDownload.listUpdated === "function"){
      return function(collectionName, since, limit){ return window.BDLFirebaseDownload.listUpdated(collectionName, since, limit); };
    }
    if(window.BDLSyncFirebase && typeof window.BDLSyncFirebase.listUpdated === "function"){
      return function(collectionName, since, limit){ return window.BDLSyncFirebase.listUpdated(collectionName, since, limit); };
    }
    return null;
  }

  function bajarEstudiantes(since){
    var read = firebaseReader();
    if(!read){ return Promise.reject(new Error("Firebase no disponible para bajada.")); }
    return read(S.collections.estudiantes, since, S.limites.loteBajada).then(function(rows){
      if(!window.BDLRepoEstudiantes){ throw new Error("BDLRepoEstudiantes no disponible."); }
      return window.BDLRepoEstudiantes.guardarMuchos(rows).then(function(result){
        return { rows: rows.length, result: result };
      });
    });
  }

  function bajarPeriodos(since){
    var read = firebaseReader();
    if(!read){ return Promise.reject(new Error("Firebase no disponible para bajada.")); }
    return read(S.collections.periodos, since, S.limites.loteBajada).then(function(rows){
      if(!window.BDLRepoPeriodos){ throw new Error("BDLRepoPeriodos no disponible."); }
      return window.BDLRepoPeriodos.guardarMuchos(rows).then(function(result){
        return { rows: rows.length, result: result };
      });
    });
  }

  window.BDLSyncDownload = {
    bajarEstudiantes: bajarEstudiantes,
    bajarPeriodos: bajarPeriodos
  };
})(window);