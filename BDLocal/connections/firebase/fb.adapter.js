/* =========================================================
Nombre completo: fb.adapter.js
Ruta: /BDLocal/connections/firebase/fb.adapter.js
Función:
- Registrar Firebase como nube principal.
- Exponer health, escritura, lectura y diagnóstico mediante una interfaz común.
========================================================= */
(function(window){
  "use strict";

  function health(){
    if(window.BDLFirebaseHealth && typeof window.BDLFirebaseHealth.health === "function"){
      return window.BDLFirebaseHealth.health();
    }
    return Promise.resolve({ id:"firebase", ok:false, status:"no_configurado", message:"Health Firebase no disponible", role:"nube_principal", at:new Date().toISOString() });
  }

  function sendItem(item){
    if(window.BDLFirebaseUpload && typeof window.BDLFirebaseUpload.sendItem === "function"){
      return window.BDLFirebaseUpload.sendItem(item);
    }
    return Promise.reject(new Error("Escritura Firebase no disponible."));
  }

  function writeDoc(collectionName, docId, data){
    if(window.BDLFirebaseUpload && typeof window.BDLFirebaseUpload.writeDoc === "function"){
      return window.BDLFirebaseUpload.writeDoc(collectionName, docId, data || {});
    }
    return Promise.reject(new Error("Escritura Firebase no disponible."));
  }

  function listUpdated(collectionName, since, limit){
    if(window.BDLFirebaseDownload && typeof window.BDLFirebaseDownload.listUpdated === "function"){
      return window.BDLFirebaseDownload.listUpdated(collectionName, since || "", limit || 0);
    }
    return Promise.reject(new Error("Lectura Firebase no disponible."));
  }

  function diagnostics(){
    if(window.BDLFirebaseDiagnostics && typeof window.BDLFirebaseDiagnostics.diagnostics === "function"){
      return window.BDLFirebaseDiagnostics.diagnostics();
    }
    return Promise.resolve({ id:"firebase", ok:false, message:"Diagnóstico Firebase no disponible" });
  }

  var api = window.BDLConnInterface ? window.BDLConnInterface.createDefinition({
    id: "firebase",
    name: "Firebase",
    role: "nube_principal",
    priority: 2,
    capabilities: ["cloud", "write", "read", "sync", "diagnostics"],
    health: health,
    test: health,
    upload: sendItem,
    download: listUpdated,
    diagnostics: diagnostics
  }) : { id:"firebase", name:"Firebase", health:health, test:health, upload:sendItem, download:listUpdated, diagnostics:diagnostics };

  api.sendItem = sendItem;
  api.writeDoc = writeDoc;
  api.listUpdated = listUpdated;

  if(window.BDLConnRegistry){ window.BDLConnRegistry.register(api); }
  window.BDLConnFirebase = api;
})(window);
