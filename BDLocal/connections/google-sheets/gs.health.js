/* =========================================================
Nombre completo: gs.health.js
Ruta: /BDLocal/connections/google-sheets/gs.health.js
Función:
- Evaluar estado de configuración de Google Sheets.
========================================================= */
(function(window){
  "use strict";

  function health(){
    var configured = !!(window.BDLGoogleSheetsConfig && window.BDLGoogleSheetsConfig.isConfigured());
    var cfg = window.BDLGoogleSheetsConfig ? window.BDLGoogleSheetsConfig.read() : null;
    return Promise.resolve({
      id: "googleSheets",
      ok: configured,
      status: configured ? "configurado" : "no_configurado",
      message: configured ? "Google Sheets configurado para reporte visible." : "Google Sheets no configurado todavía.",
      role: "reporte_visible",
      sheetId: cfg && cfg.sheetId ? cfg.sheetId : "",
      webAppConfigured: !!(cfg && cfg.webAppUrl),
      at: new Date().toISOString()
    });
  }

  window.BDLGoogleSheetsHealth = { health: health };
})(window);
