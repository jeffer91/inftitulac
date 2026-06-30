(function(window){
  "use strict";

  function detect(rows, fallback){
    rows = Array.isArray(rows) ? rows : [];
    var counts = {};
    rows.forEach(function(row){
      var p = window.BDLNormPeriodo ? window.BDLNormPeriodo.normalize(row || {}, fallback).periodoId : "SIN_PERIODO";
      counts[p] = (counts[p] || 0) + 1;
    });
    var best = Object.keys(counts).sort(function(a, b){ return counts[b] - counts[a]; })[0] || "SIN_PERIODO";
    return { periodoId: best, counts: counts };
  }

  window.CargaDetectPeriodo = { detect: detect };
})(window);
