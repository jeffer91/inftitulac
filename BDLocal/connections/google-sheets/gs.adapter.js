/* =========================================================
Nombre completo: gs.adapter.js
Ruta: /BDLocal/connections/google-sheets/gs.adapter.js
Función:
- Registrar Google Sheets como reporte visible incremental.
- Exponer health, vista previa, envío, cola, envío lento y diagnóstico.
========================================================= */
(function(window){
  "use strict";

  function health(){
    if(window.BDLGoogleSheetsHealth && typeof window.BDLGoogleSheetsHealth.health === "function"){
      return window.BDLGoogleSheetsHealth.health();
    }
    return Promise.resolve({ id:"googleSheets", ok:false, status:"no_configurado", message:"Health Google Sheets no disponible.", role:"reporte_visible_incremental", at:new Date().toISOString() });
  }

  function preview(){
    if(window.BDLGoogleSheetsExportReport && typeof window.BDLGoogleSheetsExportReport.preview === "function"){
      return window.BDLGoogleSheetsExportReport.preview();
    }
    return Promise.resolve({ ok:false, rows:[], message:"Reporte Google Sheets no disponible." });
  }

  function sendReport(){
    if(window.BDLGoogleSheetsExportReport && typeof window.BDLGoogleSheetsExportReport.sendReport === "function"){
      return window.BDLGoogleSheetsExportReport.sendReport();
    }
    return Promise.reject(new Error("Exportador Google Sheets no disponible."));
  }

  function sendPending(limit){
    if(window.BDLGoogleSheetsExportReport && typeof window.BDLGoogleSheetsExportReport.sendPending === "function"){
      return window.BDLGoogleSheetsExportReport.sendPending(limit || 25);
    }
    return Promise.reject(new Error("Envío incremental Google Sheets no disponible."));
  }

  function enqueue(row){
    if(window.BDLGoogleSheetsIncremental && typeof window.BDLGoogleSheetsIncremental.enqueue === "function"){
      return Promise.resolve(window.BDLGoogleSheetsIncremental.enqueue(row));
    }
    if(window.BDLGoogleSheetsQueue && typeof window.BDLGoogleSheetsQueue.enqueue === "function"){
      return Promise.resolve(window.BDLGoogleSheetsQueue.enqueue(row));
    }
    return Promise.reject(new Error("Cola Google Sheets no disponible."));
  }

  function queueStatus(){
    return Promise.resolve({
      ok:true,
      queue: window.BDLGoogleSheetsQueue && window.BDLGoogleSheetsQueue.counts ? window.BDLGoogleSheetsQueue.counts() : {},
      incremental: window.BDLGoogleSheetsIncremental && window.BDLGoogleSheetsIncremental.status ? window.BDLGoogleSheetsIncremental.status() : null
    });
  }

  function diagnostics(){
    if(window.BDLGoogleSheetsDiagnostics && typeof window.BDLGoogleSheetsDiagnostics.diagnostics === "function"){
      return window.BDLGoogleSheetsDiagnostics.diagnostics();
    }
    return Promise.resolve({ id:"googleSheets", ok:false, message:"Diagnóstico Google Sheets no disponible" });
  }

  var api = window.BDLConnInterface ? window.BDLConnInterface.createDefinition({
    id: "googleSheets",
    name: "Google Sheets",
    role: "reporte_visible_incremental",
    priority: 5,
    capabilities: ["report", "export", "review", "queue", "incremental", "diagnostics"],
    health: health,
    test: health,
    upload: sendPending,
    diagnostics: diagnostics
  }) : { id:"googleSheets", name:"Google Sheets", health:health, test:health, upload:sendPending, diagnostics:diagnostics };

  api.preview = preview;
  api.sendReport = sendReport;
  api.sendPending = sendPending;
  api.enqueue = enqueue;
  api.queueStatus = queueStatus;

  if(window.BDLConnRegistry){ window.BDLConnRegistry.register(api); }
  window.BDLConnGoogleSheets = api;
})(window);