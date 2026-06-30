/* =========================================================
Nombre completo: ex.config.js
Ruta: /BDLocal/connections/excel/ex.config.js
Función:
- Configurar nombres y opciones de respaldo Excel/local.
- Leer si Excel está activado desde Ajustes.
========================================================= */
(function(window){
  "use strict";

  var PREFIX = "requisitos_cierre_dia";

  function settings(){
    return window.BDLConnSettings ? window.BDLConnSettings.get("excel") : { enabled:false, folderName:"", mode:"download" };
  }

  function isEnabled(){
    return window.BDLConnSettings ? window.BDLConnSettings.isEnabled("excel") : false;
  }

  function stamp(){
    return new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
  }

  function filename(ext){
    var s = settings();
    var custom = String((s && s.filePrefix) || PREFIX || "requisitos_cierre_dia").trim() || PREFIX;
    return custom + "_" + stamp() + "." + (ext || "json");
  }

  window.BDLExcelConfig = {
    prefix: PREFIX,
    settings: settings,
    isEnabled: isEnabled,
    stamp: stamp,
    filename: filename,
    role: "respaldo_portable"
  };
})(window);