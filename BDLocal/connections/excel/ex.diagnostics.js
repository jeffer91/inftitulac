/* =========================================================
Nombre completo: ex.diagnostics.js
Ruta: /BDLocal/connections/excel/ex.diagnostics.js
Función:
- Diagnóstico simple del módulo Excel/respaldo local.
========================================================= */
(function(window){
  "use strict";

  function diagnostics(){
    var events = window.BDLContEventRepo && window.BDLContEventRepo.list ? window.BDLContEventRepo.list() : [];
    var critical = events.filter(function(e){ return e && (e.prioridad === "manual" || e.prioridad === "critico"); });
    return Promise.resolve({
      id: "excel",
      role: "respaldo_portable",
      blobAvailable: typeof Blob !== "undefined",
      urlAvailable: !!window.URL,
      collectorLoaded: !!window.BDLExcelCollector,
      exportLoaded: !!window.BDLExcelExport,
      backupLoaded: !!window.BDLExcelBackup,
      closeDayLoaded: !!window.BDLExcelCloseDay,
      continuityEvents: events.length,
      manualCriticalEvents: critical.length,
      at: new Date().toISOString()
    });
  }

  window.BDLExcelDiagnostics = { diagnostics: diagnostics };
})(window);
