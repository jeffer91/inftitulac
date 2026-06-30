(function(window){
  "use strict";

  var B = window.BDLRepoBase;
  var R = window.BDLNormRequisito;
  if(!B || !R){ throw new Error("BDLRepoRequisitos requiere BDLRepoBase y BDLNormRequisito."); }

  function guardarCatalogo(){
    return B.putAll(B.stores.requisitosCatalogo, R.catalogo());
  }

  function listarCatalogo(){
    return B.list(B.stores.requisitosCatalogo, { limit: 0 }).then(function(rows){
      return rows.sort(function(a, b){ return Number(a.orden || 0) - Number(b.orden || 0); });
    });
  }

  function guardarMuchos(rows){
    return B.putAll(B.stores.estudianteRequisitos, rows);
  }

  function porEstudiante(idEstudiantePeriodo){
    return B.byIndex(B.stores.estudianteRequisitos, "by_idEstudiantePeriodo", idEstudiantePeriodo, { limit: 0 });
  }

  function porPeriodoRequisitoEstado(periodoId, requisitoId, estado){
    return B.byIndex(B.stores.estudianteRequisitos, "by_periodo_requisito_estado", [periodoId, requisitoId, estado], { limit: 0 });
  }

  window.BDLRepoRequisitos = {
    guardarCatalogo: guardarCatalogo,
    listarCatalogo: listarCatalogo,
    guardarMuchos: guardarMuchos,
    porEstudiante: porEstudiante,
    porPeriodoRequisitoEstado: porPeriodoRequisitoEstado
  };
})(window);
