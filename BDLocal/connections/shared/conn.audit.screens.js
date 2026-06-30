/* =========================================================
Nombre completo: conn.audit.screens.js
Ruta: /BDLocal/connections/shared/conn.audit.screens.js
Función:
- Complementar auditoría de pantallas específicas.
- No modifica datos.
========================================================= */
(function(window, document){
  "use strict";

  function exists(path){
    var parts = String(path || "").split(".");
    var ref = window;
    for(var i=0;i<parts.length;i+=1){
      if(!ref || typeof ref[parts[i]] === "undefined"){ return false; }
      ref = ref[parts[i]];
    }
    return true;
  }

  function check(name, ok, detail){
    return { name:name, ok:!!ok, level:ok ? "ok" : "warn", detail:detail || "" };
  }

  function extraChecks(screen){
    var out = [];
    if(screen === "Carga"){
      out.push(check("BDLUIApp", exists("BDLUIApp"), "Arranque visual de Carga"));
      out.push(check("Carga Excel", exists("CargaApp") || exists("CargaIndex") || !!document.getElementById("bdlBtnGuardarCarga"), "Análisis y guardado de archivo"));
      out.push(check("Divisiones UI", exists("BDLUIDivisiones"), "Crear divisiones y asignar carreras"));
      out.push(check("Firebase UI", exists("BDLUIFirebase"), "Sincronización desde Carga"));
    }
    if(screen === "Defensas"){
      out.push(check("Guardar notas", exists("DefartCore.saveNotes"), "Proceso de guardado de N-ART/N-DEF/N-FIN"));
      out.push(check("Continuidad notas", exists("DefartContinuity"), "Registro crítico de notas"));
    }
    if(screen === "Ficha"){
      out.push(check("Guardar modalidad", exists("FichaModalidad.save"), "Modalidad manual protegida"));
    }
    return out;
  }

  function patch(){
    if(!window.BDLConnectionAudit || typeof window.BDLConnectionAudit.audit !== "function"){ return false; }
    if(window.BDLConnectionAudit.__screensPatched){ return true; }
    var original = window.BDLConnectionAudit.audit;
    window.BDLConnectionAudit.audit = function(){
      var result = original.call(window.BDLConnectionAudit);
      var extras = extraChecks(result.screen);
      result.screenProcesses = (result.screenProcesses || []).concat(extras);
      var all = (result.modules || []).concat(result.screenProcesses || []);
      var warnings = all.filter(function(x){ return !x.ok && x.level !== "error"; });
      var errors = all.filter(function(x){ return !x.ok && x.level === "error"; });
      result.ok = errors.length === 0;
      result.summary = { total:all.length, ok:all.filter(function(x){ return x.ok; }).length, warnings:warnings.length, errors:errors.length };
      return result;
    };
    window.BDLConnectionAudit.__screensPatched = true;
    return true;
  }

  patch();
  window.BDLConnectionAuditScreens = { patch: patch, extraChecks: extraChecks };
})(window, document);