/* =========================================================
Nombre completo: carga.progress.ui.js
Ruta: /Carga/progress/carga.progress.ui.js
Función:
- Manejar visualmente la barra de progreso de Carga.
- Escuchar eventos carga:progress y bdlocal:estudiantes-progress.
- Ser independiente de carga.ui.js.
========================================================= */
(function(window, document){
  "use strict";

  var els = {};
  var state = {
    mounted: false,
    visible: false,
    last: {
      current: 0,
      total: 0,
      percent: 0,
      message: "",
      phase: ""
    }
  };

  function $(id){
    return document.getElementById(id);
  }

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function clamp(value, min, max){
    value = Number(value || 0);
    if(value < min){ return min; }
    if(value > max){ return max; }
    return value;
  }

  function initEls(){
    els.card = $("cargaProgressCard");
    els.title = $("cargaProgressTitle");
    els.percent = $("cargaProgressPercent");
    els.bar = $("cargaProgressBar");
    els.message = $("cargaProgressMessage");
    els.track = document.querySelector(".carga-progress-track");
  }

  function ensureDom(){
    initEls();

    if(els.card && els.title && els.percent && els.bar && els.message){
      state.mounted = true;
      return true;
    }

    return false;
  }

  function phaseLabel(phase){
    phase = text(phase).toLowerCase();

    var labels = {
      prepare: "Preparando",
      read: "Leyendo",
      mapping: "Mapeando",
      validate: "Validando",
      cleanup: "Limpiando período",
      save: "Guardando",
      snapshot: "Actualizando respaldo",
      post: "Actualizando relacionados",
      verify: "Verificando",
      delete: "Borrando",
      done: "Finalizado"
    };

    return labels[phase] || "Progreso de carga";
  }

  function computePercent(current, total){
    current = Number(current || 0);
    total = Number(total || 0);

    if(total <= 0){
      return 0;
    }

    return clamp(Math.round((current / total) * 100), 0, 100);
  }

  function show(){
    if(!ensureDom()){ return false; }

    state.visible = true;
    els.card.classList.add("is-visible");

    return true;
  }

  function hide(){
    if(!ensureDom()){ return false; }

    state.visible = false;
    els.card.classList.remove("is-visible");

    return true;
  }

  function reset(message){
    if(!ensureDom()){ return false; }

    state.last = {
      current: 0,
      total: 0,
      percent: 0,
      message: message || "Esperando operación...",
      phase: ""
    };

    els.bar.style.width = "0%";
    els.percent.textContent = "0%";
    els.message.textContent = state.last.message;
    els.title.textContent = "Progreso de carga";

    if(els.track){
      els.track.setAttribute("aria-valuemin", "0");
      els.track.setAttribute("aria-valuemax", "100");
      els.track.setAttribute("aria-valuenow", "0");
    }

    return true;
  }

  function update(detail){
    detail = detail || {};

    if(!ensureDom()){
      return false;
    }

    var current = Number(detail.current || 0);
    var total = Number(detail.total || 0);
    var percent = detail.percent == null ? computePercent(current, total) : clamp(detail.percent, 0, 100);
    var message = text(detail.message) || "Procesando...";
    var phase = text(detail.phase);

    state.last = {
      current: current,
      total: total,
      percent: percent,
      message: message,
      phase: phase,
      at: detail.at || new Date().toISOString()
    };

    show();

    els.bar.style.width = percent + "%";
    els.percent.textContent = percent + "%";
    els.message.textContent = message;
    els.title.textContent = phaseLabel(phase);

    if(els.track){
      els.track.setAttribute("aria-valuenow", String(percent));
    }

    return true;
  }

  function complete(message){
    update({
      current: 1,
      total: 1,
      percent: 100,
      message: message || "Operación finalizada.",
      phase: "done"
    });
  }

  function bind(){
    window.addEventListener("carga:progress", function(event){
      update(event.detail || {});
    });

    window.addEventListener("bdlocal:estudiantes-progress", function(event){
      update(event.detail || {});
    });

    window.addEventListener("carga:verified", function(event){
      var detail = event.detail || {};
      complete(detail.message || "Verificación finalizada.");
    });

    window.addEventListener("carga:status", function(event){
      var detail = event.detail || {};
      if(detail.status === "idle"){
        reset("Esperando operación...");
      }
    });
  }

  function boot(){
    ensureDom();
    reset("Esperando operación...");
    bind();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }

  window.CargaProgressUI = {
    show: show,
    hide: hide,
    reset: reset,
    update: update,
    complete: complete,
    getState: function(){
      return {
        mounted: state.mounted,
        visible: state.visible,
        last: Object.assign({}, state.last)
      };
    }
  };
})(window, document);