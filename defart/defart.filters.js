/* =========================================================
Nombre completo: defart.filters.js
Ruta o ubicación: /Requisitos/defart/defart.filters.js
Función o funciones:
- Agregar filtros especiales a Defensas sin cambiar los estados finales.
- Filtrar estudiantes con requisitos completos pero sin N-ART.
- Filtrar estudiantes con requisitos completos, N-ART aprobada y sin N-DEF.
Con qué se conecta:
- defart.core.js
- defart.app.js
========================================================= */
(function(window){
  "use strict";

  var EXTRA_FILTERS = ["Sin nota Art", "Sin nota Def"];

  function isMissing(value){
    return value === null || value === undefined || String(value).trim() === "";
  }

  function numberValue(value){
    if(isMissing(value)){ return null; }
    var num = Number(String(value).replace(",", "."));
    return Number.isFinite(num) ? num : null;
  }

  function hasRequirements(row){
    return row && (row._requirementsOk === true || row._canArt === true);
  }

  function isSinNotaArt(row){
    return hasRequirements(row) && isMissing(row._nart);
  }

  function isSinNotaDef(row){
    var nart = numberValue(row && row._nart);
    return hasRequirements(row) && nart !== null && nart >= 7 && isMissing(row._ndef);
  }

  function isSpecialFilter(value){
    return EXTRA_FILTERS.indexOf(String(value || "")) >= 0;
  }

  function appendExtraFilters(states){
    var out = Array.isArray(states) ? states.slice() : [];
    EXTRA_FILTERS.forEach(function(item){
      if(out.indexOf(item) < 0){ out.push(item); }
    });
    return out;
  }

  function countRows(rows){
    var kpis = {
      total: rows.length,
      "Falta requisitos": 0,
      "Supletorio Art": 0,
      "Supletorio Def": 0,
      "Aprobado": 0,
      "Sin nota Art": 0,
      "Sin nota Def": 0
    };
    rows.forEach(function(row){
      if(Object.prototype.hasOwnProperty.call(kpis, row._estadoDefensa)){
        kpis[row._estadoDefensa] += 1;
      }
      if(isSinNotaArt(row)){ kpis["Sin nota Art"] += 1; }
      if(isSinNotaDef(row)){ kpis["Sin nota Def"] += 1; }
    });
    return kpis;
  }

  function applySpecialFilter(rows, status){
    if(status === "Sin nota Art"){
      return rows.filter(isSinNotaArt);
    }
    if(status === "Sin nota Def"){
      return rows.filter(isSinNotaDef);
    }
    return rows;
  }

  function patch(){
    if(!window.DefartCore || typeof window.DefartCore.summary !== "function"){
      return false;
    }
    if(window.DefartCore.__extraFiltersPatched){ return true; }

    var originalSummary = window.DefartCore.summary;
    window.DefartCore.summary = function(options){
      options = options || {};
      var requestedStatus = String(options.status || "");
      var baseOptions = Object.assign({}, options);

      if(isSpecialFilter(requestedStatus)){
        baseOptions.status = "";
      }

      var data = originalSummary.call(window.DefartCore, baseOptions) || {};
      data.rows = Array.isArray(data.rows) ? data.rows : [];
      data.states = appendExtraFilters(data.states);

      if(isSpecialFilter(requestedStatus)){
        data.rows = applySpecialFilter(data.rows, requestedStatus);
        data.kpis = countRows(data.rows);
        data.diagnostics = Object.assign({}, data.diagnostics || {}, {
          visible:data.rows.length,
          specialFilter:requestedStatus,
          filterRule: requestedStatus === "Sin nota Art"
            ? "Requisitos cumplidos y N-ART vacía."
            : "Requisitos cumplidos, N-ART aprobada y N-DEF vacía."
        });
      }else{
        data.kpis = Object.assign({}, data.kpis || {}, {
          "Sin nota Art": countRows(data.rows)["Sin nota Art"],
          "Sin nota Def": countRows(data.rows)["Sin nota Def"]
        });
      }

      return data;
    };

    window.DefartCore.__extraFiltersPatched = true;
    return true;
  }

  patch();
  window.DefartFilters = {
    patch:patch,
    isSinNotaArt:isSinNotaArt,
    isSinNotaDef:isSinNotaDef,
    filters:EXTRA_FILTERS.slice()
  };
})(window);
