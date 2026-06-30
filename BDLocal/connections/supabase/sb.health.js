/* =========================================================
Nombre completo: sb.health.js
Ruta: /BDLocal/connections/supabase/sb.health.js
Función:
- Evaluar si Supabase está configurado y disponible.
- No escribe datos.
========================================================= */
(function(window){
  "use strict";

  function health(){
    if(!window.BDLSupabaseConfig || !window.BDLSupabaseConfig.isConfigured()){
      return Promise.resolve({
        id: "supabase",
        ok: false,
        status: "no_configurado",
        message: "Supabase no configurado. Falta URL o anonKey.",
        role: "nube_secundaria_critica",
        at: new Date().toISOString()
      });
    }

    var cfg = window.BDLSupabaseConfig.read();
    return Promise.resolve({
      id: "supabase",
      ok: true,
      status: "configurado",
      message: "Supabase configurado como nube secundaria. Prueba profunda pendiente de tablas.",
      role: "nube_secundaria_critica",
      url: cfg && cfg.url ? cfg.url : "",
      at: new Date().toISOString()
    });
  }

  window.BDLSupabaseHealth = { health: health };
})(window);
