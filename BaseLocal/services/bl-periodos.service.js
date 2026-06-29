/* =========================================================
Nombre completo: bl-periodos.service.js
Ruta o ubicación: /Requisitos/BaseLocal/services/bl-periodos.service.js
Función o funciones:
- Leer la colección periodos desde Firestore con caché breve.
- Evitar consultas repetidas de períodos durante renders y sincronizaciones.
- Normalizar períodos sin inventar períodos desde cédulas.
- Unir duplicados por nombre, ID técnico o rango de meses.
- Mantener campos originales como id, label y creadoEn.
Con qué se conecta:
- bl-normalizador.js
- bl-periodos-canon.service.js
- baselocal.firebase.js
========================================================= */
(function(window){
  "use strict";

  var COLLECTION = "periodos";
  var CACHE_MS = 30000;
  var cache = {key:"", rows:null, at:0};

  function normalizador(){if(!window.BLNormalizador){throw new Error("BLNormalizador no disponible.");}return window.BLNormalizador;}
  function text(value){return window.BLCampos ? window.BLCampos.text(value) : String(value == null ? "" : value).trim();}
  function clone(value){try{return JSON.parse(JSON.stringify(value == null ? null : value));}catch(error){return value;}}
  function now(){return new Date().toISOString();}

  function safeDate(value){
    try{
      if(value && typeof value.toDate === "function"){return value.toDate().toISOString();}
      if(value instanceof Date){return value.toISOString();}
    }catch(error){return text(value);}
    return value;
  }

  function cleanValue(value){
    var dated = safeDate(value);
    if(dated !== value){return dated;}
    if(Array.isArray(value)){return value.map(cleanValue);}
    if(value && typeof value === "object"){
      var out = {};
      Object.keys(value).forEach(function(key){out[key] = cleanValue(value[key]);});
      return out;
    }
    return value;
  }

  function normalizePeriod(period){
    if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.normalizePeriod === "function"){
      return window.BLPeriodosCanon.normalizePeriod(period);
    }
    return normalizador().normalizePeriod(period);
  }

  function docToPeriod(doc){
    var data = cleanValue(typeof doc.data === "function" ? doc.data() : {});
    var raw = Object.assign({}, data || {}, {_firebaseId:text(doc.id || data.id), _firebaseCollection:COLLECTION});
    if(!raw.id){raw.id = text(doc.id || raw.periodoId || raw.value || raw.label);}
    if(!raw.label){raw.label = text(raw.periodoLabel || raw.id);}
    return normalizePeriod(raw);
  }

  function rowsFromSnapshot(snap){
    var rows = [];
    if(snap && typeof snap.forEach === "function"){
      snap.forEach(function(doc){rows.push(docToPeriod(doc));});
    }else if(snap && Array.isArray(snap.docs)){
      rows = snap.docs.map(docToPeriod);
    }
    return rows;
  }

  function cacheKey(options){
    options = options || {};
    return JSON.stringify({limit:Number(options.limit || 0) || 0, activeOnly:options.activeOnly === true});
  }

  function fromCache(key){if(cache.rows && cache.key === key && Date.now() - cache.at < CACHE_MS){return clone(cache.rows);}return null;}
  function saveCache(key, rows){cache = {key:key, rows:clone(rows || []), at:Date.now()};return rows;}
  function clearCache(){cache = {key:"", rows:null, at:0};}

  async function read(db, options){
    options = options || {};
    if(!db || typeof db.collection !== "function"){throw new Error("Firestore no disponible para leer periodos.");}
    var key = cacheKey(options);
    if(options.cache !== false){
      var cached = fromCache(key);
      if(cached){return cached;}
    }

    var query = db.collection(COLLECTION);
    var limit = Math.max(0, Number(options.limit || 0) || 0);
    if(limit && typeof query.limit === "function"){query = query.limit(limit);}

    var rows = rowsFromSnapshot(await query.get());
    rows = dedupe(rows).map(function(period){return Object.assign({updatedAt:now()}, period || {});});
    return saveCache(key, rows);
  }

  function dedupe(periods){
    if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.dedupe === "function"){
      return window.BLPeriodosCanon.dedupe(periods || []);
    }
    var map = {};
    var result = [];
    (periods || []).forEach(function(period){
      var normalized = normalizePeriod(period);
      var id = text(normalized.id || normalized.periodoId || normalized.label || normalized.periodoLabel);
      if(!id || map[id]){return;}
      map[id] = true;
      result.push(normalized);
    });
    return result;
  }

  function canonicalizeSnapshot(snapshot){
    if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.canonicalizeSnapshot === "function"){
      return window.BLPeriodosCanon.canonicalizeSnapshot(snapshot);
    }
    var snap = snapshot || {};
    snap.periods = dedupe(snap.periods || []);
    return snap;
  }

  window.BLPeriodosService = {
    collection:COLLECTION,
    read:read,
    dedupe:dedupe,
    normalizePeriod:normalizePeriod,
    canonicalizeSnapshot:canonicalizeSnapshot,
    clearCache:clearCache,
    status:function(){return {ok:true, mode:"periodos_service_cached", cached:!!cache.rows, cachedAt:cache.at, updatedAt:now()};}
  };
})(window);
