/* =========================================================
Nombre completo: defart.app.js
Ruta o ubicación: /Requisitos/defart/defart.app.js
Función o funciones:
- Renderizar tabla inteligente de Defensas.
- Manejar filtros por período, división, carrera, estado y búsqueda.
- Cargar divisiones desde defart.divisions.js.
- Mantener División solo como filtro, no como columna.
- Editar N-ART y N-DEF directamente en tabla.
- Delegar guardado y autoguardado seguro a defart.save.js.
- Mostrar cálculo N-FIN en vivo antes de guardar.
- Habilitar N-DEF inmediatamente cuando N-ART es 7 o más.
- Bloquear y limpiar N-DEF inmediatamente cuando N-ART es menor a 7.
- Descargar Excel visible.
========================================================= */
(function(window, document){
  "use strict";

  var state = {
    periodId:"",
    division:"",
    career:"",
    status:"",
    search:"",
    sortKey:"_nombre",
    sortDir:"asc",
    data:null,
    filterTimer:null,
    rendering:false,
    renderQueued:false
  };

  var HEADERS = [
    {key:"_cedula", label:"Cédula", className:"col-cedula"},
    {key:"_nombre", label:"Nombre", className:"col-nombre"},
    {key:"_carrera", label:"Carrera", className:"col-carrera"},
    {key:"_nart", label:"N-ART", className:"col-nota"},
    {key:"_ndef", label:"N-DEF", className:"col-nota"},
    {key:"_nfin", label:"N-FIN", className:"col-nota"}
  ];

  function el(id){ return document.getElementById(id); }
  function text(value){ return String(value == null ? "" : value).trim(); }

  function esc(value){
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function status(message, type){
    var box = el("def-status");

    if(box){
      box.textContent = message;
      box.className = "def-status " + (type || "");
    }
  }

  function saveState(message){
    var box = el("def-save-state");

    if(!box){ return; }

    box.textContent = message || "Listo";
    box.classList.remove("saving", "pending", "saved");

    if(message === "Guardando..."){ box.classList.add("saving"); }
    if(message === "Cambios pendientes"){ box.classList.add("pending"); }
    if(message === "Listo"){ box.classList.add("saved"); }
  }

  function setProgress(percent, message){
    var bar = el("def-progress-bar");
    var txt = el("def-progress-text");

    if(bar){
      bar.style.width = Math.max(0, Math.min(100, percent || 0)) + "%";
    }

    if(txt){
      txt.textContent = message || "";
    }
  }

  function noteText(value){
    return window.DefartCore && typeof window.DefartCore.noteToText === "function"
      ? window.DefartCore.noteToText(value)
      : (value == null ? "" : String(value));
  }

  function option(value, label, selected){
    return '<option value="' + esc(value) + '" ' + (selected ? "selected" : "") + '>' + esc(label) + '</option>';
  }

  function saveModule(){
    return window.DefartSave || null;
  }

  function divisionsModule(){
    return window.DefartDivisions || null;
  }

  function pendingPatch(id){
    return saveModule() && typeof saveModule().pendingPatch === "function"
      ? saveModule().pendingPatch(id)
      : null;
  }

  function hasPending(id){
    return saveModule() && typeof saveModule().hasPending === "function"
      ? saveModule().hasPending(id)
      : false;
  }

  function hasInvalid(id){
    return saveModule() && typeof saveModule().hasInvalid === "function"
      ? saveModule().hasInvalid(id)
      : false;
  }

  function stateClass(row){
    var value = row && row._estadoDefensa;

    if(value === "Aprobado" || value === "Completo"){ return "estado-completo"; }
    if(value === "Falta requisitos" || value === "Sin requisitos"){ return "estado-sin-requisitos"; }
    if(value === "Pendiente N-ART" || value === "Pendiente N-DEF"){ return "estado-pendiente"; }
    if(value === "Supletorio Art"){ return "estado-supletorio-art"; }
    if(value === "Supletorio Def"){ return "estado-supletorio-def"; }

    return "estado-pendiente";
  }

  function statePill(row){
    return '<span class="def-pill ' + stateClass(row) + '">' + esc(row._estadoDefensa || "Pendiente") + '</span>';
  }

  function withPending(row){
    var patch = pendingPatch(row && row._defId);

    if(patch && window.DefartCore && typeof window.DefartCore.preview === "function"){
      return window.DefartCore.preview(row, patch);
    }

    return row;
  }

  function noteClass(value){
    var raw = noteText(value);
    var num = Number(raw);

    if(!raw || !Number.isFinite(num)){ return "nota-vacia"; }

    return num >= 7 ? "nota-ok" : "nota-baja";
  }

  function blockTitle(row, isArt){
    if(!row._canArt){ return "Bloqueado: faltan requisitos habilitantes."; }
    if(!isArt && !row._canDef){ return "Bloqueado: N-ART debe ser 7 o más. Si N-ART es menor a 7, N-DEF debe quedar vacía."; }

    return "";
  }

  function inputHtml(row, field){
    var shown = withPending(row);
    var patch = pendingPatch(row && row._defId) || {};
    var isArt = field === "nart";
    var value = isArt ? shown._nart : shown._ndef;
    var rawPending = Object.prototype.hasOwnProperty.call(patch, field) ? patch[field] : null;
    var enabled = isArt ? shown._canArt : shown._canDef;
    var title = enabled ? "" : blockTitle(shown, isArt);
    var locked = enabled ? "" : " is-locked";
    var invalid = hasInvalid(row && row._defId) ? " is-invalid" : "";
    var shownValue = rawPending !== null && rawPending !== undefined ? rawPending : noteText(value);

    return '<input class="def-note-input ' + noteClass(value) + locked + invalid + '" type="number" min="0" max="10" step="0.01" inputmode="decimal" autocomplete="off" data-id="' + esc(row._defId) + '" data-field="' + field + '" value="' + esc(shownValue) + '" ' + (enabled ? "" : "disabled") + ' title="' + esc(title) + '" />';
  }

  function sortIcon(key){
    if(state.sortKey !== key){ return ""; }

    return state.sortDir === "asc" ? " ▲" : " ▼";
  }

  function cellFor(row, header){
    if(header.key === "_nart"){ return inputHtml(row, "nart"); }
    if(header.key === "_ndef"){ return inputHtml(row, "ndef"); }

    if(header.key === "_nfin"){
      var value = withPending(row)._nfin;
      return '<strong class="def-nfin-value ' + noteClass(value) + '">' + esc(noteText(value)) + '</strong>';
    }

    return esc(withPending(row)[header.key] || "");
  }

  function tableHtml(rows){
    if(!rows || !rows.length){
      return '<div class="def-empty">Sin estudiantes con los filtros seleccionados.</div>';
    }

    var head = '<table class="def-table"><thead><tr>' + HEADERS.map(function(header){
      return '<th class="' + esc(header.className || "") + '" data-sort="' + esc(header.key) + '">' + esc(header.label) + sortIcon(header.key) + '</th>';
    }).join("") + '<th data-sort="_estadoDefensa">Estado' + sortIcon("_estadoDefensa") + '</th></tr></thead><tbody>';

    var body = rows.map(function(original){
      var row = withPending(original);
      var pending = hasPending(original._defId);
      var invalid = hasInvalid(original._defId);
      var rowClass = stateClass(row) + (pending ? " is-pending" : "") + (invalid ? " is-invalid-row" : "");

      return '<tr class="' + esc(rowClass) + '" data-id="' + esc(original._defId) + '">' +
        HEADERS.map(function(header){
          return '<td class="' + esc(header.className || "") + '">' + cellFor(original, header) + '</td>';
        }).join("") +
        '<td class="col-estado">' + statePill(row) + '</td></tr>';
    }).join("");

    return head + body + '</tbody></table>';
  }

  function fillFilters(data){
    data = data || {};

    var periodo = el("def-filter-periodo");
    var division = el("def-filter-division");
    var carrera = el("def-filter-carrera");
    var estado = el("def-filter-estado");

    if(periodo){
      periodo.innerHTML = option("", "Todos", !state.periodId) + (data.periodList || []).map(function(item){
        return option(item.id, item.label || item.id, state.periodId === item.id);
      }).join("");

      periodo.value = state.periodId;
    }

    if(division){
      division.innerHTML = option("", "Todas", !state.division) + (data.divisionList || []).map(function(item){
        return option(item, item, state.division === item);
      }).join("");

      if(state.division && !(data.divisionList || []).some(function(x){ return x === state.division; })){
        state.division = "";
        division.value = "";
      }else{
        division.value = state.division;
      }
    }

    if(carrera){
      carrera.innerHTML = option("", "Todas", !state.career) + (data.careerList || []).map(function(item){
        return option(item, item, state.career === item);
      }).join("");

      if(state.career && !(data.careerList || []).some(function(x){ return x === state.career; })){
        state.career = "";
        carrera.value = "";
      }else{
        carrera.value = state.career;
      }
    }

    if(estado){
      var states = data.states || ["Falta requisitos", "Pendiente N-ART", "Supletorio Art", "Pendiente N-DEF", "Supletorio Def", "Aprobado"];

      estado.innerHTML = option("", "Todos", !state.status) + states.map(function(item){
        return option(item, item, state.status === item);
      }).join("");

      estado.value = state.status;
    }
  }

  function collectOptions(){
    return {
      periodId:state.periodId,
      division:state.division,
      career:state.career,
      status:state.status,
      search:state.search,
      sortKey:state.sortKey,
      sortDir:state.sortDir
    };
  }

  function getRowById(id){
    var rows = state.data && Array.isArray(state.data.rows) ? state.data.rows : [];

    return rows.find(function(row){
      return row._defId === id;
    }) || null;
  }

  function findInput(id, field){
    var found = null;

    document.querySelectorAll(".def-note-input").forEach(function(input){
      if(input.getAttribute("data-id") === id && input.getAttribute("data-field") === field){
        found = input;
      }
    });

    return found;
  }

  function nartAllowsDef(value){
    var raw = text(value).replace(",", ".");

    if(raw === ""){ return false; }

    var num = Number(raw);
    return Number.isFinite(num) && num >= 7 && num <= 10;
  }

  function rowPatchFromInputs(id){
    var patch = { id:id };
    var nart = findInput(id, "nart");
    var ndef = findInput(id, "ndef");

    if(nart){
      patch.nart = nart.value;
    }

    if(ndef){
      if(nart && !nartAllowsDef(nart.value)){
        ndef.value = "";
        patch.ndef = "";
      }else{
        patch.ndef = ndef.value;
      }
    }

    return patch;
  }

  function rowElement(id){
    var found = null;

    document.querySelectorAll("#def-table-wrap tr[data-id]").forEach(function(row){
      if(row.getAttribute("data-id") === id){
        found = row;
      }
    });

    return found;
  }

  function updateRowPreview(id){
    var original = getRowById(id);

    if(!original || !window.DefartCore || typeof window.DefartCore.preview !== "function"){
      return;
    }

    var preview = window.DefartCore.preview(original, rowPatchFromInputs(id));
    var rowEl = rowElement(id);

    if(!rowEl){ return; }

    rowEl.className = stateClass(preview) + (hasPending(id) ? " is-pending" : "") + (hasInvalid(id) ? " is-invalid-row" : "");

    var nfin = rowEl.querySelector(".def-nfin-value");

    if(nfin){
      nfin.textContent = noteText(preview._nfin);
      nfin.className = "def-nfin-value " + noteClass(preview._nfin);
    }

    var estado = rowEl.querySelector(".col-estado");

    if(estado){
      estado.innerHTML = statePill(preview);
    }

    var nartInput = findInput(id, "nart");

    if(nartInput){
      nartInput.className = "def-note-input " + noteClass(preview._nart) + (nartInput.classList.contains("is-invalid") ? " is-invalid" : "");
    }

    var ndefInput = findInput(id, "ndef");

    if(ndefInput){
      if(!preview._canDef){
        ndefInput.value = "";
        ndefInput.classList.remove("is-invalid");
      }

      ndefInput.disabled = !preview._canDef;
      ndefInput.title = preview._canDef ? "" : blockTitle(preview, false);
      ndefInput.className = "def-note-input " + noteClass(preview._ndef) + (ndefInput.classList.contains("is-invalid") ? " is-invalid" : "") + (!preview._canDef ? " is-locked" : "");
    }
  }

  function applySavedRow(id, patch){
    var rows = state.data && Array.isArray(state.data.rows) ? state.data.rows : [];
    var index = rows.findIndex(function(row){
      return row._defId === id;
    });

    if(index >= 0 && window.DefartCore && typeof window.DefartCore.preview === "function"){
      rows[index] = window.DefartCore.preview(rows[index], patch || rowPatchFromInputs(id));
    }

    var rowEl = rowElement(id);

    if(!rowEl || index < 0){ return; }

    var updated = rows[index];

    rowEl.className = stateClass(updated) + (hasPending(id) ? " is-pending" : " is-saved") + (hasInvalid(id) ? " is-invalid-row" : "");

    var nfin = rowEl.querySelector(".def-nfin-value");

    if(nfin){
      nfin.textContent = noteText(updated._nfin);
      nfin.className = "def-nfin-value " + noteClass(updated._nfin);
    }

    var estado = rowEl.querySelector(".col-estado");

    if(estado){
      estado.innerHTML = statePill(updated);
    }

    var ndefInput = findInput(id, "ndef");

    if(ndefInput){
      if(!updated._canDef){
        ndefInput.value = "";
      }

      ndefInput.disabled = !updated._canDef;
      ndefInput.title = updated._canDef ? "" : blockTitle(updated, false);
      ndefInput.className = "def-note-input " + noteClass(updated._ndef) + (!updated._canDef ? " is-locked" : "");
    }
  }

  function bindTableEvents(){
    document.querySelectorAll("#def-table-wrap th[data-sort]").forEach(function(th){
      th.addEventListener("click", function(){
        var key = th.getAttribute("data-sort");

        if(state.sortKey === key){
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        }else{
          state.sortKey = key;
          state.sortDir = "asc";
        }

        render();
      });
    });

    document.querySelectorAll(".def-note-input").forEach(function(input){
      if(saveModule() && typeof saveModule().attachInput === "function"){
        saveModule().attachInput(input);
      }
    });
  }

  function finishRender(){
    state.rendering = false;

    if(state.renderQueued){
      state.renderQueued = false;
      render();
    }
  }

  function render(){
    if(state.rendering){
      state.renderQueued = true;
      return;
    }

    if(saveModule() && typeof saveModule().isSaving === "function" && saveModule().isSaving()){
      state.renderQueued = true;

      setTimeout(function(){
        if(state.renderQueued){
          state.renderQueued = false;
          render();
        }
      }, 250);

      return;
    }

    state.rendering = true;

    try{
      if(!window.DefartCore || typeof window.DefartCore.summary !== "function"){
        throw new Error("DefartCore no está disponible.");
      }

      var options = collectOptions();

      var loader = divisionsModule() && typeof divisionsModule().load === "function"
        ? divisionsModule().load(options.periodId, [], {force:false})
        : Promise.resolve(null);

      Promise.resolve(loader).then(function(){
        state.data = window.DefartCore.summary(options);

        fillFilters(state.data);

        var wrap = el("def-table-wrap");

        if(wrap){
          wrap.innerHTML = tableHtml(state.data.rows || []);
        }

        if(el("def-visible-count")){
          el("def-visible-count").textContent = (state.data.rows || []).length + " visibles";
        }

        if(el("def-diagnostics")){
          el("def-diagnostics").textContent = JSON.stringify(state.data.diagnostics || {}, null, 2);
        }

        bindTableEvents();

        if(saveModule() && typeof saveModule().updatePendingMessage === "function"){
          saveModule().updatePendingMessage();
        }

        status("Defensas cargado correctamente desde BaseLocal. Estado: " + (state.status || "Todos") + ".", "ok");
      }).catch(function(error){
        console.error("[Defensas]", error);
        status(error.message || String(error), "warn");
      }).finally(finishRender);
    }catch(error){
      console.error("[Defensas]", error);
      status(error.message || String(error), "warn");
      finishRender();
    }
  }

  function scheduleFilterRender(){
    if(state.filterTimer){
      clearTimeout(state.filterTimer);
    }

    state.filterTimer = setTimeout(render, 180);
  }

  function exportExcel(){
    try{
      var rows = ((state.data && state.data.rows) || []).map(withPending);
      var result = window.DefartExport.exportExcel(rows, {
        periodId:state.periodId || "TODOS",
        periodLabel:state.periodId || "TODOS",
        division:state.division || "TODAS"
      });

      status("Excel descargado: " + result.fileName, "ok");
    }catch(error){
      console.error("[Defensas Export]", error);
      status(error.message || String(error), "warn");
    }
  }

  function clearFilters(){
    state.periodId = "";
    state.division = "";
    state.career = "";
    state.status = "";
    state.search = "";

    if(el("def-filter-periodo")){ el("def-filter-periodo").value = ""; }
    if(el("def-filter-division")){ el("def-filter-division").value = ""; }
    if(el("def-filter-carrera")){ el("def-filter-carrera").value = ""; }
    if(el("def-filter-estado")){ el("def-filter-estado").value = ""; }
    if(el("def-filter-search")){ el("def-filter-search").value = ""; }

    render();
  }

  function bindFilters(){
    if(el("def-filter-periodo")){
      el("def-filter-periodo").addEventListener("change", function(event){
        state.periodId = event.target.value;
        state.division = "";
        state.career = "";
        render();
      });
    }

    if(el("def-filter-division")){
      el("def-filter-division").addEventListener("change", function(event){
        state.division = event.target.value;
        state.career = "";
        render();
      });
    }

    if(el("def-filter-carrera")){
      el("def-filter-carrera").addEventListener("change", function(event){
        state.career = event.target.value;
        render();
      });
    }

    if(el("def-filter-estado")){
      el("def-filter-estado").addEventListener("change", function(event){
        state.status = event.target.value;
        render();
      });
    }

    if(el("def-filter-search")){
      el("def-filter-search").addEventListener("input", function(event){
        state.search = event.target.value;
        scheduleFilterRender();
      });
    }

    if(el("def-btn-clear")){
      el("def-btn-clear").addEventListener("click", clearFilters);
    }

    if(el("def-btn-refresh")){
      el("def-btn-refresh").addEventListener("click", function(){
        if(divisionsModule() && typeof divisionsModule().load === "function"){
          divisionsModule().load(state.periodId, [], {force:true}).finally(render);
        }else{
          render();
        }
      });
    }

    if(el("def-btn-export")){
      el("def-btn-export").addEventListener("click", exportExcel);
    }

    if(el("def-btn-save")){
      el("def-btn-save").addEventListener("click", function(){
        if(saveModule() && typeof saveModule().saveAll === "function"){
          saveModule().saveAll("manual");
        }
      });
    }
  }

  function initSaveModule(){
    if(!saveModule() || typeof saveModule().init !== "function"){
      return;
    }

    saveModule().init({
      status:status,
      setProgress:setProgress,
      saveState:saveState,
      getRowById:getRowById,
      rowPatchFromInputs:rowPatchFromInputs,
      updateRowPreview:updateRowPreview,
      applySavedRow:applySavedRow
    });
  }

  function boot(){
    try{
      if(window.ExcelLocalBridge && typeof window.ExcelLocalBridge.ensureReady === "function"){
        window.ExcelLocalBridge.ensureReady();
      }

      initSaveModule();
      bindFilters();
      render();
    }catch(error){
      console.error("[Defensas Boot]", error);
      status(error.message || String(error), "warn");
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }

  window.DefartApp = {
    render:render,
    getState:function(){ return Object.assign({}, state); },
    getRowById:getRowById,
    updateRowPreview:updateRowPreview
  };
})(window, document);