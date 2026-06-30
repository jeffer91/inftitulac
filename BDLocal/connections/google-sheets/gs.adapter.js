/* =========================================================
Nombre completo: gs.adapter.js
Ruta: /BDLocal/connections/google-sheets/gs.adapter.js
Función:
- Registrar Google Sheets como reporte visible/revisión.
- Exponer health, vista previa, envío y diagnóstico.
========================================================= */
(function(window){
  "use strict";

  function health(){
    if(window.BDLGoogleSheetsHealth && typeof window.BDLGoogleSheetsHealth.health === "function"){
      return window.BDLGoogleSheetsHealth.health();
    }
    return Promise.resolve({ id:"googleSheets", ok:false, status:"no_configurado", message:"Health Google Sheets no disponible.", role:"reporte_visible", at:new Date().toISOString() });
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

  function diagnostics(){
    if(window.BDLGoogleSheetsDiagnostics && typeof window.BDLGoogleSheetsDiagnostics.diagnostics === "function"){
      return window.BDLGoogleSheetsDiagnostics.diagnostics();
    }
    return Promise.resolve({ id:"googleSheets", ok:false, message:"Diagnóstico Google Sheets no disponible" });
  }

  var api = window.BDLConnInterface ? window.BDLConnInterface.createDefinition({
    id: "googleSheets",
    name: "Google Sheets",
    role: "reporte_visible",
    priority: 5,
    capabilities: ["report", "export", "review", "diagnostics"],
    health: health,
    test: health,
    upload: sendReport,
    diagnostics: diagnostics
  }) : { id:"googleSheets", name:"Google Sheets", health:health, test:health, upload:sendReport, diagnostics:diagnostics };

  api.preview = preview;
  api.sendReport = sendReport;

  if(window.BDLConnRegistry){ window.BDLConnRegistry.register(api); }
  window.BDLConnGoogleSheets = api;
})(window);