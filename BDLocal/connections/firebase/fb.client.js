/* =========================================================
Nombre completo: fb.client.js
Ruta: /BDLocal/connections/firebase/fb.client.js
Función:
- Encapsular acceso al Firebase actual.
- Mantener compatibilidad con BDLSyncFirebase.
========================================================= */
(function(window){
  "use strict";

  function legacy(){ return window.BDLSyncFirebase || null; }

  function requireLegacy(){
    var fb = legacy();
    if(!fb){ throw new Error("BDLSyncFirebase no está disponible."); }
    return fb;
  }

  function ensure(){
    var fb = requireLegacy();
    if(typeof fb.ensureFirebase !== "function"){ return Promise.reject(new Error("Firebase no tiene método ensureFirebase.")); }
    return fb.ensureFirebase();
  }

  function saveItem(item){
    var fb = requireLegacy();
    if(typeof fb.saveItem !== "function"){ return Promise.reject(new Error("Firebase no tiene método saveItem.")); }
    return fb.saveItem(item);
  }

  function listUpdated(collectionName, since, limit){
    var fb = requireLegacy();
    if(typeof fb.listUpdated !== "function"){ return Promise.reject(new Error("Firebase no tiene método listUpdated.")); }
    return fb.listUpdated(collectionName, since || "", limit || 0);
  }

  function setDoc(collectionName, docId, data){
    var fb = requireLegacy();
    if(typeof fb.setDoc !== "function"){ return Promise.reject(new Error("Firebase no tiene método setDoc.")); }
    return fb.setDoc(collectionName, docId, data || {});
  }

  function deleteDoc(collectionName, docId){
    var fb = requireLegacy();
    if(typeof fb.deleteDoc !== "function"){ return Promise.reject(new Error("Firebase no tiene método deleteDoc.")); }
    return fb.deleteDoc(collectionName, docId);
  }

  window.BDLFirebaseClient = {
    ensure: ensure,
    saveItem: saveItem,
    listUpdated: listUpdated,
    setDoc: setDoc,
    deleteDoc: deleteDoc,
    legacy: legacy
  };
})(window);
