(function(window){
  "use strict";

  var H = window.BDLUIH;
  if(!H){ throw new Error("BDLUIH debe cargarse antes de BDLUIPeriodos."); }

  var editingId = "";
  var meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  function fillMonths(){
    ["#bdlPeriodoMesInicio", "#bdlPeriodoMesFin"].forEach(function(sel){
      var el = H.one(sel);
      if(!el || el.options.length > 1){ return; }
      el.innerHTML = meses.map(function(m, i){ return '<option value="'+(i+1)+'">'+m+'</option>'; }).join("");
    });
  }

  function formData(){
    return {
      mesInicio: Number(H.val('#bdlPeriodoMesInicio') || 1),
      anioInicio: Number(H.val('#bdlPeriodoAnioInicio') || new Date().getFullYear()),
      mesFin: Number(H.val('#bdlPeriodoMesFin') || 1),
      anioFin: Number(H.val('#bdlPeriodoAnioFin') || new Date().getFullYear())
    };
  }

  function setForm(row){
    row = row || {};
    H.one('#bdlPeriodoMesInicio').value = row.mesInicio || 1;
    H.one('#bdlPeriodoAnioInicio').value = row.anioInicio || new Date().getFullYear();
    H.one('#bdlPeriodoMesFin').value = row.mesFin || 1;
    H.one('#bdlPeriodoAnioFin').value = row.anioFin || row.anioInicio || new Date().getFullYear();
    editingId = row.periodoId || "";
    var label = H.one('#bdlPeriodoEditLabel');
    if(label){ label.textContent = editingId ? 'Editando: ' + editingId : 'Nuevo período'; }
  }

  function reset(){
    editingId = "";
    var y = new Date().getFullYear();
    setForm({ mesInicio:1, anioInicio:y, mesFin:6, anioFin:y });
    var label = H.one('#bdlPeriodoEditLabel');
    if(label){ label.textContent = 'Nuevo período'; }
  }

  function renderList(rows){
    var box = H.one('#bdlPeriodosList');
    if(!box){ return; }
    if(!rows.length){ box.innerHTML = '<div class="bdl-empty">No hay períodos creados.</div>'; return; }
    box.innerHTML = rows.map(function(p){
      return '<div class="bdl-period-item"><strong>'+H.esc(p.periodoLabel || p.periodoId)+'</strong><div><button class="bdl-btn ghost" data-period-edit="'+H.esc(p.periodoId)+'">Editar</button><button class="bdl-btn ghost" data-period-delete="'+H.esc(p.periodoId)+'">Borrar</button></div></div>';
    }).join("");
    Array.prototype.slice.call(box.querySelectorAll('[data-period-edit]')).forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-period-edit');
        var row = rows.filter(function(p){ return p.periodoId === id; })[0];
        setForm(row);
      });
    });
    Array.prototype.slice.call(box.querySelectorAll('[data-period-delete]')).forEach(function(btn){
      btn.addEventListener('click', function(){ borrar(btn.getAttribute('data-period-delete')); });
    });
  }

  function fillSelect(rows){
    var select = H.one('#bdlPeriodoSelect');
    if(!select){ return; }
    var current = select.value;
    select.innerHTML = '<option value="">Seleccione período</option>' + rows.map(function(p){ return '<option value="'+H.esc(p.periodoId)+'">'+H.esc(p.periodoLabel || p.periodoId)+'</option>'; }).join("");
    if(current){ select.value = current; }
    if(!select.value && rows[0]){ select.value = rows[0].periodoId; }
    if(select.value && window.BDLState){ window.BDLState.setPeriodoActivo(select.value); }
  }

  function load(){
    fillMonths();
    if(!window.BDLRepoPeriodos){ return Promise.resolve([]); }
    return window.BDLRepoPeriodos.listar().then(function(rows){
      rows = rows || [];
      renderList(rows);
      fillSelect(rows);
      return rows;
    });
  }

  function save(){
    if(!window.BDLRepoPeriodos){ H.notify('Repositorio de períodos no disponible.', 'error'); return; }
    var data = formData();
    var row = window.BDLRepoPeriodos.build(data.mesInicio, data.anioInicio, data.mesFin, data.anioFin);
    var afterOld = editingId && editingId !== row.periodoId ? window.BDLRepoPeriodos.borrar(editingId) : Promise.resolve();
    return afterOld.then(function(){ return window.BDLRepoPeriodos.guardar(row); }).then(function(saved){
      editingId = saved.periodoId;
      H.notify('Período guardado.');
      return load();
    });
  }

  function borrar(id){
    if(!id || !window.BDLRepoPeriodos){ return; }
    return window.BDLRepoPeriodos.borrar(id).then(function(){
      if(editingId === id){ reset(); }
      H.notify('Período borrado.');
      return load();
    });
  }

  window.BDLUIPeriodos = { load:load, save:save, reset:reset, borrar:borrar, fillMonths:fillMonths };
})(window);
