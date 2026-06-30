/* =========================================================
Nombre completo: fb.adapter.js
Ruta: /BDLocal/connections/firebase/fb.adapter.js
Función:
- Registrar Firebase como nube principal.
- Reportar si el módulo actual de Firebase está cargado.
========================================================= */
(function(window){
  "use strict";

  function health(){
    var loaded = !!(window.BDLSyncFirebase || window.firebase || window.db);
    return Promise.resolve({
      id: "firebase",
      ok: loaded,
      status: loaded ? "cargado" : "no_configurado",
      message: loaded ? "Firebase cargado. La prueba profunda se hará en el módulo Firebase." : "Firebase no está cargado todavía.",
      role: "nube_principal",
      at: new Date().toISOString()
    });
  }

  var api = window.BDLConnInterface ? window.BDLConnInterface.createDefinition({
    id: "firebase",
    name: "Firebase",
    role: "nube_principal",
    priority: 2,
    capabilities: ["cloud", "upload", "download", "sync"],
    health: health,
    test: health
  }) : { id:"firebase", name:"Firebase", health:health, test:health };

  if(window.BDLConnRegistry){ window.BDLConnRegistry.register(api); }
  window.BDLConnFirebase = api;
})(window);
