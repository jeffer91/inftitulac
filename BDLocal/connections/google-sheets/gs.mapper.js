/* =========================================================
Nombre completo: gs.mapper.js
Ruta: /BDLocal/connections/google-sheets/gs.mapper.js
Función:
- Convertir estado de BL y eventos de continuidad a filas de reporte.
========================================================= */
(function(window){
  "use strict";

  function now(){ return new Date().toISOString(); }
  function txt(value){ return String(value == null ? "" : value).trim(); }

  function healthRows(){
    var rows = window.BDLContHealthRepo && window.BDLContHealthRepo.list ? window.BDLContHealthRepo.list() : [];
    return rows.map(function(row){
      return {
        tipo: "estado_base",
        fecha: row.updatedAt || row.at || now(),
        base: row.id || "",
        estado: row.status || "",
        ok: row.ok ? "SI" : "NO",
        mensaje: row.message || ""
      };
    });
  }

  function eventRows(){
    var rows = window.BDLContEventRepo && window.BDLContEventRepo.list ? window.BDLContEventRepo.list() : [];
    return rows.map(function(e){
      return {
        tipo: "evento_continuidad",
        fecha: e.createdAt || now(),
        estudiante: txt(e.estudianteId),
        periodo: txt(e.periodoId),
        dato: txt(e.tipoDato),
        prioridad: txt(e.prioridad),
        campo: txt(e.campo),
        valorAnterior: e.valorAnterior == null ? "" : e.valorAnterior,
        valorNuevo: e.valorNuevo == null ? "" : e.valorNuevo,
        firebase: txt(e.estadoFirebase),
        supabase: txt(e.estadoSupabase),
        respaldo: txt(e.estadoRespaldo)
      };
    });
  }

  function summaryRows(){
    var status = window.BDLContinuity && window.BDLContinuity.status ? window.BDLContinuity.status() : {};
    var guardian = status.guardian || {};
    return [{
      tipo: "resumen_bl",
      fecha: now(),
      modo: guardian.mode || "",
      ruta: guardian.activeTarget || "",
      eventos: status.eventsCount || 0
    }].concat(healthRows()).concat(eventRows());
  }

  window.BDLGoogleSheetsMapper = {
    summaryRows: summaryRows,
    healthRows: healthRows,
    eventRows: eventRows
  };
})(window);
