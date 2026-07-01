/* =========================================================
Nombre completo: carga.ui.js
Ruta: /Carga/carga.ui.js
Función:
- Controlar la pantalla especializada Carga/carga.html.
- No renderizar tabla/lista de estudiantes.
- Mostrar resumen, carreras, requisitos, errores, advertencias y log.
- Gestionar períodos desde Carga.
- Mostrar progreso real durante limpieza, guardado y verificación.
========================================================= */
(function(window, document){
  "use strict";

  var state = {
    currentResult: null,
    currentReport: null,
    periodos: [],
    booted: false,
    busy: false
  };

  var els = {};

  function $(id){ return document.getElementById(id); }

  function initEls(){
    els.status = $("cargaStatus");
    els.progressCard = $("cargaProgressCard");
    els.progressTitle = $("cargaProgressTitle");
    els.progressPercent = $("cargaProgressPercent");
    els.progressTrack = document.querySelector(".carga-progress-track");
    els.progressBar = $("cargaProgressBar");
    els.progressMessage = $("cargaProgressMessage");

    els.periodoSelect = $("cargaPeriodoSelect");
    els.mesInicio = $("cargaMesInicio");
    els.anioInicio = $("cargaAnioInicio");
    els.mesFin = $("cargaMesFin");
    els.anioFin = $("cargaAnioFin");
    els.btnCrearPeriodo = $("cargaBtnCrearPeriodo");
    els.btnRecargarPeriodos = $("cargaBtnRecargarPeriodos");
    els.btnBorrarPeriodo = $("cargaBtnBorrarPeriodo");
    els.btnBorrarPeriodoInline = $("cargaBtnBorrarPeriodoInline");
    els.btnLimpiar = $("cargaBtnLimpiar");

    els.file = $("cargaFile");
    els.fileName = $("cargaFileName");
    els.btnAnalizar = $("cargaBtnAnalizar");
    els.btnGuardar = $("cargaBtnGuardar");
    els.modoReemplazo = $("cargaModoReemplazo");
    els.textoPegado = $("cargaTextoPegado");
    els.btnAnalizarTexto = $("cargaBtnAnalizarTexto");
    els.badgeEstado = $("cargaBadgeEstado");

    els.kpiEstudiantes = $("cargaKpiEstudiantes");
    els.kpiGuardados = $("cargaKpiGuardados");
    els.kpiCampos = $("cargaKpiCampos");
    els.kpiCarreras = $("cargaKpiCarreras");
    els.kpiRequisitos = $("cargaKpiRequisitos");
    els.kpiAdvertencias = $("cargaKpiAdvertencias");
    els.kpiErrores = $("cargaKpiErrores");
    els.kpiDanados = $("cargaKpiDanados");

    els.lecturaInfo = $("cargaLecturaInfo");
    els.carreras = $("cargaCarreras");
    els.carrerasMeta = $("cargaCarrerasMeta");
    els.requisitos = $("cargaRequisitos");
    els.requisitosMeta = $("cargaRequisitosMeta");
    els.issues = $("cargaIssues");
    els.issuesMeta = $("cargaIssuesMeta");
    els.log = $("cargaLog");

    els.modal = $("cargaResumenModal");
    els.resumenFecha = $("cargaResumenFecha");
    els.resumenBody = $("cargaResumenBody");
    els.btnCerrarResumen = $("cargaBtnCerrarResumen");
    els.btnOkResumen = $("cargaBtnOkResumen");
  }

  function text(value){ return String(value == null ? "" : value).trim(); }
  function safeArray(value){ return Array.isArray(value) ? value : []; }

  function esc(value){
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fmt(value){ return value == null || value === "" ? "—" : String(value); }

  function setText(node, value){ if(node){ node.textContent = String(value == null ? "" : value); } }

  function setStatus(message, type){
    if(!els.status){ return; }
    els.status.classList.remove("ok", "warn", "error");
    if(type){ els.status.classList.add(type); }
    els.status.textContent = message || "Listo.";
  }

  function setBadge(message, type){
    if(!els.badgeEstado){ return; }
    els.badgeEstado.classList.remove("ok", "warn", "error");
    if(type){ els.badgeEstado.classList.add(type); }
    els.badgeEstado.textContent = message || "Sin carga";
  }

  function log(message, data){
    if(!els.log){ return; }
    var line = "[" + new Date().toLocaleString() + "] " + text(message);
    if(data !== undefined){
      try{ line += "\n" + JSON.stringify(data, null, 2); }
      catch(error){ line += "\n" + String(data); }
    }
    els.log.textContent = line + "\n\n" + els.log.textContent;
  }

  function unique(values){
    var map = Object.create(null), out = [];
    safeArray(values).forEach(function(value){
      var clean = text(value);
      var key = clean.toLowerCase();
      if(clean && !map[key]){ map[key] = true; out.push(clean); }
    });
    return out;
  }

  function monthName(value){
    var names = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    var index = Math.max(1, Math.min(12, Number(value || 1))) - 1;
    return names[index];
  }

  function periodIdOf(periodo){
    periodo = periodo || {};
    return text(periodo.periodoId || periodo.id || periodo.value || periodo.key || periodo.codigo || "");
  }

  function periodLabelOf(periodo){
    periodo = periodo || {};
    return text(periodo.periodoLabel || periodo.label || periodo.nombre || periodo.name || periodo.descripcion || periodo.periodo || periodo.id || periodo.periodoId || "");
  }

  function selectedPeriod(){
    var id = els.periodoSelect ? text(els.periodoSelect.value) : "";
    var found = null;
    state.periodos.some(function(periodo){
      if(periodIdOf(periodo) === id){ found = periodo; return true; }
      return false;
    });
    return { periodoId:id, periodoLabel: found ? periodLabelOf(found) : id };
  }

  function appOptions(){
    var period = selectedPeriod();
    return { periodoId: period.periodoId, periodoLabel: period.periodoLabel };
  }

  function setProgress(detail){
    detail = detail || {};
    var current = Number(detail.current || 0);
    var total = Number(detail.total || 0);
    var percent = total > 0 ? Math.max(0, Math.min(100, Math.round((current / total) * 100))) : 0;
    var message = detail.message || "Procesando...";

    if(els.progressCard){ els.progressCard.classList.add("is-visible"); }
    if(els.progressBar){ els.progressBar.style.width = percent + "%"; }
    if(els.progressPercent){ els.progressPercent.textContent = percent + "%"; }
    if(els.progressMessage){ els.progressMessage.textContent = message; }
    if(els.progressTrack){ els.progressTrack.setAttribute("aria-valuenow", String(percent)); }
    if(els.progressTitle){ els.progressTitle.textContent = detail.phase ? "Progreso · " + detail.phase : "Progreso de carga"; }
  }

  function resetProgress(message){
    if(els.progressCard){ els.progressCard.classList.remove("is-visible"); }
    if(els.progressBar){ els.progressBar.style.width = "0%"; }
    if(els.progressPercent){ els.progressPercent.textContent = "0%"; }
    if(els.progressMessage){ els.progressMessage.textContent = message || "Esperando operación..."; }
    if(els.progressTrack){ els.progressTrack.setAttribute("aria-valuenow", "0"); }
  }

  function setBusy(value){
    state.busy = !!value;
    [
      els.periodoSelect,
      els.btnCrearPeriodo,
      els.btnRecargarPeriodos,
      els.btnBorrarPeriodo,
      els.btnBorrarPeriodoInline,
      els.btnLimpiar,
      els.file,
      els.btnAnalizar,
      els.btnGuardar,
      els.modoReemplazo,
      els.textoPegado,
      els.btnAnalizarTexto
    ].forEach(function(node){
      if(!node){ return; }
      if(node === els.btnGuardar){
        node.disabled = !!value || !state.currentResult || hasCurrentErrors();
        return;
      }
      if(node === els.btnBorrarPeriodo || node === els.btnBorrarPeriodoInline){
        node.disabled = !!value || !selectedPeriod().periodoId;
        return;
      }
      node.disabled = !!value;
    });
  }

  function hasCurrentErrors(){
    var current = window.CargaState && typeof window.CargaState.get === "function" ? window.CargaState.get() : {};
    return safeArray(current.errors).length > 0;
  }

  function updatePeriodButtons(){
    var hasPeriod = !!selectedPeriod().periodoId;
    if(els.btnBorrarPeriodo){ els.btnBorrarPeriodo.disabled = state.busy || !hasPeriod; }
    if(els.btnBorrarPeriodoInline){ els.btnBorrarPeriodoInline.disabled = state.busy || !hasPeriod; }
  }

  function bootBDLocal(){
    if(window.BDLocal && typeof window.BDLocal.boot === "function"){
      return Promise.resolve(window.BDLocal.boot()).catch(function(error){
        console.warn("[CargaUI] BDLocal.boot falló", error);
        return null;
      });
    }
    if(window.BDLDB && typeof window.BDLDB.open === "function"){
      return window.BDLDB.open().catch(function(error){
        console.warn("[CargaUI] BDLDB.open falló", error);
        return null;
      });
    }
    return Promise.resolve(null);
  }

  function listarPeriodos(){
    return bootBDLocal().then(function(){
      if(window.BDLRepoPeriodos && typeof window.BDLRepoPeriodos.listar === "function"){
        return window.BDLRepoPeriodos.listar();
      }
      if(window.BDLocal && window.BDLocal.periodos && typeof window.BDLocal.periodos.listar === "function"){
        return window.BDLocal.periodos.listar({ force:true });
      }
      if(window.BDLDB && window.BDLConfig && window.BDLConfig.stores && window.BDLConfig.stores.periodos){
        return window.BDLDB.list(window.BDLConfig.stores.periodos, { limit:0 });
      }
      return [];
    }).then(function(rows){
      rows = safeArray(rows);
      rows.sort(function(a, b){ return periodLabelOf(a).localeCompare(periodLabelOf(b), "es"); });
      return rows;
    });
  }

  function renderPeriodos(periodos){
    periodos = safeArray(periodos);
    state.periodos = periodos;
    if(!els.periodoSelect){ return; }

    var previous = text(els.periodoSelect.value);
    if(!periodos.length){
      els.periodoSelect.innerHTML = '<option value="">Sin períodos registrados</option>';
      updatePeriodButtons();
      return;
    }

    els.periodoSelect.innerHTML = '<option value="">Selecciona un período</option>' + periodos.map(function(periodo){
      var id = periodIdOf(periodo);
      var label = periodLabelOf(periodo) || id;
      return '<option value="' + esc(id) + '">' + esc(label) + '</option>';
    }).join("");

    if(previous){ els.periodoSelect.value = previous; }
    if(!els.periodoSelect.value && periodos.length === 1){ els.periodoSelect.value = periodIdOf(periodos[0]); }
    updatePeriodButtons();
  }

  function cargarPeriodos(){
    setStatus("Cargando períodos...", "");
    return listarPeriodos().then(function(periodos){
      renderPeriodos(periodos);
      setStatus("Períodos cargados: " + periodos.length + ".", "ok");
      log("Períodos cargados", { total: periodos.length });
      return periodos;
    }).catch(function(error){
      setStatus("No se pudieron cargar períodos: " + (error && error.message ? error.message : error), "warn");
      log("Error cargando períodos", error && error.message ? error.message : error);
      return [];
    });
  }

  function crearPeriodo(){
    var data = {
      mesInicio: Number(els.mesInicio && els.mesInicio.value || 1),
      anioInicio: Number(els.anioInicio && els.anioInicio.value || new Date().getFullYear()),
      mesFin: Number(els.mesFin && els.mesFin.value || 1),
      anioFin: Number(els.anioFin && els.anioFin.value || new Date().getFullYear())
    };

    if(!data.anioInicio || !data.anioFin){
      setStatus("Completa los años del período.", "warn");
      return Promise.resolve(null);
    }

    var label = monthName(data.mesInicio) + " " + data.anioInicio + " a " + monthName(data.mesFin) + " " + data.anioFin;
    setBusy(true);
    setStatus("Creando período: " + label + "...", "");

    return bootBDLocal().then(function(){
      if(window.BDLRepoPeriodos && typeof window.BDLRepoPeriodos.guardarManual === "function"){
        return window.BDLRepoPeriodos.guardarManual(data);
      }
      if(window.BDLRepoPeriodos && typeof window.BDLRepoPeriodos.guardar === "function"){
        return window.BDLRepoPeriodos.guardar({ periodoLabel: label });
      }
      throw new Error("BDLRepoPeriodos no está disponible.");
    }).then(function(periodo){
      setStatus("Período creado: " + periodLabelOf(periodo), "ok");
      log("Período creado", periodo);
      return cargarPeriodos().then(function(){
        if(els.periodoSelect){ els.periodoSelect.value = periodIdOf(periodo); }
        updatePeriodButtons();
        return periodo;
      });
    }).catch(function(error){
      setStatus("No se pudo crear el período: " + (error && error.message ? error.message : error), "error");
      log("Error creando período", error && error.message ? error.message : error);
      return null;
    }).finally(function(){ setBusy(false); });
  }

  function borrarPeriodo(){
    var period = selectedPeriod();
    if(!period.periodoId){
      setStatus("Selecciona un período para borrar.", "warn");
      return;
    }

    var label = period.periodoLabel || period.periodoId;

    bootBDLocal().then(function(){
      if(window.BDLRepoEstudiantes && typeof window.BDLRepoEstudiantes.contarPorPeriodo === "function"){
        return window.BDLRepoEstudiantes.contarPorPeriodo(period.periodoId).catch(function(){ return 0; });
      }
      return 0;
    }).then(function(total){
      var msg = "Vas a borrar el período:\n\n" + label + "\n\nTambién se eliminarán " + total + " estudiante(s), notas, requisitos, divisiones y dashboard asociados a ese período.\n\n¿Deseas continuar?";
      if(!window.confirm(msg)){ return null; }

      setBusy(true);
      setProgress({ current:0, total:1, message:"Borrando período", phase:"delete" });
      setStatus("Borrando período seleccionado...", "warn");
      setBadge("Borrando", "warn");

      if(!window.BDLRepoPeriodos){ throw new Error("BDLRepoPeriodos no está disponible."); }
      if(typeof window.BDLRepoPeriodos.borrarConDatos === "function"){
        return window.BDLRepoPeriodos.borrarConDatos(period.periodoId, { withData:true, onProgress:setProgress });
      }
      if(typeof window.BDLRepoPeriodos.borrar === "function"){
        return window.BDLRepoPeriodos.borrar(period.periodoId, { withData:true, onProgress:setProgress });
      }
      throw new Error("No hay función para borrar períodos.");
    }).then(function(result){
      if(!result){ return; }
      log("Período borrado", result);
      setProgress({ current:1, total:1, message:"Período borrado correctamente", phase:"delete" });
      setStatus("Período borrado correctamente.", "ok");
      setBadge("Listo", "ok");
      clearScreen(false);
      return cargarPeriodos();
    }).catch(function(error){
      setStatus("No se pudo borrar el período: " + (error && error.message ? error.message : error), "error");
      setBadge("Error", "error");
      log("Error borrando período", error && error.message ? error.message : error);
    }).finally(function(){
      setBusy(false);
      updatePeriodButtons();
    });
  }

  function collectFields(rows){
    var fields = [];
    safeArray(rows).slice(0, 100).forEach(function(row){
      Object.keys(row || {}).forEach(function(field){ if(fields.indexOf(field) < 0){ fields.push(field); } });
    });
    return fields;
  }

  function collectCareers(rows, normalized){
    if(normalized && normalized.carrerasDetectadas){
      return Object.keys(normalized.carrerasDetectadas).sort(function(a, b){ return a.localeCompare(b, "es"); });
    }
    return unique(safeArray(rows).map(function(row){
      return row.nombreCarrera || row.NombreCarrera || row.Carrera || row.carrera || row.carreraNormalizada || row.nombreCarreraOriginal || row.programa || "";
    })).sort(function(a, b){ return a.localeCompare(b, "es"); });
  }

  function collectRequirements(rows){
    if(window.CargaDetectRequisitos && typeof window.CargaDetectRequisitos.detect === "function"){
      return window.CargaDetectRequisitos.detect(rows).filter(function(item){ return !!item.detected; }).map(function(item){ return item.campoFirebase || item.requisitoId || ""; });
    }
    return [];
  }

  function setKpis(data){
    data = data || {};
    setText(els.kpiEstudiantes, data.estudiantes || 0);
    setText(els.kpiGuardados, data.guardados || 0);
    setText(els.kpiCampos, data.campos || 0);
    setText(els.kpiCarreras, data.carreras || 0);
    setText(els.kpiRequisitos, data.requisitos || 0);
    setText(els.kpiAdvertencias, data.advertencias || 0);
    setText(els.kpiErrores, data.errores || 0);
    setText(els.kpiDanados, data.danados || 0);
  }

  function renderKpis(result){
    result = result || {};
    var normalized = result.normalized || {};
    var validation = result.validation || {};
    var rows = safeArray(normalized.rowsMapeadas);
    var metadata = normalized.metadata || {};
    var fields = collectFields(rows);
    var careers = collectCareers(rows, normalized);
    var requirements = collectRequirements(rows);
    var errors = safeArray(validation.errors);
    var warnings = safeArray(validation.warnings);
    setKpis({
      estudiantes: normalized.total || rows.length || 0,
      guardados: 0,
      campos: fields.length,
      carreras: careers.length,
      requisitos: requirements.length,
      advertencias: warnings.length,
      errores: errors.length,
      danados: Number(metadata.damagedCharactersMapped || metadata.damagedCharactersOriginal || 0)
    });
  }

  function infoItem(label, value){
    return '<span class="carga-info-item"><strong>' + esc(label) + ':</strong> ' + esc(fmt(value)) + '</span>';
  }

  function renderLecturaInfo(result){
    result = result || {};
    var normalized = result.normalized || {};
    var metadata = normalized.metadata || {};
    var html = "";
    html += infoItem("Archivo", normalized.fileName || "—");
    html += infoItem("Tipo", metadata.detectedType || normalized.detectedType || "—");
    html += infoItem("Encoding", metadata.encoding || "—");
    html += infoItem("Confianza", metadata.confidence || "—");
    html += infoItem("Filas leídas", metadata.rowCount || normalized.total || 0);
    html += infoItem("Caracteres dañados", metadata.damagedCharactersMapped || metadata.damagedCharactersOriginal || 0);
    html += infoItem("Reemplazos", metadata.replacements || 0);
    html += infoItem("Columnas eliminadas", safeArray(metadata.columnsRemoved).length);
    if(metadata.sheetName){ html += infoItem("Hoja", metadata.sheetName); }
    if(metadata.totalTables){ html += infoItem("Tablas HTML", metadata.totalTables); }
    if(els.lecturaInfo){ els.lecturaInfo.innerHTML = html || '<div class="carga-empty compact">Todavía no hay archivo leído.</div>'; }
  }

  function renderPills(target, values, empty){
    if(!target){ return; }
    values = safeArray(values).filter(function(value){ return text(value); });
    if(!values.length){ target.innerHTML = '<span>' + esc(empty || "Sin datos") + '</span>'; return; }
    target.innerHTML = values.map(function(value){ return '<span class="carga-pill">' + esc(value) + '</span>'; }).join("");
  }

  function issueHtml(item, type){
    item = item || {};
    var row = item.row ? "Fila " + item.row + " · " : "";
    return '<article class="carga-issue ' + esc(type) + '">' +
      '<strong>' + esc(row + (item.tipo || (type === "error" ? "ERROR" : "ADVERTENCIA"))) + '</strong>' +
      '<p>' + esc(item.mensaje || item.message || "Sin detalle.") + '</p>' +
      '</article>';
  }

  function renderIssues(validation){
    validation = validation || {};
    var errors = safeArray(validation.errors);
    var warnings = safeArray(validation.warnings);
    var total = errors.length + warnings.length;
    setText(els.issuesMeta, total);
    if(!els.issues){ return; }
    if(!total){ els.issues.innerHTML = '<div class="carga-empty">Sin errores ni advertencias.</div>'; return; }
    els.issues.innerHTML = errors.map(function(item){ return issueHtml(item, "error"); }).join("") + warnings.map(function(item){ return issueHtml(item, "warn"); }).join("");
  }

  function renderResult(result){
    state.currentResult = result || null;
    state.currentReport = null;
    result = result || {};

    var normalized = result.normalized || {};
    var validation = result.validation || {};
    var rows = safeArray(normalized.rowsMapeadas);
    var careers = collectCareers(rows, normalized);
    var requirements = collectRequirements(rows);

    renderKpis(result);
    renderLecturaInfo(result);
    renderPills(els.carreras, careers, "Sin carreras detectadas.");
    renderPills(els.requisitos, requirements, "Sin requisitos detectados.");
    renderIssues(validation);
    setText(els.carrerasMeta, careers.length);
    setText(els.requisitosMeta, requirements.length);

    if(validation.ok){
      setStatus("Carga lista para guardar.", "ok");
      setBadge("Lista", "ok");
      if(els.btnGuardar){ els.btnGuardar.disabled = false; }
    }else{
      setStatus("Carga con errores. No se guardará hasta corregir la lectura.", "error");
      setBadge("Con errores", "error");
      if(els.btnGuardar){ els.btnGuardar.disabled = true; }
    }

    log("Resultado de análisis", {
      total: normalized.total || 0,
      metadata: normalized.metadata || {},
      errores: safeArray(validation.errors).length,
      advertencias: safeArray(validation.warnings).length
    });
  }

  function requirePeriod(){
    var period = selectedPeriod();
    if(!period.periodoId){
      setStatus("Selecciona un período antes de analizar o guardar.", "warn");
      return false;
    }
    return true;
  }

  function analizarArchivo(){
    if(!requirePeriod()){ return; }
    if(!window.CargaApp || typeof window.CargaApp.readFile !== "function"){
      setStatus("CargaApp no está disponible.", "error");
      return;
    }
    var file = els.file && els.file.files ? els.file.files[0] : null;
    if(!file){ setStatus("Selecciona un archivo primero.", "warn"); return; }

    setBusy(true);
    resetProgress();
    setProgress({ current:0, total:1, message:"Analizando archivo", phase:"read" });
    setStatus("Analizando archivo...", "");
    setBadge("Analizando", "warn");

    window.CargaApp.readFile(file, appOptions()).then(function(result){
      renderResult(result);
    }).catch(function(error){
      setStatus("Error analizando archivo: " + (error && error.message ? error.message : error), "error");
      setBadge("Error", "error");
      log("Error analizando archivo", error && error.message ? error.message : error);
    }).finally(function(){
      setBusy(false);
      if(state.currentResult && !hasCurrentErrors() && els.btnGuardar){ els.btnGuardar.disabled = false; }
      updatePeriodButtons();
    });
  }

  function analizarTexto(){
    if(!requirePeriod()){ return; }
    if(!window.CargaApp || typeof window.CargaApp.readClipboard !== "function"){
      setStatus("CargaApp no está disponible.", "error");
      return;
    }
    var raw = els.textoPegado ? els.textoPegado.value : "";
    if(!text(raw)){ setStatus("Pega datos primero.", "warn"); return; }

    setBusy(true);
    resetProgress();
    setProgress({ current:0, total:1, message:"Analizando texto pegado", phase:"read" });
    setStatus("Analizando texto pegado...", "");
    setBadge("Analizando", "warn");

    window.CargaApp.readClipboard(raw, appOptions()).then(function(result){
      renderResult(result);
    }).catch(function(error){
      setStatus("Error analizando texto: " + (error && error.message ? error.message : error), "error");
      setBadge("Error", "error");
      log("Error analizando texto", error && error.message ? error.message : error);
    }).finally(function(){
      setBusy(false);
      if(state.currentResult && !hasCurrentErrors() && els.btnGuardar){ els.btnGuardar.disabled = false; }
      updatePeriodButtons();
    });
  }

  function guardarCarga(){
    if(!state.currentResult){ setStatus("Primero analiza un archivo.", "warn"); return; }
    if(!requirePeriod()){ return; }
    if(!window.CargaApp || typeof window.CargaApp.save !== "function"){
      setStatus("CargaApp.save no está disponible.", "error");
      return;
    }

    var replace = !els.modoReemplazo || els.modoReemplazo.checked !== false;
    var period = selectedPeriod();
    var total = state.currentResult && state.currentResult.normalized ? (state.currentResult.normalized.total || safeArray(state.currentResult.normalized.rowsMapeadas).length) : 0;

    if(replace){
      var msg = "Vas a reemplazar la carga completa del período:\n\n" + (period.periodoLabel || period.periodoId) + "\n\nSe borrarán los estudiantes anteriores de ese período y se guardarán " + total + " estudiante(s) del archivo actual.\n\n¿Continuar?";
      if(!window.confirm(msg)){ return; }
    }

    setBusy(true);
    resetProgress();
    setProgress({ current:0, total:total, message: replace ? "Preparando reemplazo completo" : "Preparando actualización", phase:"prepare" });
    setStatus(replace ? "Reemplazando carga completa del período..." : "Guardando en BDLocal...", "");
    setBadge("Guardando", "warn");

    window.CargaApp.save({
      periodoId: period.periodoId,
      periodoLabel: period.periodoLabel,
      replacePeriod: replace,
      mode: replace ? "replacePeriod" : "updatePeriod",
      onProgress: setProgress
    }).then(function(report){
      state.currentReport = report;
      renderSavedReport(report);
      openResumen(report);
    }).catch(function(error){
      setStatus("Error guardando: " + (error && error.message ? error.message : error), "error");
      setBadge("Error", "error");
      log("Error guardando", error && error.message ? error.message : error);
    }).finally(function(){
      setBusy(false);
      if(els.btnGuardar){ els.btnGuardar.disabled = hasCurrentErrors(); }
      updatePeriodButtons();
    });
  }

  function renderSavedReport(report){
    report = report || {};
    var ver = report.verificacion || (report.detalle && report.detalle.result && report.detalle.result.verification) || null;
    var ok = report.ok && (!ver || ver.ok !== false);

    setStatus(ok ? "Carga guardada y verificada correctamente." : "La carga se guardó, pero la verificación encontró diferencias.", ok ? "ok" : "warn");
    setBadge(ok ? "Verificada" : "Revisar", ok ? "ok" : "warn");

    setKpis({
      estudiantes: report.total || 0,
      guardados: ver ? ver.guardados : (report.guardados || 0),
      campos: report.campos && report.campos.total || 0,
      carreras: report.carreras && report.carreras.total || 0,
      requisitos: report.requisitos && report.requisitos.total || 0,
      advertencias: report.advertencias || 0,
      errores: report.errores || 0,
      danados: report.lectura && report.lectura.caracteresDanados || 0
    });

    if(ver){ setProgress({ current: ver.guardados || 0, total: ver.esperados || report.total || 0, message: ver.message || "Verificación finalizada", phase:"verify" }); }
    log("Reporte final", report);
  }

  function summaryCard(label, value){
    return '<article><span>' + esc(label) + '</span><strong>' + esc(fmt(value)) + '</strong></article>';
  }

  function resumenSection(title, values){
    values = safeArray(values);
    if(!values.length){ return ""; }
    return '<section class="carga-summary-section">' +
      '<h3>' + esc(title) + '</h3>' +
      '<div class="carga-pills">' + values.map(function(value){ return '<span>' + esc(value) + '</span>'; }).join("") + '</div>' +
      '</section>';
  }

  function openResumen(report){
    report = report || {};
    if(!els.modal || !els.resumenBody){ return; }
    if(els.resumenFecha){ els.resumenFecha.textContent = new Date(report.createdAt || Date.now()).toLocaleString(); }

    var lectura = report.lectura || {};
    var ver = report.verificacion || (report.detalle && report.detalle.result && report.detalle.result.verification) || null;
    var html = "";

    html += '<div class="carga-summary-grid">';
    html += summaryCard("Estudiantes detectados", report.total || 0);
    html += summaryCard("Guardados en BDLocal", ver ? ver.guardados : (report.guardados || 0));
    html += summaryCard("Esperados en verificación", ver ? ver.esperados : (report.total || 0));
    html += summaryCard("Estado verificación", ver ? (ver.ok ? "Correcta" : "Con diferencias") : "No disponible");
    html += summaryCard("Modo", report.reemplazoPeriodo ? "Carga completa" : "Actualizar/agregar");
    html += summaryCard("Campos detectados", report.campos && report.campos.total || 0);
    html += summaryCard("Carreras detectadas", report.carreras && report.carreras.total || 0);
    html += summaryCard("Requisitos detectados", report.requisitos && report.requisitos.total || 0);
    html += summaryCard("Advertencias", report.advertencias || 0);
    html += summaryCard("Errores", report.errores || 0);
    html += summaryCard("Encoding", lectura.encoding || "—");
    html += '</div>';

    if(ver && ver.ok === false){
      html += '<section class="carga-summary-section">';
      html += '<h3>Revisión necesaria</h3>';
      html += '<p>Detectados: ' + esc(ver.esperados) + ' · Guardados: ' + esc(ver.guardados) + ' · Diferencia: ' + esc(ver.diferencia) + '</p>';
      html += '<p>' + esc(ver.message || "La verificación encontró diferencias.") + '</p>';
      html += '</section>';
    }

    html += '<section class="carga-summary-section"><h3>Archivo</h3><p>' + esc(report.archivo || "—") + '</p></section>';
    html += '<section class="carga-summary-section"><h3>Período</h3><p>' + esc(report.periodo && (report.periodo.label || report.periodo.id) || "—") + '</p></section>';
    html += '<section class="carga-summary-section"><h3>Lectura</h3><div class="carga-info-grid">';
    html += infoItem("Tipo", lectura.tipoDetectado || "—");
    html += infoItem("Encoding", lectura.encoding || "—");
    html += infoItem("Caracteres dañados", lectura.caracteresDanados || 0);
    html += infoItem("Columnas eliminadas", lectura.totalColumnasEliminadas || 0);
    html += '</div></section>';

    html += resumenSection("Campos cargados", report.campos && report.campos.nombres || []);
    html += resumenSection("Carreras detectadas", report.carreras && report.carreras.nombres || []);
    html += resumenSection("Requisitos detectados", report.requisitos && report.requisitos.nombres || []);

    if(safeArray(report.erroresDetalle).length){
      html += resumenSection("Errores", report.erroresDetalle.map(function(item){ return (item.tipo || "ERROR") + ": " + (item.mensaje || ""); }));
    }
    if(safeArray(report.advertenciasDetalle).length){
      html += resumenSection("Advertencias", report.advertenciasDetalle.map(function(item){ return (item.tipo || "ADVERTENCIA") + ": " + (item.mensaje || ""); }));
    }

    els.resumenBody.innerHTML = html;
    els.modal.hidden = false;
  }

  function closeResumen(){ if(els.modal){ els.modal.hidden = true; } }

  function clearScreen(resetPeriodo){
    if(resetPeriodo === undefined){ resetPeriodo = false; }

    state.currentResult = null;
    state.currentReport = null;

    if(window.CargaState && typeof window.CargaState.reset === "function"){ window.CargaState.reset(); }
    if(els.file){ els.file.value = ""; }
    if(els.fileName){ els.fileName.textContent = "Ningún archivo seleccionado."; }
    if(els.textoPegado){ els.textoPegado.value = ""; }
    if(els.btnGuardar){ els.btnGuardar.disabled = true; }
    if(resetPeriodo && els.periodoSelect){ els.periodoSelect.value = ""; }

    setKpis({ estudiantes:0, guardados:0, campos:0, carreras:0, requisitos:0, advertencias:0, errores:0, danados:0 });
    if(els.lecturaInfo){ els.lecturaInfo.innerHTML = '<div class="carga-empty compact">Todavía no hay archivo leído.</div>'; }
    if(els.carreras){ els.carreras.innerHTML = '<span>Sin carreras detectadas.</span>'; }
    if(els.requisitos){ els.requisitos.innerHTML = '<span>Sin requisitos detectados.</span>'; }
    if(els.issues){ els.issues.innerHTML = '<div class="carga-empty">Sin errores ni advertencias.</div>'; }
    setText(els.carrerasMeta, "0");
    setText(els.requisitosMeta, "0");
    setText(els.issuesMeta, "0");
    resetProgress();
    updatePeriodButtons();
    setStatus("Pantalla limpia. Selecciona período y archivo.", "ok");
    setBadge("Sin carga", "");
    log("Pantalla limpiada");
  }

  function checkModules(){
    var required = [
      "BDLNormText",
      "BDLNormPeriodo",
      "BDLNormCarrera",
      "BDLNormEstudiante",
      "BDLRepoPeriodos",
      "BDLRepoEstudiantes",
      "CargaConfig",
      "CargaState",
      "CargaReaderEncoding",
      "CargaReaderFile",
      "CargaFieldMap",
      "CargaNormalizer",
      "CargaValidator",
      "CargaReport",
      "CargaApp"
    ];
    var missing = required.filter(function(name){ return !window[name]; });
    return { ok: missing.length === 0, missing: missing };
  }

  function bindEvents(){
    if(els.file){
      els.file.addEventListener("change", function(){
        var file = els.file.files && els.file.files[0];
        if(els.fileName){ els.fileName.textContent = file ? file.name : "Ningún archivo seleccionado."; }
      });
    }

    if(els.periodoSelect){ els.periodoSelect.addEventListener("change", updatePeriodButtons); }
    if(els.btnAnalizar){ els.btnAnalizar.addEventListener("click", analizarArchivo); }
    if(els.btnAnalizarTexto){ els.btnAnalizarTexto.addEventListener("click", analizarTexto); }
    if(els.btnGuardar){ els.btnGuardar.addEventListener("click", guardarCarga); }
    if(els.btnLimpiar){ els.btnLimpiar.addEventListener("click", function(){ clearScreen(false); }); }
    if(els.btnCrearPeriodo){ els.btnCrearPeriodo.addEventListener("click", crearPeriodo); }
    if(els.btnRecargarPeriodos){ els.btnRecargarPeriodos.addEventListener("click", cargarPeriodos); }
    if(els.btnBorrarPeriodo){ els.btnBorrarPeriodo.addEventListener("click", borrarPeriodo); }
    if(els.btnBorrarPeriodoInline){ els.btnBorrarPeriodoInline.addEventListener("click", borrarPeriodo); }

    if(els.btnCerrarResumen){ els.btnCerrarResumen.addEventListener("click", closeResumen); }
    if(els.btnOkResumen){ els.btnOkResumen.addEventListener("click", closeResumen); }
    if(els.modal){
      els.modal.addEventListener("click", function(event){
        if(event.target && event.target.getAttribute("data-carga-close") === "1"){ closeResumen(); }
      });
    }

    window.addEventListener("carga:status", function(event){
      var detail = event.detail || {};
      log("Estado Carga: " + (detail.status || ""), detail.message || "");
    });
    window.addEventListener("carga:progress", function(event){ setProgress(event.detail || {}); });
    window.addEventListener("carga:ready", function(event){ log("Módulo Carga listo", event.detail || {}); });
  }

  function boot(){
    initEls();
    bindEvents();

    var now = new Date();
    if(els.anioInicio && !els.anioInicio.value){ els.anioInicio.value = String(now.getFullYear()); }
    if(els.anioFin && !els.anioFin.value){ els.anioFin.value = String(now.getFullYear() + 1); }
    if(els.mesInicio && !els.mesInicio.value){ els.mesInicio.value = "11"; }
    if(els.mesFin && !els.mesFin.value){ els.mesFin.value = "5"; }

    var modules = checkModules();
    if(!modules.ok){
      setStatus("Faltan módulos: " + modules.missing.join(", "), "error");
      setBadge("Error módulos", "error");
      log("Módulos faltantes", modules.missing);
      return;
    }

    state.booted = true;
    setStatus("Módulos cargados. Preparando períodos...", "");
    setBadge("Listo", "ok");
    cargarPeriodos().then(function(){ clearScreen(false); });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }

  window.CargaUI = {
    boot: boot,
    cargarPeriodos: cargarPeriodos,
    crearPeriodo: crearPeriodo,
    borrarPeriodo: borrarPeriodo,
    analizarArchivo: analizarArchivo,
    analizarTexto: analizarTexto,
    guardarCarga: guardarCarga,
    clearScreen: clearScreen,
    setProgress: setProgress,
    getState: function(){ return Object.assign({}, state); }
  };
})(window, document);