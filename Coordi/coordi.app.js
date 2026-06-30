/* =========================================================
Nombre completo: coordi.app.js
Ruta o ubicación: /Requisitos/Coordi/coordi.app.js
Función o funciones:
- Controlar la pantalla Coordi con el nuevo motor de reportes.
- Manejar filtros por período y división.
- Renderizar reportes reales por responsable.
- Preparar vista previa y copiado mientras se implementan Outlook y WhatsApp.
Con qué se conecta:
- coo.config.js
- coo.data.js
- coo.report.js
- coo.render.js
- coordi.export.js
========================================================= */
(function(window,document){
  "use strict";

  var state = {
    periodId:"",
    division:"",
    selectedAreaId:"",
    messageType:"general",
    report:null,
    loading:false
  };

  function el(id){return document.getElementById(id);}
  function text(value){return String(value == null ? "" : value).trim();}

  function status(message, cls){
    var node = el("coordi-status");
    if(node){
      node.textContent = message;
      node.className = "coordi-status " + (cls || "");
    }
  }

  function copyText(value){
    value = text(value);
    if(window.CoordiExport && typeof window.CoordiExport.copyText === "function"){
      return window.CoordiExport.copyText(value);
    }
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(value);
    }
    return Promise.reject(new Error("No se pudo copiar al portapapeles."));
  }

  function exportJson(data){
    if(window.CoordiExport && typeof window.CoordiExport.exportJson === "function"){
      window.CoordiExport.exportJson(data);
      return;
    }
    var blob = new Blob([JSON.stringify(data || {}, null, 2)], {type:"application/json"});
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "coordi-reporte.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();}, 500);
  }

  function ensureModern(){
    if(window.COOReport && window.COORender){return true;}
    status("No se cargó el nuevo motor Coordi. Revisa coo.report.js y coo.render.js.", "warn");
    return false;
  }

  function render(options){
    options = options || {};
    if(state.loading){return;}
    if(!ensureModern()){return;}
    state.loading = true;
    status("Generando reportes por responsables...", "");
    window.COOReport.build({
      periodId:state.periodId,
      division:state.division,
      refresh:!!options.refresh
    }).then(function(report){
      state.report = report;
      if(!state.selectedAreaId || !window.COORender.areaById(report, state.selectedAreaId)){
        state.selectedAreaId = window.COORender.firstPendingArea(report) || "";
      }
      window.COORender.renderAll(report, state);
      status("Coordi listo. Fuente: " + (report.source || "Base local") + ". Estudiantes revisados: " + ((report.global && report.global.totalEstudiantesRevisados) || 0) + ".", "ok");
    }).catch(function(error){
      console.error("[Coordi]", error);
      status(error && error.message ? error.message : String(error), "warn");
    }).finally(function(){
      state.loading = false;
    });
  }

  function bindStatic(){
    var periodo = el("coordi-periodo");
    var division = el("coordi-division");
    var refresh = el("coordi-refresh");
    var copySummary = el("coordi-copy-summary");
    var exportBtn = el("coordi-export-json");
    var copyMessage = el("coordi-copy-message");
    var closePreview = el("coordi-preview-close");

    if(periodo){periodo.addEventListener("change", function(e){state.periodId = e.target.value;state.division = "";state.selectedAreaId = "";render();});}
    if(division){division.addEventListener("change", function(e){state.division = e.target.value;state.selectedAreaId = "";render();});}
    if(refresh){refresh.addEventListener("click", function(){render({refresh:true});});}
    if(copySummary){copySummary.addEventListener("click", function(){
      if(!state.report){status("Primero genera el reporte.", "warn");return;}
      copyText(window.COORender.summaryText(state.report)).then(function(){status("Resumen copiado.", "ok");}).catch(function(error){status(error.message || String(error), "warn");});
    });}
    if(exportBtn){exportBtn.addEventListener("click", function(){exportJson(state.report || {});});}
    if(copyMessage){copyMessage.addEventListener("click", function(){
      copyText(el("coordi-message") ? el("coordi-message").value : "").then(function(){status("Mensaje copiado.", "ok");}).catch(function(error){status(error.message || String(error), "warn");});
    });}
    if(closePreview){closePreview.addEventListener("click", function(){window.COORender.closePreview();});}
  }

  function bindDynamic(){
    document.addEventListener("click", function(event){
      var btn = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
      if(!btn){return;}
      var action = btn.getAttribute("data-action");
      var areaId = btn.getAttribute("data-area-id") || "";
      if(!state.report){status("Primero genera el reporte.", "warn");return;}
      if(action === "show-detail"){
        state.selectedAreaId = areaId;
        window.COORender.renderAll(state.report, state);
        status("Detalle cargado para el área seleccionada.", "ok");
      }
      if(action === "preview-global"){
        window.COORender.openPreview("Reporte global", window.COORender.previewGlobal(state.report));
      }
      if(action === "preview-area"){
        state.selectedAreaId = areaId;
        window.COORender.renderAll(state.report, state);
        var area = window.COORender.areaById(state.report, areaId);
        window.COORender.openPreview(area ? area.area : "Área", window.COORender.previewArea(state.report, areaId));
      }
    });
  }

  function boot(){
    try{if(window.BL2 && typeof window.BL2.status === "function"){window.BL2.status({deep:false});}}catch(error){}
    bindStatic();
    bindDynamic();
    render();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})(window,document);
