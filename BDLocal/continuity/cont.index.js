/* =========================================================
Nombre completo: cont.index.js
Ruta: /BDLocal/continuity/cont.index.js
Función:
- Punto de entrada del motor automático de continuidad.
- Expone estado, creación de eventos y verificación manual.
- No reemplaza todavía la sincronización actual.
========================================================= */
(function(window){
  "use strict";

  var VERSION = "0.2.0-guardian";

  function status(){
    var guardian = window.BDLContGuardian && typeof window.BDLContGuardian.status === "function" ? window.BDLContGuardian.status() : { mode:"preparado", activeTarget:"firebase" };
    var health = window.BDLContHealthRepo && typeof window.BDLContHealthRepo.list === "function" ? window.BDLContHealthRepo.list() : [];
    var events = window.BDLContEventRepo && typeof window.BDLContEventRepo.list === "function" ? window.BDLContEventRepo.list() : [];
    return {
      ok: true,
      version: VERSION,
      module: "BDLContinuity",
      guardian: guardian,
      health: health,
      eventsCount: events.length,
      updatedAt: new Date().toISOString()
    };
  }

  function createEvent(input){
    if(!window.BDLContEventCreate){ throw new Error("BDLContEventCreate no está disponible."); }
    return window.BDLContEventCreate.create(input || {});
  }

  function checkNow(){
    if(!window.BDLContGuardian || typeof window.BDLContGuardian.checkNow !== "function"){
      return Promise.resolve({ ok:false, message:"SyncGuardian no está disponible." });
    }
    return window.BDLContGuardian.checkNow();
  }

  window.BDLContinuity = {
    version: VERSION,
    status: status,
    createEvent: createEvent,
    checkNow: checkNow
  };
})(window);
