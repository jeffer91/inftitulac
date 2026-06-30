(function(window){
  "use strict";

  var B = window.BDLRepoBase;
  if(!B){ throw new Error("BDLRepoNotas requiere BDLRepoBase."); }

  function guardarMuchos(rows){
    return B.putAll(B.stores.estudianteNotas, rows);
  }

  function porEstudiante(idEstudiantePeriodo){
    return B.byIndex(B.stores.estudianteNotas, "by_idEstudiantePeriodo", idEstudiantePeriodo, { limit: 0 });
  }

  function porPeriodo(periodoId){
    return B.byIndex(B.stores.estudianteNotas, "by_periodoId", periodoId, { limit: 0 });
  }

  window.BDLRepoNotas = {
    guardarMuchos: guardarMuchos,
    porEstudiante: porEstudiante,
    porPeriodo: porPeriodo
  };
})(window);
