(function(window){
  "use strict";

  function detect(rows){
    var T = window.BDLNormText;
    var counts = {};
    (Array.isArray(rows) ? rows : []).forEach(function(row){
      var name = T ? T.upper(T.first(row, ["nombreCarrera", "NombreCarrera", "carrera", "Carrera", "programa", "Programa"])) : "";
      if(name){ counts[name] = (counts[name] || 0) + 1; }
    });
    return counts;
  }

  window.CargaDetectCarrera = { detect: detect };
})(window);
