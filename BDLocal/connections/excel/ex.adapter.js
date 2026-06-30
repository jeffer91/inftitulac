/* =========================================================
Nombre completo: ex.adapter.js
Ruta: /BDLocal/connections/excel/ex.adapter.js
Función:
- Registrar Excel como respaldo portable/cierre del día.
========================================================= */
(function(window){
  "use strict";

  function health(){
    var ok = typeof Blob !== "undefined" && !!window.URL;
    return Promise.resolve({
      id: "excel",
      ok: ok,
      status: ok ? "disponible" : "no_disponible",
      message: ok ? "Exportación de respaldos disponible" : "El navegador no permite generar archivos",
      role: "respaldo_portable",
      at: new Date().toISOString()
    });
  }

  var api = window.BDLConnInterface ? window.BDLConnInterface.createDefinition({
    id: "excel",
    name: "Excel",
    role: "respaldo_portable",
    priority: 4,
    capabilities: ["backup", "export", "restore"],
    health: health,
    test: health
  }) : { id:"excel", name:"Excel", health:health, test:health };

  if(window.BDLConnRegistry){ window.BDLConnRegistry.register(api); }
  window.BDLConnExcel = api;
})(window);
