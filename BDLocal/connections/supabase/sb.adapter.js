/* =========================================================
Nombre completo: sb.adapter.js
Ruta: /BDLocal/connections/supabase/sb.adapter.js
Función:
- Registrar Supabase como nube secundaria automática.
- Estado inicial: no configurado hasta agregar credenciales.
========================================================= */
(function(window){
  "use strict";

  function health(){
    var raw = "";
    try{ raw = window.localStorage.getItem("REQ_SUPABASE_CONFIG_V1") || ""; }catch(error){}
    var configured = !!raw;
    return Promise.resolve({
      id: "supabase",
      ok: configured,
      status: configured ? "configurado" : "no_configurado",
      message: configured ? "Supabase configurado. Falta prueba profunda." : "Supabase no configurado todavía.",
      role: "nube_secundaria_critica",
      at: new Date().toISOString()
    });
  }

  var api = window.BDLConnInterface ? window.BDLConnInterface.createDefinition({
    id: "supabase",
    name: "Supabase",
    role: "nube_secundaria_critica",
    priority: 3,
    capabilities: ["cloud", "critical_backup", "restore"],
    health: health,
    test: health
  }) : { id:"supabase", name:"Supabase", health:health, test:health };

  if(window.BDLConnRegistry){ window.BDLConnRegistry.register(api); }
  window.BDLConnSupabase = api;
})(window);
