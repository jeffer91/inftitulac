/* =========================================================
Nombre completo: cont.rules.config.js
Ruta: /BDLocal/continuity/rules/cont.rules.config.js
Función:
- Definir configuración general del motor de continuidad.
- No ejecuta sincronizaciones.
========================================================= */
(function(window){
  "use strict";

  var RULES = {
    version: "0.1.0",
    primaryTarget: "firebase",
    secondaryTarget: "supabase",
    emergencyTarget: "excel",
    reportTarget: "googleSheets",
    localTarget: "bdlocal",
    maxFailuresBeforeFallback: 3,
    healthCheckMs: 60000,
    retryMs: 120000,
    alertCooldownMs: 60000
  };

  window.BDLContRulesConfig = RULES;
})(window);
