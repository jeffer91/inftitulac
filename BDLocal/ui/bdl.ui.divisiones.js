(function(window){
  "use strict";

  var H = window.BDLUIH;
  if(!H){ throw new Error("BDLUIH debe cargarse antes de BDLUIDivisiones."); }

  function open(){
    var modal = H.one('#bdlDivModal');
    var periodo = H.val('#bdlPeriodoSelect');
    if(!periodo){ H.notify('Seleccione un período antes de generar divisiones.', 'error'); return; }
    if(H.one('#bdlDivPeriodo')){ H.one('#bdlDivPeriodo').textContent = periodo; }
    if(modal){ modal.classList.add('open'); }
  }

  function close(){
    var modal = H.one('#bdlDivModal');
    if(modal){ modal.classList.remove('open'); }
  }

  function parseManual(text){
    return String(text || '').split(/\n+/).map(function(line){
      line = line.trim();
      if(!line || line.charAt(0) === '#'){ return null; }
      var parts = line.split(/[|;\t]/).map(function(v){ return v.trim(); }).filter(Boolean);
      if(parts.length < 2){ return null; }
      return { cedula: parts[0], division: parts[1] };
    }).filter(Boolean);
  }

  function reload(){
    var periodoId = H.val('#bdlPeriodoSelect');
    var tasks = [];
    if(window.BDLUIDashboard){ tasks.push(window.BDLUIDashboard.loadDashboard(periodoId)); }
    if(window.BDLUIEstudiantes){ tasks.push(window.BDLUIEstudiantes.load({ periodoId:periodoId, page:1 })); }
    return Promise.all(tasks);
  }

  function generate(){
    var periodoId = H.val('#bdlPeriodoSelect');
    if(!periodoId){ H.notify('Seleccione un período antes de generar divisiones.', 'error'); return; }
    if(!window.BDLRepoDivisiones){ H.notify('Repositorio de divisiones no disponible.', 'error'); return; }

    var manual = parseManual(H.val('#bdlDivManual'));
    var tamano = Number(H.val('#bdlDivTamano') || 30);
    var prefijo = H.val('#bdlDivPrefijo') || 'DIV';
    var porCarrera = !!(H.one('#bdlDivPorCarrera') && H.one('#bdlDivPorCarrera').checked);

    H.notify('Generando divisiones...');
    var action = manual.length ?
      window.BDLRepoDivisiones.aplicarAsignaciones(periodoId, manual) :
      window.BDLRepoDivisiones.generarAutomaticas(periodoId, { tamano:tamano, prefijo:prefijo, porCarrera:porCarrera });

    return action.then(function(result){
      close();
      return reload().then(function(){
        H.notify('Divisiones generadas: ' + (result.updated || result.generated || 0));
        return result;
      });
    }).catch(function(error){
      H.notify(error && error.message ? error.message : String(error), 'error');
    });
  }

  window.BDLUIDivisiones = { open:open, close:close, generate:generate, parseManual:parseManual };
})(window);
