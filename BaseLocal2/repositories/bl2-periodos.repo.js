/* =========================================================
Nombre completo: bl2-periodos.repo.js
Ruta o ubicación: /Requisitos/BaseLocal2/repositories/bl2-periodos.repo.js
Función o funciones:
- Entregar períodos visibles desde BL2.
- Cachear períodos.
- Reconstruir períodos desde estudiantes cuando no existen períodos guardados.
========================================================= */
(function(window){
  "use strict";

  var VERSION = "2.0.1-periodos-infer";
  var CACHE_MS = 5000;
  var cache = {rows:null, at:0, source:""};

  function parentValue(name){try{return window.parent && window.parent !== window ? window.parent[name] : null;}catch(error){return null;}}
  function api(){return window.BL2 || parentValue("BL2") || null;}
  function engine(){return window.BL2DataEngine || parentValue("BL2DataEngine") || null;}
  function storage(){return window.BL2Storage || parentValue("BL2Storage") || null;}
  function legacy(){return window.BL2LegacyAdapter || parentValue("BL2LegacyAdapter") || null;}
  function schema(){return window.BL2Schema || parentValue("BL2Schema") || null;}
  function periodosService(){return window.BLPeriodosService || parentValue("BLPeriodosService") || null;}
  function text(value){if(schema() && schema().helpers && schema().helpers.text){return schema().helpers.text(value);}return String(value == null ? "" : value).trim();}
  function clean(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();}
  function key(value){if(schema() && schema().helpers && schema().helpers.key){return schema().helpers.key(value);}return clean(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");}
  function isCedulaLike(value){return /^\d{7,13}$/.test(text(value));}

  function normalizePeriod(period){
    if(periodosService() && typeof periodosService().normalizePeriod === "function"){try{return periodosService().normalizePeriod(period);}catch(error){}}
    if(schema() && schema().helpers && schema().helpers.normalizePeriod){return schema().helpers.normalizePeriod(period);}
    var row = Object.assign({}, period || {});
    var label = text(row.label || row.periodoLabel || row.periodo || row.Periodo || row.nombrePeriodo || row.id || "SIN PERIODO");
    row.id = text(row.id || row.periodoId || key(label));
    row.periodoId = text(row.periodoId || row.id);
    row.label = label;
    row.periodoLabel = text(row.periodoLabel || label);
    row.labelKey = key(label);
    row.activo = row.activo === false ? false : true;
    row.updatedAt = text(row.updatedAt || row.actualizadoEn || row.creadoEn || "");
    return row;
  }

  function valid(period){var label = text(period && (period.label || period.periodoLabel || period.id));if(!label || isCedulaLike(label)){return false;}var c = clean(label);return c === "sin periodo" || c === "sin_periodo" || /20\d{2}/.test(c) || c.indexOf("periodo") >= 0 || c.indexOf("cohorte") >= 0 || c.indexOf("abril") >= 0 || c.indexOf("septiembre") >= 0;}
  function sortPeriods(a,b){var au = Date.parse(a.updatedAt || "") || 0;var bu = Date.parse(b.updatedAt || "") || 0;if(au !== bu){return bu - au;}return text(b.label || b.periodoLabel).localeCompare(text(a.label || a.periodoLabel), "es", {numeric:true});}
  function normalizeList(rows){var map = Object.create(null);return (Array.isArray(rows) ? rows : []).map(normalizePeriod).filter(function(period){var uniqueKey = key(period.id || period.periodoId || period.label);if(!valid(period) || !uniqueKey || map[uniqueKey]){return false;}map[uniqueKey] = true;return true;}).sort(sortPeriods);}

  function sourceSnapshot(){
    var bl2 = api();
    if(engine() && typeof engine().snapshot === "function"){try{return {snapshot:engine().snapshot({clone:false}), source:"BL2DataEngine.snapshot"};}catch(error){}}
    if(bl2 && bl2.compat && typeof bl2.compat.snapshot === "function"){try{return {snapshot:bl2.compat.snapshot({clone:false}), source:"BL2.compat.snapshot"};}catch(error){}}
    if(legacy() && typeof legacy().readSnapshot === "function"){try{return {snapshot:legacy().readSnapshot({clone:false}), source:"BL2LegacyAdapter.snapshot"};}catch(error){}}
    return {snapshot:{periods:[], students:[]}, source:"sin_fuente"};
  }

  function inferRows(students){if(periodosService() && typeof periodosService().inferFromStudents === "function"){try{return periodosService().inferFromStudents(students || []);}catch(error){}}return [];}

  function listar(options){
    options = options || {};
    if(options.force !== true && cache.rows && Date.now() - cache.at < CACHE_MS){return cache.rows.slice();}
    var src = sourceSnapshot();
    var snap = src.snapshot || {};
    var rows = normalizeList(snap.periods || []);
    if(!rows.length && Array.isArray(snap.students) && snap.students.length){rows = normalizeList(inferRows(snap.students));src.source = src.source + " inferidos";}
    cache.rows = rows;
    cache.at = Date.now();
    cache.source = src.source;
    return rows.slice();
  }

  function listarAsync(options){
    options = options || {};
    if(storage() && typeof storage().listPeriods === "function"){
      return storage().listPeriods(options).then(function(rows){rows = normalizeList(rows || []);if(rows.length){cache.rows = rows;cache.at = Date.now();cache.source = "BL2Storage";return rows.slice();}return listar(options);}).catch(function(){return listar(options);});
    }
    return Promise.resolve(listar(options));
  }

  function obtenerActual(options){var rows = listar(options || {});return rows[0] || null;}
  function obtenerPorId(id, options){var wanted = key(id);if(!wanted){return null;}return listar(options || {}).filter(function(period){return key(period.id) === wanted || key(period.periodoId) === wanted || key(period.label) === wanted;})[0] || null;}
  function invalidate(){cache = {rows:null, at:0, source:""};return true;}
  function status(){var rows = listar();return {ok:true, mode:"bl2_periodos_repo_infer", version:VERSION, total:rows.length, source:cache.source, cacheAgeMs:cache.at ? Date.now() - cache.at : null, updatedAt:new Date().toISOString()};}

  window.BL2PeriodosRepo = {version:VERSION, listar:listar, listarAsync:listarAsync, obtenerActual:obtenerActual, obtenerPorId:obtenerPorId, invalidate:invalidate, normalizePeriod:normalizePeriod, status:status};
})(window);
