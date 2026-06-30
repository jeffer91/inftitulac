(function(window){
  "use strict";

  var H = window.BDLUIH;
  if(!H){ throw new Error("BDLUIH debe cargarse antes de BDLUIDivisiones."); }

  var state = { periodoId:"", periodos:[], config:{ divisiones:[] }, carreras:[], selected:"", selectedCarreras:[] };

  function keyList(list){ return Array.isArray(list) ? list : []; }
  function divs(){ return state.config.divisiones || []; }
  function selectedDiv(){ return divs().filter(function(d){ return d.nombre === state.selected; })[0] || null; }
  function periodLabel(row){ return String(row && (row.periodoLabel || row.label || row.periodoId || row.id) || ""); }
  function periodId(row){ return String(row && (row.periodoId || row.id || row.value) || ""); }
  function assignedMap(ignoreSelected){
    var map = {};
    divs().forEach(function(d){
      if(ignoreSelected && d.nombre === state.selected){ return; }
      keyList(d.carreras).forEach(function(k){ map[k] = d.nombre; });
    });
    return map;
  }

  function injectPeriodFilter(){
    if(H.one('#bdlDivPeriodoSelect')){ return; }
    var body = H.one('#bdlDivModal .bdl-modal-body');
    var namebar = H.one('#bdlDivModal .bdl-division-namebar');
    if(!body || !namebar){ return; }
    var bar = document.createElement('div');
    bar.className = 'bdl-div-periodbar';
    bar.style.display = 'flex';
    bar.style.gap = '10px';
    bar.style.flexWrap = 'wrap';
    bar.style.alignItems = 'end';
    bar.style.padding = '10px';
    bar.style.border = '1px solid var(--bdl-border)';
    bar.style.borderRadius = '12px';
    bar.style.background = '#f8fbff';
    bar.innerHTML = '<label style="display:grid;gap:4px;font-size:12px;color:var(--bdl-muted);font-weight:700">Filtrar período<select id="bdlDivPeriodoSelect" class="bdl-select"><option value="">Seleccione período</option></select></label><span class="bdl-help">Las divisiones se guardan únicamente en el período seleccionado.</span>';
    body.insertBefore(bar, namebar);
  }

  function ajustarModalVisual(){
    var modal = H.one('#bdlDivModal');
    var card = H.one('#bdlDivModal .bdl-modal-card');
    var body = H.one('#bdlDivModal .bdl-modal-body');
    var layout = H.one('#bdlDivModal .bdl-div-layout');
    var lists = [H.one('#bdlDivList'), H.one('#bdlDivAvailable'), H.one('#bdlDivAssigned')];
    if(modal){ modal.style.overflow = 'hidden'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; }
    if(card){ card.style.width = 'min(980px, calc(100vw - 28px))'; card.style.maxHeight = 'calc(100vh - 28px)'; card.style.display = 'flex'; card.style.flexDirection = 'column'; }
    if(body){ body.style.overflow = 'auto'; body.style.maxHeight = 'calc(100vh - 155px)'; body.style.minHeight = '0'; }
    if(layout){ layout.style.gridTemplateColumns = window.innerWidth < 980 ? '1fr' : '220px minmax(220px, 1fr) minmax(220px, 1fr)'; layout.style.gap = '10px'; }
    lists.forEach(function(el){ if(el){ el.style.maxHeight = window.innerWidth < 980 ? '230px' : '46vh'; el.style.overflow = 'auto'; el.style.minHeight = '150px'; } });
  }

  function clearPeriodData(message){
    state.periodoId = '';
    state.config = { divisiones:[] };
    state.carreras = [];
    state.selected = '';
    if(H.one('#bdlDivPeriodo')){ H.one('#bdlDivPeriodo').textContent = '—'; }
    if(H.one('#bdlDivList')){ H.one('#bdlDivList').innerHTML = '<div class="bdl-empty">' + (message || 'Seleccione un período para crear divisiones.') + '</div>'; }
    if(H.one('#bdlDivAvailable')){ H.one('#bdlDivAvailable').innerHTML = '<div class="bdl-empty">Seleccione un período.</div>'; }
    if(H.one('#bdlDivAssigned')){ H.one('#bdlDivAssigned').innerHTML = '<div class="bdl-empty">Seleccione un período.</div>'; }
    if(H.one('#bdlDivName')){ H.one('#bdlDivName').value = ''; }
    ajustarModalVisual();
  }

  function renderPeriodos(){
    injectPeriodFilter();
    var sel = H.one('#bdlDivPeriodoSelect');
    if(!sel){ return; }
    var html = '<option value="">Seleccione período</option>';
    state.periodos.forEach(function(p){
      var id = periodId(p);
      if(!id){ return; }
      html += '<option value="'+H.esc(id)+'" '+(id===state.periodoId?'selected':'')+'>'+H.esc(periodLabel(p) || id)+'</option>';
    });
    sel.innerHTML = html;
  }

  function loadPeriodos(preferred){
    if(!window.BDLRepoPeriodos || typeof window.BDLRepoPeriodos.listar !== 'function'){
      return Promise.resolve([]);
    }
    return window.BDLRepoPeriodos.listar().then(function(rows){
      state.periodos = rows || [];
      var found = preferred && state.periodos.some(function(p){ return periodId(p) === preferred; });
      state.periodoId = found ? preferred : (state.periodos[0] ? periodId(state.periodos[0]) : '');
      renderPeriodos();
      return state.periodos;
    });
  }

  function renderDivisiones(){
    var box = H.one('#bdlDivList');
    if(!box){ return; }
    if(!state.periodoId){ box.innerHTML = '<div class="bdl-empty">Seleccione un período para empezar.</div>'; return; }
    if(!divs().length){ box.innerHTML = '<div class="bdl-empty">Cree una división para este período.</div>'; return; }
    box.innerHTML = divs().map(function(d){
      return '<button type="button" class="bdl-div-item '+(d.nombre===state.selected?'active':'')+'" data-div="'+H.esc(d.nombre)+'"><strong>'+H.esc(d.nombre)+'</strong><span>'+keyList(d.carreras).length+' carreras</span></button>';
    }).join("");
    Array.prototype.slice.call(box.querySelectorAll('[data-div]')).forEach(function(btn){
      btn.addEventListener('click', function(){ select(btn.getAttribute('data-div')); });
    });
  }

  function renderCarreras(){
    var avail = H.one('#bdlDivAvailable');
    var assigned = H.one('#bdlDivAssigned');
    var current = selectedDiv();
    var selectedKeys = current ? keyList(current.carreras) : [];
    var occupied = assignedMap(true);
    if(H.one('#bdlDivName')){ H.one('#bdlDivName').value = state.selected || ''; }
    if(avail){
      if(!state.periodoId){ avail.innerHTML = '<div class="bdl-empty">Seleccione un período.</div>'; }
      else {
        var available = state.carreras.filter(function(c){ return selectedKeys.indexOf(c.key) < 0 && !occupied[c.key]; });
        avail.innerHTML = available.length ? available.map(card).join('') : '<div class="bdl-empty">No hay carreras disponibles para este período.</div>';
      }
    }
    if(assigned){
      if(!state.periodoId){ assigned.innerHTML = '<div class="bdl-empty">Seleccione un período.</div>'; }
      else {
        var assignedRows = state.carreras.filter(function(c){ return selectedKeys.indexOf(c.key) >= 0; });
        assigned.innerHTML = assignedRows.length ? assignedRows.map(card).join('') : '<div class="bdl-empty">No hay carreras asignadas.</div>';
      }
    }
    bindCards();
    renderDivisiones();
    ajustarModalVisual();
  }

  function card(c){
    return '<button type="button" draggable="true" class="bdl-career-card" data-career="'+H.esc(c.key)+'"><strong>'+H.esc(c.nombre)+'</strong><span>'+H.esc(c.codigo || '')+'</span></button>';
  }

  function bindCards(){
    Array.prototype.slice.call(document.querySelectorAll('[data-career]')).forEach(function(el){
      el.addEventListener('click', function(){ toggleCareer(el.getAttribute('data-career')); });
      el.addEventListener('dragstart', function(event){ event.dataTransfer.setData('text/plain', el.getAttribute('data-career')); });
    });
  }

  function toggleCareer(key){
    if(!state.periodoId){ H.notify('Primero seleccione un período.', 'error'); return; }
    if(!state.selected){ H.notify('Primero cree o seleccione una división.', 'error'); return; }
    var current = selectedDiv();
    if(!current){ return; }
    current.carreras = keyList(current.carreras);
    var idx = current.carreras.indexOf(key);
    var occupied = assignedMap(true);
    if(idx >= 0){ current.carreras.splice(idx, 1); }
    else if(!occupied[key]){ current.carreras.push(key); }
    else { H.notify('Esa carrera ya pertenece a otra división de este período.', 'error'); }
    renderCarreras();
  }

  function createOrSelect(){
    if(!state.periodoId){ H.notify('Primero seleccione un período.', 'error'); return; }
    var name = H.val('#bdlDivName').trim();
    if(!name){ H.notify('Ingrese el nombre de la división.', 'error'); return; }
    var current = selectedDiv();
    if(current){ current.nombre = name; state.selected = name; }
    else if(!divs().some(function(d){ return d.nombre === name; })){ divs().push({ nombre:name, carreras:[] }); state.selected = name; }
    else { state.selected = name; }
    renderCarreras();
  }

  function select(name){ state.selected = name || ''; renderCarreras(); }

  function removeSelected(){
    if(!state.periodoId){ H.notify('Primero seleccione un período.', 'error'); return; }
    if(!state.selected){ H.notify('Seleccione una división.', 'error'); return; }
    state.config.divisiones = divs().filter(function(d){ return d.nombre !== state.selected; });
    state.selected = '';
    renderCarreras();
  }

  function save(){
    if(!state.periodoId){ H.notify('Seleccione un período.', 'error'); return; }
    if(!window.BDLRepoDivisiones){ H.notify('Repositorio de divisiones no disponible.', 'error'); return; }
    H.notify('Guardando divisiones del período ' + state.periodoId + '...');
    return window.BDLRepoDivisiones.saveConfig(state.periodoId, state.config).then(function(saved){
      return window.BDLRepoDivisiones.aplicarConfiguracion(state.periodoId, saved);
    }).then(function(result){
      close();
      var tasks = [];
      var mainSel = H.one('#bdlPeriodoSelect');
      if(mainSel){ mainSel.value = state.periodoId; }
      if(window.BDLRepoConfig){ tasks.push(window.BDLRepoConfig.guardarPeriodoActivo(state.periodoId)); }
      if(window.BDLUIDashboard){ tasks.push(window.BDLUIDashboard.loadDashboard(state.periodoId)); }
      return Promise.all(tasks).then(function(){ H.notify('Divisiones guardadas para ' + state.periodoId + '. Registros actualizados: ' + (result.updated || 0)); });
    }).catch(function(error){ H.notify(error && error.message ? error.message : String(error), 'error'); });
  }

  function loadPeriodData(periodo){
    if(!periodo){ clearPeriodData(); return Promise.resolve(); }
    if(!window.BDLRepoDivisiones){ H.notify('Repositorio de divisiones no disponible.', 'error'); return Promise.resolve(); }
    state.periodoId = periodo;
    state.selected = '';
    renderPeriodos();
    if(H.one('#bdlDivPeriodo')){ H.one('#bdlDivPeriodo').textContent = periodo; }
    return Promise.all([window.BDLRepoDivisiones.getConfig(periodo), window.BDLRepoDivisiones.carrerasPorPeriodo(periodo)]).then(function(parts){
      state.config = parts[0] || { periodoId:periodo, divisiones:[] };
      state.config.periodoId = periodo;
      state.config.divisiones = state.config.divisiones || [];
      state.carreras = parts[1] || [];
      renderCarreras();
      if(!state.carreras.length){ H.notify('El período seleccionado no tiene carreras cargadas todavía.', 'error'); }
    }).catch(function(error){ H.notify(error && error.message ? error.message : String(error), 'error'); });
  }

  function changePeriodo(periodo){
    return loadPeriodData(periodo).then(function(){
      var mainSel = H.one('#bdlPeriodoSelect');
      if(mainSel){ mainSel.value = periodo || ''; }
      if(window.BDLRepoConfig){ window.BDLRepoConfig.guardarPeriodoActivo(periodo || ''); }
      if(window.BDLUIDashboard && periodo){ window.BDLUIDashboard.loadDashboard(periodo); }
    });
  }

  function open(){
    var modal = H.one('#bdlDivModal');
    injectPeriodFilter();
    if(!window.BDLRepoDivisiones){ H.notify('Repositorio de divisiones no disponible.', 'error'); return; }
    var preferred = H.val('#bdlPeriodoSelect') || (window.BDLState && window.BDLState.getPeriodoActivo ? window.BDLState.getPeriodoActivo() : '');
    if(modal){ modal.classList.add('open'); }
    ajustarModalVisual();
    return loadPeriodos(preferred).then(function(periodos){
      if(!periodos.length){ clearPeriodData('Cree un período antes de crear divisiones.'); H.notify('Cree un período antes de crear divisiones.', 'error'); return; }
      return loadPeriodData(state.periodoId);
    }).catch(function(error){ H.notify(error && error.message ? error.message : String(error), 'error'); });
  }

  function close(){ var modal = H.one('#bdlDivModal'); if(modal){ modal.classList.remove('open'); } }
  function setupDrop(){
    injectPeriodFilter();
    var sel = H.one('#bdlDivPeriodoSelect');
    if(sel){ sel.addEventListener('change', function(){ changePeriodo(sel.value); }); }
    ['#bdlDivAvailable','#bdlDivAssigned'].forEach(function(selName){
      var box = H.one(selName);
      if(!box){ return; }
      box.addEventListener('dragover', function(e){ e.preventDefault(); });
      box.addEventListener('drop', function(e){ e.preventDefault(); toggleCareer(e.dataTransfer.getData('text/plain')); });
    });
  }

  window.addEventListener('resize', ajustarModalVisual);
  window.addEventListener('DOMContentLoaded', setupDrop);
  window.BDLUIDivisiones = { open:open, close:close, save:save, createOrSelect:createOrSelect, removeSelected:removeSelected, toggleCareer:toggleCareer, changePeriodo:changePeriodo, loadPeriodData:loadPeriodData };
})(window);