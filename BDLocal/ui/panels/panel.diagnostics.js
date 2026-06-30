/* =========================================================
Nombre completo: panel.diagnostics.js
Ruta: /BDLocal/ui/panels/panel.diagnostics.js
Función:
- Mostrar diagnóstico del motor de continuidad.
- Incluir auditoría de conexiones, procesos, subprocesos, variables y botones.
========================================================= */
(function(window, document){
  "use strict";

  function safeJson(value){ try{ return JSON.stringify(value, null, 2); }catch(error){ return String(value); } }

  function render(){
    var box = document.getElementById("blContinuityDiagnostics");
    if(!box){ return; }
    var continuity = window.BDLContinuity && typeof window.BDLContinuity.status === "function" ? window.BDLContinuity.status() : { ok:false, message:"Motor no disponible" };
    var audit = window.BDLConnectionAudit && typeof window.BDLConnectionAudit.audit === "function" ? window.BDLConnectionAudit.audit() : { ok:false, message:"Auditor de conexiones no disponible" };
    var flow = window.BDLFlowAudit && typeof window.BDLFlowAudit.audit === "function" ? window.BDLFlowAudit.audit() : { ok:false, message:"Auditor de flujo no disponible" };
    box.textContent = safeJson({
      ok: !!(continuity && continuity.ok) && !!(audit && audit.ok) && !!(flow && flow.ok),
      generatedAt: new Date().toISOString(),
      continuity: continuity,
      audit: audit,
      flow: flow
    });
  }

  window.addEventListener("bdlocal:continuity-status", render);
  window.BLPanelDiagnostics = { render: render };
})(window, document);