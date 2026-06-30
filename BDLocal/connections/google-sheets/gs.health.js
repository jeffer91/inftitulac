/* =========================================================
Nombre completo: gs.health.js
Ruta: /BDLocal/connections/google-sheets/gs.health.js
Función:
- Evaluar estado de configuración de Google Sheets.
========================================================= */
(function(window){
  "use strict";

  function health(){
    var cfgApi = window.BDLGoogleSheetsConfig;
    var enabled = !!(cfgApi && cfgApi.isEnabled && cfgApi.isEnabled());
    var configured = !!(cfgApi && cfgApi.isConfigured && cfgApi.isConfigured());
    var cfg = cfgApi ? cfgApi.read() : null;
    if(!enabled){
      return Promise.resolve({
        id: "googleSheets",
        ok: false,
        status: "pausado",
        message: "Google Sheets está pausado en Ajustes.",
        role: "reporte_visible",
        sheetId: "",
        webAppConfigured: false,
        at: new Date().toISOString()
      });
    }
    return Promise.resolve({
      id: "googleSheets",
      ok: configured,
      status: configured ? "configurado" : "no_configurado",
      message: configured ? "Google Sheets configurado para reporte visible." : "Google Sheets activo, pero falta Sheet ID o Web App URL.",
      role: "reporte_visible",
      sheetId: cfg && cfg.sheetId ? cfg.sheetId : "",
      webAppConfigured: !!(cfg && cfg.webAppUrl),
      at: new Date().toISOString()
    });
  }

  window.BDLGoogleSheetsHealth = { health: health };
})(window);