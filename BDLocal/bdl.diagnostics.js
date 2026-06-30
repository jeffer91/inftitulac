(function(window){
  "use strict";

  var required = [
    "BDLConfig",
    "BDLSchema",
    "BDLKeys",
    "BDLDB",
    "BDLState",
    "BDLCache",
    "BDLNormText",
    "BDLNormPeriodo",
    "BDLNormRequisito",
    "BDLNormEstudiante",
    "BDLNormNota",
    "BDLNormDivision",
    "BDLNormError",
    "BDLRepoBase",
    "BDLRepoPeriodos",
    "BDLRepoEstudiantes",
    "BDLRepoDashboard",
    "BDLRepos",
    "BDLocal",
    "BDLSync",
    "CargaApp"
  ];

  function run(){
    var missing = required.filter(function(name){ return !window[name]; });
    var result = {
      ok: missing.length === 0,
      missing: missing,
      checked: required.length,
      at: new Date().toISOString()
    };
    try{
      window.dispatchEvent(new CustomEvent("bdlocal:diagnostics", { detail: result }));
    }catch(error){}
    return result;
  }

  window.BDLDiagnostics = { run: run, required: required };
})(window);
