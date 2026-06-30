/* =========================================================
Nombre completo: fb.health.js
Ruta: /BDLocal/connections/firebase/fb.health.js
Función:
- Evaluar estado inicial del conector Firebase.
- Respetar activado/pausado desde Ajustes.
- No fuerza sincronización de datos.
========================================================= */
(function(window){
  "use strict";

  function health(){
    var settings = window.BDLConnSettings ? window.BDLConnSettings.get("firebase") : { enabled:true };
    if(settings.enabled === false){
      return Promise.resolve({
        id: "firebase",
        ok: false,
        status: "pausado",
        message: "Firebase está pausado en Ajustes.",
        role: "nube_principal",
        at: new Date().toISOString()
      });
    }
    var hasLegacy = !!window.BDLSyncFirebase;
    var hasClient = !!window.BDLFirebaseClient;
    var hasConfig = !!(settings.projectId || settings.apiKey || window.firebaseConfig || window.FIREBASE_CONFIG || window.localStorage && (window.localStorage.getItem("REQ_FIREBASE_CONFIG_V1") || window.localStorage.getItem("FIREBASE_CONFIG")));
    var loaded = !!(window.firebase || window.db || hasLegacy);
    return Promise.resolve({
      id: "firebase",
      ok: loaded && hasLegacy,
      status: loaded && hasLegacy ? "cargado" : "no_configurado",
      message: loaded && hasLegacy ? "Firebase cargado como nube principal." : "Firebase activo, pero todavía no está cargado.",
      role: "nube_principal",
      hasLegacy: hasLegacy,
      hasClient: hasClient,
      hasConfig: hasConfig,
      at: new Date().toISOString()
    });
  }

  window.BDLFirebaseHealth = { health: health };
})(window);