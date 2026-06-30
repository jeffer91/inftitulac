/* =========================================================
Nombre completo: ex.backup.js
Ruta: /BDLocal/connections/excel/ex.backup.js
Función:
- Crear respaldo local/exportable de BL.
========================================================= */
(function(window){
  "use strict";

  function ensure(){
    if(!window.BDLExcelCollector){ throw new Error("BDLExcelCollector no está disponible."); }
    if(!window.BDLExcelExport){ throw new Error("BDLExcelExport no está disponible."); }
    if(!window.BDLExcelConfig){ throw new Error("BDLExcelConfig no está disponible."); }
  }

  function backupJson(){
    ensure();
    return window.BDLExcelCollector.collectAll().then(function(data){
      var file = window.BDLExcelConfig.filename("json");
      var result = window.BDLExcelExport.json(file, data);
      return Object.assign({ type:"json", stores:Object.keys(data.stores || {}).length, events:(data.continuityEvents || []).length }, result);
    });
  }

  function backupCriticalCsv(){
    ensure();
    return window.BDLExcelCollector.collectCritical().then(function(data){
      var file = window.BDLExcelConfig.filename("csv");
      var result = window.BDLExcelExport.csv(file, data.continuityEvents || []);
      return Object.assign({ type:"csv", events:(data.continuityEvents || []).length }, result);
    });
  }

  window.BDLExcelBackup = {
    backupJson: backupJson,
    backupCriticalCsv: backupCriticalCsv
  };
})(window);
