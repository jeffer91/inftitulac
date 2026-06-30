/* =========================================================
Nombre completo: cont.event.model.js
Ruta: /BDLocal/continuity/events/cont.event.model.js
Función:
- Crear el modelo estándar de evento de continuidad.
========================================================= */
(function(window){
  "use strict";

  function now(){ return new Date().toISOString(); }
  function id(){ return "cont_" + Date.now() + "_" + Math.random().toString(16).slice(2); }
  function text(v){ return String(v == null ? "" : v).trim(); }

  function create(input){
    input = input || {};
    return {
      id: input.id || id(),
      tipoDato: text(input.tipoDato || "dato"),
      prioridad: text(input.prioridad || "recuperable"),
      estudianteId: text(input.estudianteId || input.cedula || ""),
      periodoId: text(input.periodoId || ""),
      campo: text(input.campo || ""),
      valorAnterior: input.valorAnterior == null ? "" : input.valorAnterior,
      valorNuevo: input.valorNuevo == null ? "" : input.valorNuevo,
      origen: text(input.origen || "bdlocal"),
      estadoLocal: "guardado",
      estadoFirebase: "pendiente",
      estadoSupabase: "pendiente",
      estadoRespaldo: "pendiente",
      createdAt: input.createdAt || now(),
      updatedAt: now(),
      meta: input.meta || {}
    };
  }

  window.BDLContEventModel = { create: create };
})(window);
