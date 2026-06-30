(function(window, document){
  "use strict";

  var H = window.BDLUIH;
  if(!H){ throw new Error("BDLUIH debe cargarse antes de BDLUIApp."); }

  function bind(){
    H.on('#bdlPeriodoSelect', 'change', function(){
      var periodoId = H.val('#bdlPeriodoSelect');
      if(window.BDLRepoConfig){ window.BDLRepoConfig.guardarPeriodoActivo(periodoId); }
      if(window.BDLUIDashboard){ window.BDLUIDashboard.loadDashboard(periodoId); }
      if(window.BDLUIEstudiantes){ window.BDLUIEstudiantes.load({ periodoId:periodoId, page:1 }); }
    });
    H.on('#bdlBtnRefresh', 'click', function(){ if(window.BDLUIEstudiantes){ window.BDLUIEstudiantes.refresh(); } });
    H.on('#bdlBtnPrev', 'click', function(){ if(window.BDLUIEstudiantes){ window.BDLUIEstudiantes.prev(); } });
    H.on('#bdlBtnNext', 'click', function(){ if(window.BDLUIEstudiantes){ window.BDLUIEstudiantes.next(); } });
    H.on('#bdlSearch', 'input', function(){ if(window.BDLUIEstudiantes){ window.BDLUIEstudiantes.search(); } });
    H.on('#bdlClosePanel', 'click', function(){ if(window.BDLUIDetalle){ window.BDLUIDetalle.close(); } });
    H.on('#bdlBtnSync', 'click', function(){ if(window.BDLUIFirebase){ window.BDLUIFirebase.run(); } });
    H.on('#bdlBtnCargaFile', 'click', function(){ if(window.BDLUICarga){ window.BDLUICarga.loadFile(); } });
    H.on('#bdlBtnCargaTexto', 'click', function(){ if(window.BDLUICarga){ window.BDLUICarga.loadText(); } });
    H.on('#bdlBtnGuardarCarga', 'click', function(){ if(window.BDLUICarga){ window.BDLUICarga.save(); } });
  }

  function boot(){
    H.notify('Iniciando BDLocal...');
    var start = window.BDLocal && window.BDLocal.boot ? window.BDLocal.boot() : Promise.resolve();
    start.then(function(){
      bind();
      return window.BDLUIDashboard ? window.BDLUIDashboard.loadPeriodos() : [];
    }).then(function(){
      H.notify('BDLocal lista.');
    }).catch(function(error){ H.notify(error && error.message ? error.message : String(error), 'error'); });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }

  window.BDLUIApp = { boot:boot };
})(window, document);
