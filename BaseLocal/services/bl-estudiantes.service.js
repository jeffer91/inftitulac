/* =========================================================
Nombre completo: bl-estudiantes.service.js
Ruta o ubicación: /Requisitos/BaseLocal/services/bl-estudiantes.service.js
Función o funciones:
- Leer Estudiantes desde Firestore con reglas seguras.
- Full read solo cuando se pide explícitamente con full:true.
- Sincronización normal usa since/updatedAt o lectura limitada.
- Normalizar y deduplicar sin perder campos originales.
========================================================= */
(function(window){
  "use strict";

  var COLLECTION = "Estudiantes";
  var DEFAULT_PAGE_LIMIT = 500;
  var MAX_SAFE_LIMIT = 1500;
  var cache = {key:"", rows:null, at:0};
  var CACHE_MS = 15000;

  function campos(){if(!window.BLCampos){throw new Error("BLCampos no disponible.");}return window.BLCampos;}
  function normalizador(){if(!window.BLNormalizador){throw new Error("BLNormalizador no disponible.");}return window.BLNormalizador;}
  function text(value){return campos().text(value);}
  function clone(value){try{return JSON.parse(JSON.stringify(value == null ? null : value));}catch(error){return value;}}
  function norm(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();}
  function now(){return new Date().toISOString();}

  function safeDate(value){try{if(value && typeof value.toDate === "function"){return value.toDate().toISOString();}if(value instanceof Date){return value.toISOString();}}catch(error){return text(value);}return value;}
  function cleanValue(value){var dated = safeDate(value);if(dated !== value){return dated;}if(Array.isArray(value)){return value.map(cleanValue);}if(value && typeof value === "object"){var out = {};Object.keys(value).forEach(function(key){out[key] = cleanValue(value[key]);});return out;}return value;}
  function cedulaFromDocId(value){var raw = text(value);var match = raw.match(/^(\d{7,13})(?:\D|$)/);return match ? match[1] : "";}
  function docToStudent(doc, index){var data = cleanValue(typeof doc.data === "function" ? doc.data() : {});var firebaseId = text(doc.id || data.id);var cedulaDoc = cedulaFromDocId(firebaseId);var raw = Object.assign({}, data || {}, {_firebaseId:firebaseId, _firebaseCollection:COLLECTION});if(!text(raw.cedula || raw.Cedula || raw.CEDULA || raw.numeroIdentificacion || raw.numeroidentificacion) && cedulaDoc){raw.cedula = cedulaDoc;raw.numeroIdentificacion = cedulaDoc;}return normalizador().normalizeStudent(raw, index || 0, {source:"firebase"});}
  function rowsFromSnapshot(snap){var rows = [];if(snap && typeof snap.forEach === "function"){var index = 0;snap.forEach(function(doc){rows.push(docToStudent(doc, index));index += 1;});}else if(snap && Array.isArray(snap.docs)){rows = snap.docs.map(function(doc, index){return docToStudent(doc, index);});}return rows;}

  function samePeriod(a,b){if(!text(b)){return true;}try{if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.samePeriod === "function"){return window.BLPeriodosCanon.samePeriod(a,b);}}catch(error){}return norm(a) === norm(b);}
  function rowPeriod(row){return text(row && (row.periodoId || row.ultimoPeriodoId || row.periodId || row.PeriodoId || row.periodo || row.Periodo || row.periodoLabel));}
  function rowStatus(row){return campos().normalizeEstado(campos().getValue(row || {}, "estadoMatricula", row && row.estadoMatricula || "ACTIVO"));}
  function rowSearch(row){row = row || {};var parts = [row.cedula,row.numeroIdentificacion,row.numeroidentificacion,row.Cedula,row.Nombres,row.nombres,row.nombre,row.nombrecarrera,row.nombreCarrera,row.NombreCarrera,row.carrera,row.Carrera,row.Sede,row.sede,row.CorreoPersonal,row.CorreoInstitucional,row.Celular,row.periodoId,row.periodoLabel,row.division];if(Array.isArray(row.divisiones)){parts.push(row.divisiones.join(" "));}return norm(parts.join(" "));}

  function localFilterPage(rows, options){
    options = options || {};
    var periodId = text(options.periodId || options.periodoId || "");
    var status = text(options.estadoMatricula == null ? options.status || "" : options.estadoMatricula);
    var search = norm(options.search || options.q || "");
    var offset = Math.max(0, Number(options.offset || 0) || 0);
    var limit = Math.max(0, Number(options.limit || 0) || 0);
    var out = [], total = 0;
    (rows || []).forEach(function(row){
      if(periodId && !samePeriod(rowPeriod(row), periodId)){return;}
      if(status && rowStatus(row) !== status){return;}
      if(search && rowSearch(row).indexOf(search) < 0){return;}
      if(!limit || (total >= offset && out.length < limit)){out.push(row);}
      total += 1;
    });
    out.total = total;
    return out;
  }

  function updatedTime(row){row = row || {};var raw = text(campos().getValue(row, "updatedAt", "") || row.ultimaSincronizacion || row.actualizadoEn || row.createdAt || row.creadoEn || "");var time = Date.parse(raw);return Number.isFinite(time) ? time : 0;}
  function normalizeDivisiones(value){return normalizador().normalizeDivisiones(value);}
  function valueHasData(value){if(value === undefined || value === null){return false;}if(Array.isArray(value)){return value.length > 0;}if(typeof value === "object"){return Object.keys(value).length > 0;}return text(value) !== "";}
  function mergeValue(current, incoming, incomingNewer){if(!valueHasData(incoming)){return current;}if(!valueHasData(current)){return incoming;}if(Array.isArray(current) || Array.isArray(incoming)){var seen = {}, merged = [];(Array.isArray(current) ? current : [current]).concat(Array.isArray(incoming) ? incoming : [incoming]).forEach(function(item){var key = text(typeof item === "object" && item ? JSON.stringify(item) : item);if(!key || seen[key]){return;}seen[key] = true;merged.push(item);});return merged;}return incomingNewer ? incoming : current;}
  function mergeStudents(current, incoming){var base = normalizador().normalizeStudent(current || {}, 0, {source:(current && current._source) || "firebase"});var next = normalizador().normalizeStudent(incoming || {}, 0, {source:(incoming && incoming._source) || "firebase"});var incomingNewer = updatedTime(next) >= updatedTime(base);var out = Object.assign({}, base);Object.keys(next).forEach(function(key){out[key] = mergeValue(out[key], next[key], incomingNewer);});var cedula = text(base.cedula || next.cedula || base.numeroIdentificacion || next.numeroIdentificacion);if(cedula){out.cedula = cedula;out.numeroIdentificacion = text(out.numeroIdentificacion || cedula);}out.divisiones = normalizeDivisiones([].concat(normalizeDivisiones(base.divisiones || base.division), normalizeDivisiones(next.divisiones || next.division)));if(out.divisiones.length){out.division = out.divisiones[0];}else{delete out.division;}out._firebaseDuplicates = [].concat(base._firebaseDuplicates || [], next._firebaseDuplicates || []);if(text(base._firebaseId) && out._firebaseDuplicates.indexOf(text(base._firebaseId)) < 0){out._firebaseDuplicates.push(text(base._firebaseId));}if(text(next._firebaseId) && out._firebaseDuplicates.indexOf(text(next._firebaseId)) < 0){out._firebaseDuplicates.push(text(next._firebaseId));}return normalizador().normalizeStudent(out, 0, {source:out._source || "firebase"});}
  function dedupeByCedula(students){var map = {};(students || []).forEach(function(student){var normalized = normalizador().normalizeStudent(student, 0, {source:student && student._source || "firebase"});var key = text(normalized.cedula || normalized.numeroIdentificacion || cedulaFromDocId(normalized._firebaseId || normalized.docId));if(!key){return;}map[key] = map[key] ? mergeStudents(map[key], normalized) : normalized;});return Object.keys(map).map(function(key){return map[key];});}
  function normalizeLocalList(students){return dedupeByCedula(students || []);}

  function cacheKey(options){options = options || {};return JSON.stringify({periodId:text(options.periodId||options.periodoId||""),status:text(options.estadoMatricula||options.status||""),search:norm(options.search||options.q||""),limit:Number(options.limit||0)||0,offset:Number(options.offset||0)||0,since:text(options.updatedSince||options.since||""),full:options.full===true});}
  function shouldUseCache(options){return !options || options.cache !== false;}
  function fromCache(key){if(cache.rows && cache.key === key && Date.now() - cache.at < CACHE_MS){return clone(cache.rows);}return null;}
  function saveCache(key, rows){cache = {key:key, rows:clone(rows || []), at:Date.now()};return rows;}
  function clearCache(){cache = {key:"", rows:null, at:0};}

  function applyQuery(ref, options){
    var query = ref, usedServer = false;
    var periodId = text(options.periodId || options.periodoId || "");
    var status = text(options.estadoMatricula == null ? options.status || "" : options.estadoMatricula);
    var since = text(options.updatedSince || options.since || "");
    if(periodId){query = query.where("periodoId", "==", periodId);usedServer = true;}
    if(status){query = query.where("estadoMatricula", "==", status);usedServer = true;}
    if(since){query = query.where("updatedAt", ">", since);usedServer = true;if(typeof query.orderBy === "function"){query = query.orderBy("updatedAt", "asc");}}
    var explicitFull = options.full === true;
    var limit = explicitFull ? 0 : Math.max(1, Math.min(MAX_SAFE_LIMIT, Number(options.remoteLimit || options.limit || DEFAULT_PAGE_LIMIT) || DEFAULT_PAGE_LIMIT));
    if(limit && typeof query.limit === "function"){query = query.limit(limit);usedServer = true;}
    return {query:query, usedServer:usedServer, full:explicitFull, limit:limit};
  }

  async function read(db, options){
    options = options || {};
    if(!db || typeof db.collection !== "function"){throw new Error("Firestore no disponible para leer Estudiantes.");}
    var key = cacheKey(options);
    if(shouldUseCache(options)){var cached = fromCache(key);if(cached){return cached;}}
    var ref = db.collection(COLLECTION);
    var prepared = applyQuery(ref, options);
    var rows = [];
    try{rows = rowsFromSnapshot(await prepared.query.get());}
    catch(error){if(options.noFallbackFull === true){throw error;}console.warn("[BLEstudiantesService] Consulta filtrada falló. Se usará lectura limitada de respaldo.", error);var safeLimit = Math.max(1, Math.min(MAX_SAFE_LIMIT, Number(options.fallbackLimit || options.limit || DEFAULT_PAGE_LIMIT) || DEFAULT_PAGE_LIMIT));var fallbackQuery = typeof ref.limit === "function" ? ref.limit(safeLimit) : ref;rows = rowsFromSnapshot(await fallbackQuery.get());rows = localFilterPage(rows, options);}
    rows = dedupeByCedula(rows);
    if(options.search || options.q || options.offset){rows = localFilterPage(rows, options);}
    return saveCache(key, rows);
  }

  async function readPage(db, options){options = Object.assign({}, options || {}, {limit:options && options.limit ? options.limit : 100});var rows = await read(db, options);return {rows:rows,total:rows.total || rows.length,limit:Number(options.limit || rows.length || 0),offset:Number(options.offset || 0),readAt:now()};}

  window.BLEstudiantesService = {collection:COLLECTION,read:read,readPage:readPage,dedupeByCedula:dedupeByCedula,normalizeLocalList:normalizeLocalList,mergeStudents:mergeStudents,cedulaFromDocId:cedulaFromDocId,clearCache:clearCache,normalizeStudent:function(row, index, options){return normalizador().normalizeStudent(row, index, options || {});},helpers:{localFilter:localFilterPage,rowPeriod:rowPeriod,rowStatus:rowStatus,rowSearch:rowSearch}};
})(window);
