(function(window){
  "use strict";

  var B = window.BDLRepoBase;
  if(!B){ throw new Error("BDLRepoDivisiones requiere BDLRepoBase."); }

  function guardarMuchos(rows){
    return B.putAll(B.stores.estudianteDivisiones, rows);
  }

  function porEstudiante(idEstudiantePeriodo){
    return B.byIndex(B.stores.estudianteDivisiones, "by_idEstudiantePeriodo", idEstudiantePeriodo, { limit: 0 });
  }

  function porPeriodo(periodoId){
    return B.byIndex(B.stores.estudianteDivisiones, "by_periodoId", periodoId, { limit: 0 });
  }

  function porPeriodoDivision(periodoId, divisionKey){
    return B.byIndex(B.stores.estudianteDivisiones, "by_periodo_division", [periodoId, divisionKey], { limit: 0 });
  }

  window.BDLRepoDivisiones = {
    guardarMuchos: guardarMuchos,
    porEstudiante: porEstudiante,
    porPeriodo: porPeriodo,
    porPeriodoDivision: porPeriodoDivision
  };
})(window);
