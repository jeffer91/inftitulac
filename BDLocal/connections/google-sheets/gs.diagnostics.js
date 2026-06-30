/* =========================================================
Nombre completo: gs.diagnostics.js
Ruta: /BDLocal/connections/google-sheets/gs.diagnostics.js
Función:
- Diagnóstico simple del conector Google Sheets.
========================================================= */
(function(window){
  "use strict";

  function diagnostics(){
    var cfg = window.BDLGoogleSheetsConfig ? window.BDLGoogleSheetsConfig.read() : null;
    var rows = window.BDLGoogleSheetsExportReport ? window.BDLGoogleSheetsExportReport.rows() : [];
    return Promise.resolve({
      id: "googleSheets",
      role: "reporte_visible",
      configured: !!(cfg && (cfg.webAppUrl || cfg.sheetId)),
      sheetId: cfg && cfg.sheetId ? cfg.sheetId : "",
      webAppConfigured: !!(cfg && cfg.webAppUrl),
      configLoaded: !!window.BDLGoogleSheetsConfig,
      mapperLoaded: !!window.BDLGoogleSheetsMapper,
      exportLoaded: !!window.BDLGoogleSheetsExportReport,
      healthLoaded: !!window.BDLGoogleSheetsHealth,
      previewRows: rows.length,
      at: new Date().toISOString()
    });
  }

  window.BDLGoogleSheetsDiagnostics = { diagnostics: diagnostics };
})(window);
