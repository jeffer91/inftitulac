/* =========================================================
Nombre completo: ex.config.js
Ruta: /BDLocal/connections/excel/ex.config.js
Función:
- Configurar nombres y opciones de respaldo Excel/local.
========================================================= */
(function(window){
  "use strict";

  var PREFIX = "requisitos_cierre_dia";

  function stamp(){
    return new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
  }

  function filename(ext){
    return PREFIX + "_" + stamp() + "." + (ext || "json");
  }

  window.BDLExcelConfig = {
    prefix: PREFIX,
    stamp: stamp,
    filename: filename,
    role: "respaldo_portable"
  };
})(window);
