/* =========================================================
Nombre completo: defart.save.js
Ruta o ubicación: /Requisitos/defart/defart.save.js
Función o funciones:
- Controlar cambios pendientes de N-ART y N-DEF.
- Validar notas de 0 a 10 con máximo 2 decimales.
- Autoguardar cambios con delay inteligente de 2 segundos.
- Guardar una fila inmediatamente al presionar Enter.
- Permitir seguir escribiendo aunque exista un guardado en proceso.
- Mantener cola segura: si se escribe mientras guarda, queda pendiente para el siguiente guardado.
- Limpiar y bloquear N-DEF inmediatamente si N-ART es menor a 7.
- No guardar notas inválidas; se mantienen pendientes hasta corregir.
- Mantener botón Guardar todo como guardado manual/principal.
- Mostrar alerta visual corta de guardado.
========================================================= */
(function(window, document){
  "use strict";

  var AUTO_SAVE_DELAY = 2000;

  var state = {
    changes:{},
    invalidRows:{},
    saving:false,
    saveQueued:false,
    rowLocks:{},
    autoTimer:null,
    toastTimer:null,
    unloadBound:false,
    api:null
  };

  function text(value){ return String(value == null ? "" : value).trim(); }

  function clone(value){
    try{ return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch(error){ return value; }
  }

  function api(){
    return state.api || {};
  }

  function status(message, type){
    if(api().status){
      api().status(message, type);
    }
  }

  function setProgress(percent, message){
    if(api().setProgress){
      api().setProgress(percent, message);
    }
  }

  function saveState(message){
    if(api().saveState){
      api().saveState(message);
    }
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

  function rowElement(id){
    var found = null;

    document.querySelectorAll("#def-table-wrap tr[data-id]").forEach(function(row){
      if(row.getAttribute("data-id") === id){
        found = row;
      }
    });

    return found;
  }

  function getRowById(id){
    return api().getRowById ? api().getRowById(id) : null;
  }

  function noteToNumber(value){
    var raw = text(value).replace(",", ".");

    if(raw === ""){
      return null;
    }

    var num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }

  function nartAllowsDef(value){
    var num = noteToNumber(value);
    return num !== null && num >= 7 && num <= 10;
  }

  function toast(message, type){
    var box = document.getElementById("def-save-toast");

    if(!box){
      box = document.createElement("div");
      box.id = "def-save-toast";
      box.className = "def-save-toast";
      document.body.appendChild(box);
    }

    if(state.toastTimer){
      clearTimeout(state.toastTimer);
    }

    box.textContent = message || "Guardado";
    box.className = "def-save-toast show " + (type || "ok");
    box.hidden = false;

    state.toastTimer = setTimeout(function(){
      box.classList.remove("show");
      state.toastTimer = setTimeout(function(){
        box.hidden = true;
      }, 180);
    }, 1300);
  }

  function decimalText(value){
    return text(value).replace(",", ".");
  }

  function hasMaxTwoDecimals(value){
    var raw = decimalText(value);

    if(raw === ""){
      return true;
    }

    return /^\d{1,2}(\.\d{0,2})?$|^10(\.0{0,2})?$|^0(\.\d{0,2})?$/.test(raw);
  }

  function isValidNote(value){
    var raw = decimalText(value);

    if(raw === ""){
      return true;
    }

    var num = Number(raw);
    return Number.isFinite(num) && num >= 0 && num <= 10 && hasMaxTwoDecimals(raw);
  }

  function normalizeInput(input){
    var before = input.value;
    var after = String(before == null ? "" : before).replace(",", ".");

    if(before !== after){
      input.value = after;
    }

    return after;
  }

  function blockInvalidKey(event){
    var blocked = ["e", "E", "+", "-"];

    if(blocked.indexOf(event.key) >= 0){
      event.preventDefault();
      return true;
    }

    if((event.key === "." || event.key === ",") && text(event.currentTarget.value).indexOf(".") >= 0){
      event.preventDefault();
      return true;
    }

    return false;
  }

  function markRowInvalid(id, invalid){
    id = text(id);

    if(!id){ return; }

    if(invalid){
      state.invalidRows[id] = true;
    }else{
      delete state.invalidRows[id];
    }

    var row = rowElement(id);

    if(row){
      row.classList.toggle("is-invalid-row", !!invalid);
    }
  }

  function refreshInvalidStateForRow(id){
    var invalid = false;

    ["nart", "ndef"].forEach(function(field){
      var input = findInput(id, field);

      if(input && !input.disabled && !isValidNote(input.value)){
        invalid = true;
      }
    });

    markRowInvalid(id, invalid);
    return !invalid;
  }

  function invalidCount(){
    return Object.keys(state.invalidRows).length;
  }

  function validateInput(input, silent){
    var value = normalizeInput(input);
    var ok = isValidNote(value);
    var id = input.getAttribute("data-id");

    input.classList.toggle("is-invalid", !ok);
    refreshInvalidStateForRow(id);

    if(!ok && !silent){
      status("La nota debe estar entre 0 y 10 y máximo 2 decimales.", "warn");
      toast("Nota inválida", "warn");
    }

    return ok;
  }

  function clearAutoTimer(){
    if(state.autoTimer){
      clearTimeout(state.autoTimer);
      state.autoTimer = null;
    }
  }

  function pendingCount(){
    return Object.keys(state.changes).length;
  }

  function updatePendingMessage(){
    var total = pendingCount();
    var invalid = invalidCount();
    var btn = document.getElementById("def-btn-save");

    if(btn){
      btn.disabled = state.saving || total === 0 || invalid > 0;
    }

    if(state.saving){
      setProgress(60, state.saveQueued ? "Guardando cambios. Nuevas notas quedarán en cola." : "Guardando cambios...");
      saveState("Guardando...");
      return;
    }

    if(invalid){
      setProgress(18, "Corrige " + invalid + " fila(s) con nota inválida antes de guardar.");
      saveState("Cambios pendientes");
      return;
    }

    if(total){
      setProgress(28, total + " estudiante(s) con cambios pendientes. Autoguardado en 2 segundos.");
      saveState("Cambios pendientes");
    }else{
      setProgress(0, "Sin cambios pendientes.");
      saveState("Listo");
    }
  }

  function scheduleAutoSave(reason){
    clearAutoTimer();

    if(!pendingCount()){
      updatePendingMessage();
      return;
    }

    if(invalidCount()){
      updatePendingMessage();
      return;
    }

    if(state.saving){
      state.saveQueued = true;
      updatePendingMessage();
      return;
    }

    state.autoTimer = setTimeout(function(){
      state.autoTimer = null;
      saveAll(reason || "auto");
    }, AUTO_SAVE_DELAY);

    updatePendingMessage();
  }

  function cleanNdefInput(id){
    var ndef = findInput(id, "ndef");

    if(ndef){
      ndef.value = "";
      ndef.disabled = true;
      ndef.classList.remove("is-invalid");
      ndef.classList.add("is-locked");
      ndef.title = "Bloqueado: N-ART debe ser 7 o más.";
    }

    refreshInvalidStateForRow(id);
  }

  function unlockNdefInput(id){
    var ndef = findInput(id, "ndef");

    if(ndef){
      ndef.disabled = false;
      ndef.classList.remove("is-locked");
      ndef.title = "";
    }
  }

  function setChange(id, field, value){
    if(!id || !field){
      return;
    }

    if(!state.changes[id]){
      state.changes[id] = { id:id };
    }

    state.changes[id][field] = value;

    if(field === "nart"){
      if(nartAllowsDef(value)){
        unlockNdefInput(id);
      }else if(isValidNote(value)){
        state.changes[id].ndef = "";
        cleanNdefInput(id);
      }
    }

    updatePendingMessage();

    var row = rowElement(id);

    if(row){
      row.classList.add("is-pending");
      row.classList.remove("is-saved");
    }
  }

  function pendingPatch(id){
    return state.changes[id] ? clone(state.changes[id]) : null;
  }

  function hasPending(id){
    return !!state.changes[id];
  }

  function hasInvalid(id){
    return !!state.invalidRows[id];
  }

  function changesArray(){
    return Object.keys(state.changes).map(function(id){
      return clone(state.changes[id]);
    });
  }

  function clearChange(id){
    delete state.changes[id];
    delete state.invalidRows[id];
    updatePendingMessage();
  }

  function clearAll(){
    state.changes = {};
    state.invalidRows = {};
    clearAutoTimer();
    updatePendingMessage();
  }

  function effectiveNart(change){
    if(Object.prototype.hasOwnProperty.call(change || {}, "nart")){
      return noteToNumber(change.nart);
    }

    var row = getRowById(change && change.id);
    return row && row._nart !== undefined ? noteToNumber(row._nart) : null;
  }

  function prepareChangeForSave(change, options){
    change = Object.assign({}, change || {});
    options = options || {};

    var nart = effectiveNart(change);

    if(nart === null || nart < 7){
      change.ndef = "";

      if(options.updateInputs !== false){
        cleanNdefInput(change.id);
      }
    }

    return change;
  }

  function patchFromInputs(id){
    var patch = api().rowPatchFromInputs ? api().rowPatchFromInputs(id) : null;

    if(!patch || !patch.id){
      patch = { id:id };

      var nart = findInput(id, "nart");
      var ndef = findInput(id, "ndef");

      if(nart){ patch.nart = nart.value; }
      if(ndef){ patch.ndef = ndef.value; }
    }

    return prepareChangeForSave(Object.assign({id:id}, patch));
  }

  function validateVisibleInputsForRow(id){
    var invalid = false;

    ["nart", "ndef"].forEach(function(field){
      var input = findInput(id, field);

      if(input && !input.disabled && !validateInput(input, false)){
        invalid = true;
      }
    });

    markRowInvalid(id, invalid);
    return !invalid;
  }

  function validateAllVisibleInputs(){
    var invalid = false;

    document.querySelectorAll(".def-note-input").forEach(function(input){
      if(!input.disabled && !validateInput(input, false)){
        invalid = true;
      }
    });

    return !invalid;
  }

  function sameChange(a, b){
    a = prepareChangeForSave(a || {}, {updateInputs:false});
    b = prepareChangeForSave(b || {}, {updateInputs:false});

    return JSON.stringify(a) === JSON.stringify(b);
  }

  function clearSavedChange(savedPatch){
    var id = savedPatch && savedPatch.id;
    var current = state.changes[id];

    if(!current){
      return;
    }

    if(sameChange(current, savedPatch)){
      delete state.changes[id];
      delete state.invalidRows[id];
    }
  }

  function applySavedVisual(id, patch){
    var row = rowElement(id);
    var stillPending = hasPending(id);

    if(api().applySavedRow && !stillPending){
      api().applySavedRow(id, patch);
    }else if(api().updateRowPreview){
      api().updateRowPreview(id);
    }

    row = rowElement(id);

    if(row){
      if(hasPending(id)){
        row.classList.add("is-pending");
        row.classList.remove("is-saved");
      }else{
        row.classList.remove("is-pending", "is-invalid-row");
        row.classList.add("is-saved");

        setTimeout(function(){
          row.classList.remove("is-saved");
        }, 1400);
      }
    }
  }

  function savePatches(patches, mode){
    patches = Array.isArray(patches) ? patches : [];
    patches = patches.filter(function(change){ return change && change.id; }).map(function(change){
      return prepareChangeForSave(change);
    });

    if(!patches.length){
      updatePendingMessage();
      toast("Sin cambios", "info");
      return;
    }

    if(state.saving){
      state.saveQueued = true;
      scheduleAutoSave("queued");
      return;
    }

    if(invalidCount()){
      updatePendingMessage();
      toast("Corrige notas", "warn");
      status("Hay notas inválidas. Corrige antes de guardar.", "warn");
      return;
    }

    clearAutoTimer();
    state.saving = true;
    state.saveQueued = false;
    updatePendingMessage();

    try{
      var result = window.DefartCore.saveNotes(patches);

      if(result && result.ok){
        patches.forEach(function(change){
          clearSavedChange(change);
          applySavedVisual(change.id, change);
        });

        toast(mode === "manual" ? "Todo guardado" : "Guardado", "ok");
        status((mode === "enter" ? "Guardado por Enter. " : mode === "manual" ? "Guardado manual: " : "Autoguardado: ") + (result.message || ""), "ok");
        setProgress(100, result.message || "Cambios guardados.");

        setTimeout(function(){
          updatePendingMessage();
        }, 900);
      }else{
        var errors = result && result.errors ? result.errors.join(" | ") : "Guardado parcial o con errores.";
        toast("Revisar errores", "warn");
        status(errors, "warn");
      }
    }catch(error){
      console.error("[DefartSave savePatches]", error);
      toast("Error al guardar", "warn");
      status(error.message || String(error), "warn");
    }finally{
      state.saving = false;
      updatePendingMessage();

      if(state.saveQueued && pendingCount() && !invalidCount()){
        state.saveQueued = false;
        scheduleAutoSave("queued");
      }
    }
  }

  function saveRow(id, mode){
    id = text(id);

    if(!id){
      return;
    }

    if(state.saving){
      state.saveQueued = true;
      scheduleAutoSave("queued");
      return;
    }

    if(!hasPending(id)){
      updatePendingMessage();
      return;
    }

    if(!validateVisibleInputsForRow(id)){
      updatePendingMessage();
      return;
    }

    savePatches([patchFromInputs(id)], mode || "row");
  }

  function saveAll(mode){
    if(state.saving){
      state.saveQueued = true;
      updatePendingMessage();
      return;
    }

    if(!validateAllVisibleInputs()){
      updatePendingMessage();
      return;
    }

    var changes = changesArray().map(function(change){
      return prepareChangeForSave(change);
    });

    if(!changes.length){
      updatePendingMessage();
      toast("Sin cambios", "info");
      return;
    }

    savePatches(changes, mode || "manual");
  }

  function onInput(input){
    var id = input.getAttribute("data-id");
    var field = input.getAttribute("data-field");
    var ok = validateInput(input, true);

    setChange(id, field, input.value);

    if(ok){
      if(api().updateRowPreview){
        api().updateRowPreview(id);
      }

      scheduleAutoSave("auto");
    }else{
      clearAutoTimer();
      updatePendingMessage();
    }
  }

  function onBlur(input){
    if(!validateInput(input, false)){
      clearAutoTimer();
      updatePendingMessage();
      return;
    }

    var id = input.getAttribute("data-id");

    if(hasPending(id)){
      scheduleAutoSave("auto");
    }
  }

  function focusNextInput(input){
    var inputs = Array.prototype.slice.call(document.querySelectorAll(".def-note-input:not(:disabled)"));
    var index = inputs.indexOf(input);

    if(index >= 0 && inputs[index + 1]){
      inputs[index + 1].focus();
      inputs[index + 1].select();
      return true;
    }

    return false;
  }

  function onEnter(input){
    if(!validateInput(input, false)){
      clearAutoTimer();
      updatePendingMessage();
      return;
    }

    var id = input.getAttribute("data-id");

    if(hasPending(id)){
      saveRow(id, "enter");
    }

    focusNextInput(input);
  }

  function attachInput(input){
    if(!input || input.__defartSaveBound){
      return;
    }

    input.__defartSaveBound = true;

    input.addEventListener("keydown", function(event){
      if(blockInvalidKey(event)){
        return;
      }

      if(event.key === "Enter"){
        event.preventDefault();
        onEnter(input);
      }
    });

    input.addEventListener("input", function(){
      onInput(input);
    });

    input.addEventListener("blur", function(){
      onBlur(input);
    });
  }

  function flushBeforeUnload(){
    if(state.saving || invalidCount() || !pendingCount()){
      return;
    }

    try{
      var changes = changesArray().map(function(change){
        return prepareChangeForSave(change, {updateInputs:false});
      });

      if(changes.length && window.DefartCore && typeof window.DefartCore.saveNotes === "function"){
        window.DefartCore.saveNotes(changes);
      }
    }catch(error){}
  }

  function init(config){
    state.api = config || {};

    if(!state.unloadBound){
      state.unloadBound = true;
      window.addEventListener("beforeunload", flushBeforeUnload);
      window.addEventListener("pagehide", flushBeforeUnload);
    }

    updatePendingMessage();
    return window.DefartSave;
  }

  function isSaving(){
    return !!state.saving;
  }

  window.DefartSave = {
    init:init,
    attachInput:attachInput,
    saveRow:saveRow,
    saveAll:saveAll,
    setChange:setChange,
    pendingPatch:pendingPatch,
    hasPending:hasPending,
    hasInvalid:hasInvalid,
    updatePendingMessage:updatePendingMessage,
    validateInput:validateInput,
    validateAllVisibleInputs:validateAllVisibleInputs,
    isSaving:isSaving,
    clearAll:clearAll,
    toast:toast,
    scheduleAutoSave:scheduleAutoSave
  };
})(window, document);