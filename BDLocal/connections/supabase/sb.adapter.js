/* =========================================================
Nombre completo: sb.adapter.js
Ruta: /BDLocal/connections/supabase/sb.adapter.js
Función:
- Registrar Supabase como nube secundaria automática.
- Exponer health, respaldo crítico, lectura crítica y diagnóstico.
========================================================= */
(function(window){
  "use strict";

  function health(){
    if(window.BDLSupabaseHealth && typeof window.BDLSupabaseHealth.health === "function"){
      return window.BDLSupabaseHealth.health();
    }
    return Promise.resolve({ id:"supabase", ok:false, status:"no_configurado", message:"Health Supabase no disponible", role:"nube_secundaria_critica", at:new Date().toISOString() });
  }

  function sendEvent(event){
    if(window.BDLSupabaseUploadCritical && typeof window.BDLSupabaseUploadCritical.sendEvent === "function"){
      return window.BDLSupabaseUploadCritical.sendEvent(event);
    }
    return Promise.reject(new Error("Respaldo crítico Supabase no disponible."));
  }

  function sendEvents(events){
    if(window.BDLSupabaseUploadCritical && typeof window.BDLSupabaseUploadCritical.sendEvents === "function"){
      return window.BDLSupabaseUploadCritical.sendEvents(events || []);
    }
    return Promise.reject(new Error("Respaldo crítico Supabase no disponible."));
  }

  function listCritical(limit){
    if(window.BDLSupabaseRestoreCritical && typeof window.BDLSupabaseRestoreCritical.listCritical === "function"){
      return window.BDLSupabaseRestoreCritical.listCritical(limit || 200);
    }
    return Promise.reject(new Error("Lectura crítica Supabase no disponible."));
  }

  function diagnostics(){
    if(window.BDLSupabaseDiagnostics && typeof window.BDLSupabaseDiagnostics.diagnostics === "function"){
      return window.BDLSupabaseDiagnostics.diagnostics();
    }
    return Promise.resolve({ id:"supabase", ok:false, message:"Diagnóstico Supabase no disponible" });
  }

  var api = window.BDLConnInterface ? window.BDLConnInterface.createDefinition({
    id: "supabase",
    name: "Supabase",
    role: "nube_secundaria_critica",
    priority: 3,
    capabilities: ["cloud", "critical_backup", "restore", "diagnostics"],
    health: health,
    test: health,
    upload: sendEvent,
    download: listCritical,
    backup: sendEvents,
    restore: listCritical,
    diagnostics: diagnostics
  }) : { id:"supabase", name:"Supabase", health:health, test:health, upload:sendEvent, download:listCritical, diagnostics:diagnostics };

  api.sendEvent = sendEvent;
  api.sendEvents = sendEvents;
  api.listCritical = listCritical;

  if(window.BDLConnRegistry){ window.BDLConnRegistry.register(api); }
  window.BDLConnSupabase = api;
})(window);