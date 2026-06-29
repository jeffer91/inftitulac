/* =========================================================
Nombre completo: bl2-estudiantes.repo.js
Ruta o ubicación: /Requisitos/BaseLocal2/repositories/bl2-estudiantes.repo.js
Función o funciones:
- Entregar estudiantes normalizados a Base Local y módulos de Requisitos.
- Priorizar IndexedDB/BL2Storage cuando se consulta de forma asíncrona.
- Evitar BL2DataEngine como camino principal de Base Local porque reconstruye índices completos.
- Hacer fallback paginado real: recorrer, contar y guardar solo la página solicitada.
- Corregir pantalla vacía por comparación estricta de período.
- Evitar cuelgues usando paginación y fallback liviano desde snapshot local.
Con qué se conecta:
- db/bl2-storage.js
- bl2-legacy-adapter.js
- services/bl2-search.service.js
- BaseLocal/baselocal.core.js
- BaseLocal/baselocal.app.js
========================================================= */
(function(window){
  "use strict";

  var VERSION = "2.0.2-period-flex-fallback";
  var DEFAULT_LIMIT = 100;
  var MAX_LIMIT = 500;
  var DIVISION_LIMIT = 5000;
  var SAFE_FULL_SCAN_LIMIT = 25000;
  var CACHE_MS = 1800;

  var cache = {
    key:"",
    result:null,
    at:0
  };

  function parentValue(name){
    try{
      return window.parent && window.parent !== window ? window.parent[name] : null;
    }catch(error){
      return null;
    }
  }

  function storage(){
    return window.BL2Storage || parentValue("BL2Storage") || null;
  }

  function legacy(){
    return window.BL2LegacyAdapter || parentValue("BL2LegacyAdapter") || null;
  }

  function searchService(){
    return window.BL2SearchService || parentValue("BL2SearchService") || null;
  }

  function schema(){
    return window.BL2Schema || parentValue("BL2Schema") || null;
  }

  function periodRepo(){
    return window.BL2PeriodosRepo || parentValue("BL2PeriodosRepo") || null;
  }

  function baseLocalAPI(){
    return window.BaseLocalAPI || parentValue("BaseLocalAPI") || null;
  }

  function excelStorage(){
    return window.ExcelLocalStorage || parentValue("ExcelLocalStorage") || null;
  }

  function excelBridge(){
    return window.ExcelLocalBridge || parentValue("ExcelLocalBridge") || null;
  }

  function text(value){
    if(schema() && schema().helpers && schema().helpers.text){
      return schema().helpers.text(value);
    }

    return String(value == null ? "" : value).trim();
  }

  function norm(value){
    if(searchService() && searchService().normalize){
      return searchService().normalize(value);
    }

    if(schema() && schema().helpers && schema().helpers.searchKey){
      return schema().helpers.searchKey(value);
    }

    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();
  }

  function waitFrame(){
    return new Promise(function(resolve){
      setTimeout(resolve, 0);
    });
  }

  function monthNumber(value){
    var k = norm(value).replace(/\./g, "");

    var map = {
      enero:"01",
      ene:"01",
      febrero:"02",
      feb:"02",
      marzo:"03",
      mar:"03",
      abril:"04",
      abr:"04",
      mayo:"05",
      may:"05",
      junio:"06",
      jun:"06",
      julio:"07",
      jul:"07",
      agosto:"08",
      ago:"08",
      septiembre:"09",
      setiembre:"09",
      sep:"09",
      sept:"09",
      octubre:"10",
      oct:"10",
      noviembre:"11",
      nov:"11",
      diciembre:"12",
      dic:"12"
    };

    return map[k] || "";
  }

  function periodComparable(value){
    var s = norm(value);

    s = s
      .replace(/\bperiodo\b/g, " ")
      .replace(/\bperíodo\b/g, " ")
      .replace(/\bcohorte\b/g, " ")
      .replace(/\bciclo\b/g, " ")
      .replace(/\bdesde\b/g, " ")
      .replace(/\bhasta\b/g, " ")
      .replace(/\bal\b/g, " ")
      .replace(/\ba\b/g, " ")
      .replace(/\bde\b/g, " ")
      .replace(/\bdel\b/g, " ");

    Object.keys({
      enero:1, ene:1,
      febrero:1, feb:1,
      marzo:1, mar:1,
      abril:1, abr:1,
      mayo:1, may:1,
      junio:1, jun:1,
      julio:1, jul:1,
      agosto:1, ago:1,
      septiembre:1, setiembre:1, sep:1, sept:1,
      octubre:1, oct:1,
      noviembre:1, nov:1,
      diciembre:1, dic:1
    }).forEach(function(name){
      var n = monthNumber(name);

      if(n){
        s = s.replace(new RegExp("\\b" + name + "\\b", "g"), " " + n + " ");
      }
    });

    return s
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compactPeriod(value){
    return periodComparable(value).replace(/\s+/g, "");
  }

  function periodTokens(value){
    var s = periodComparable(value);
    var raw = s.split(/\s+/).filter(Boolean);
    var tokens = {};
    var years = {};
    var months = {};

    raw.forEach(function(token){
      tokens[token] = true;

      if(/^20\d{2}$/.test(token)){
        years[token] = true;
      }

      if(/^(0?[1-9]|1[0-2])$/.test(token)){
        var m = token.length === 1 ? "0" + token : token;
        months[m] = true;
        tokens[m] = true;
      }
    });

    return {
      tokens:tokens,
      years:years,
      months:months,
      raw:raw
    };
  }

  function objectKeys(obj){
    return Object.keys(obj || {});
  }

  function allKeysExist(keys, map){
    for(var i = 0; i < keys.length; i += 1){
      if(!map[keys[i]]){
        return false;
      }
    }

    return true;
  }

  function anyKeyExists(keys, map){
    for(var i = 0; i < keys.length; i += 1){
      if(map[keys[i]]){
        return true;
      }
    }

    return false;
  }

  function loosePeriodSame(a, b){
    var aa = text(a);
    var bb = text(b);

    if(!bb){
      return true;
    }

    if(!aa){
      return false;
    }

    if(aa === bb || norm(aa) === norm(bb)){
      return true;
    }

    var ca = compactPeriod(aa);
    var cb = compactPeriod(bb);

    if(ca && cb && (ca === cb || ca.indexOf(cb) >= 0 || cb.indexOf(ca) >= 0)){
      return true;
    }

    var ta = periodTokens(aa);
    var tb = periodTokens(bb);

    var yearsA = objectKeys(ta.years);
    var yearsB = objectKeys(tb.years);
    var monthsA = objectKeys(ta.months);
    var monthsB = objectKeys(tb.months);

    if(yearsA.length && yearsB.length && monthsA.length && monthsB.length){
      var yearsMatch = allKeysExist(yearsA, tb.years) || allKeysExist(yearsB, ta.years);
      var monthsMatch = anyKeyExists(monthsA, tb.months);

      if(yearsMatch && monthsMatch){
        return true;
      }
    }

    if(yearsA.length && yearsB.length && allKeysExist(yearsB, ta.years)){
      return true;
    }

    return false;
  }

  function periodAliases(value){
    var aliases = {};
    var wanted = text(value);

    if(wanted){
      aliases[wanted] = true;
    }

    var periods = [];

    try{
      if(periodRepo() && typeof periodRepo().listar === "function"){
        periods = periodRepo().listar() || [];
      }
    }catch(error){}

    periods.forEach(function(period){
      var id = text(period.id || period.periodoId || period.value);
      var label = text(period.label || period.periodoLabel || period.nombre || period.name || period.periodo);

      if(!id && !label){
        return;
      }

      if(
        loosePeriodSame(wanted, id) ||
        loosePeriodSame(wanted, label) ||
        loosePeriodSame(id, wanted) ||
        loosePeriodSame(label, wanted)
      ){
        if(id){
          aliases[id] = true;
        }

        if(label){
          aliases[label] = true;
        }
      }
    });

    return objectKeys(aliases);
  }

  function samePeriod(a, b){
    if(!text(b)){
      return true;
    }

    try{
      if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.samePeriod === "function"){
        if(window.BLPeriodosCanon.samePeriod(a, b)){
          return true;
        }
      }
    }catch(error){}

    var left = periodAliases(a);
    var right = periodAliases(b);

    for(var i = 0; i < left.length; i += 1){
      for(var j = 0; j < right.length; j += 1){
        if(loosePeriodSame(left[i], right[j]) || loosePeriodSame(right[j], left[i])){
          return true;
        }
      }
    }

    return false;
  }

  function normalizeEstado(value){
    var k = norm(value);

    if(!k){
      return "ACTIVO";
    }

    if(
      k.indexOf("retir") >= 0 ||
      k.indexOf("inactivo") >= 0 ||
      k.indexOf("baja") >= 0 ||
      k.indexOf("aband") >= 0 ||
      k.indexOf("anulad") >= 0
    ){
      return "RETIRADO";
    }

    return "ACTIVO";
  }

  function enrichStudent(row){
    var copy = Object.assign({}, row || {});

    var cedula = text(
      copy._bl2Id ||
      copy.cedula ||
      copy.Cedula ||
      copy.CEDULA ||
      copy.numeroIdentificacion ||
      copy.NumeroIdentificacion ||
      copy.numeroidentificacion ||
      copy.identificacion ||
      copy.Identificacion ||
      copy._docId ||
      copy.docId ||
      copy.id
    );

    var nombres = text(
      copy._bl2Nombre ||
      copy.nombres ||
      copy.Nombres ||
      copy.nombre ||
      copy.Nombre ||
      copy.estudiante ||
      copy.Estudiante ||
      copy.alumno ||
      copy.Alumno
    );

    var carrera = text(
      copy._bl2Carrera ||
      copy.nombrecarrera ||
      copy.nombreCarrera ||
      copy.NombreCarrera ||
      copy.carrera ||
      copy.Carrera ||
      copy.programa ||
      copy.Programa ||
      "SIN CARRERA"
    );

    var periodoLabel = text(
      copy._bl2Periodo ||
      copy.periodoLabel ||
      copy.PeriodoLabel ||
      copy.periodo ||
      copy.Periodo ||
      copy.nombrePeriodo ||
      copy.NombrePeriodo ||
      copy.periodoId ||
      copy.ultimoPeriodoId ||
      copy._bl2PeriodoId ||
      "SIN PERÍODO"
    );

    var periodoId = text(
      copy._bl2PeriodoId ||
      copy.periodoId ||
      copy.PeriodoId ||
      copy.idPeriodo ||
      copy.IdPeriodo ||
      copy.ultimoPeriodoId ||
      copy.UltimoPeriodoId ||
      periodoLabel
    );

    var divs = Array.isArray(copy.divisiones) ? copy.divisiones : [];

    var division = text(
      copy._bl2Division ||
      divs[0] ||
      copy.division ||
      copy.Division ||
      copy.División ||
      copy.grupo ||
      copy.Grupo ||
      "Sin división"
    );

    var estado = normalizeEstado(
      copy._bl2EstadoMatricula ||
      copy.estadoMatricula ||
      copy.EstadoMatricula ||
      copy.estado ||
      copy.Estado ||
      "ACTIVO"
    );

    copy._bl2Id = cedula;
    copy.cedula = text(copy.cedula || cedula);
    copy.numeroIdentificacion = text(copy.numeroIdentificacion || copy.numeroidentificacion || cedula);

    copy._bl2Nombre = nombres;
    copy.nombres = text(copy.nombres || copy.Nombres || nombres);

    copy._bl2Carrera = carrera;
    copy.nombreCarrera = text(copy.nombreCarrera || copy.nombrecarrera || copy.NombreCarrera || carrera);

    copy._bl2Periodo = periodoLabel;
    copy._bl2PeriodoId = periodoId;
    copy.periodoId = text(copy.periodoId || periodoId);
    copy.periodoLabel = text(copy.periodoLabel || periodoLabel);

    copy._bl2Division = division;
    copy._bl2EstadoMatricula = estado;
    copy.estadoMatricula = estado;

    copy._bl2PeriodKey = compactPeriod([periodoId, periodoLabel].join(" "));
    copy._bl2Search = norm([
      cedula,
      nombres,
      carrera,
      periodoLabel,
      periodoId,
      division,
      estado,
      copy.sede || copy.Sede || "",
      copy.jornada || copy.Jornada || "",
      copy.correo || copy.Correo || "",
      copy.correoPersonal || copy.CorreoPersonal || "",
      copy.correoInstitucional || copy.CorreoInstitucional || ""
    ].join(" "));

    copy._bl2Normalized = true;

    return copy;
  }

  function normalizeRow(row){
    if(!row || typeof row !== "object"){
      row = {};
    }

    var base = row;

    if(schema() && schema().helpers && typeof schema().helpers.normalizeStudent === "function"){
      try{
        base = schema().helpers.normalizeStudent(row) || row;
      }catch(error){
        base = row;
      }
    }

    return enrichStudent(base);
  }

  function normalizeRows(rows){
    return (Array.isArray(rows) ? rows : []).map(normalizeRow);
  }

  function cedulaOf(row){
    row = normalizeRow(row);
    return text(row._bl2Id || row.cedula || row.numeroIdentificacion);
  }

  function nombreOf(row){
    return text(normalizeRow(row)._bl2Nombre);
  }

  function carreraOf(row){
    return text(normalizeRow(row)._bl2Carrera);
  }

  function periodoOf(row){
    return text(normalizeRow(row)._bl2Periodo);
  }

  function periodoIdOf(row){
    return text(normalizeRow(row)._bl2PeriodoId);
  }

  function divisionOf(row){
    return text(normalizeRow(row)._bl2Division || "Sin división");
  }

  function estadoOf(row){
    return text(normalizeRow(row)._bl2EstadoMatricula || "ACTIVO");
  }

  function sanitizeOptions(options){
    options = options || {};

    var limit = Math.max(0, Number(options.limit == null ? DEFAULT_LIMIT : options.limit) || 0);

    if(limit > MAX_LIMIT && options.allowLarge !== true){
      limit = MAX_LIMIT;
    }

    return {
      search:options.search || options.q || "",
      q:options.search || options.q || "",
      periodId:options.periodId || options.periodoId || "",
      periodoId:options.periodoId || options.periodId || "",
      division:options.division || "",
      career:options.career || options.carrera || "",
      carrera:options.carrera || options.career || "",
      sede:options.sede || "",
      jornada:options.jornada || "",
      matricula:options.all === true ? "" : (options.matricula == null ? "ACTIVO" : options.matricula),
      estadoMatricula:options.all === true ? "" : (
        options.estadoMatricula == null
          ? (options.matricula == null ? "ACTIVO" : options.matricula)
          : options.estadoMatricula
      ),
      offset:Math.max(0, Number(options.offset || 0) || 0),
      limit:limit,
      force:options.force === true,
      allowLarge:options.allowLarge === true,
      countTotal:options.countTotal !== false,
      all:options.all === true
    };
  }

  function listPeriods(){
    if(periodRepo() && typeof periodRepo().listar === "function"){
      try{
        return periodRepo().listar() || [];
      }catch(error){}
    }

    if(legacy() && typeof legacy().listPeriods === "function"){
      try{
        return legacy().listPeriods() || [];
      }catch(error2){}
    }

    if(baseLocalAPI() && typeof baseLocalAPI().getPeriods === "function"){
      try{
        return baseLocalAPI().getPeriods() || [];
      }catch(error3){}
    }

    return [];
  }

  function readSnapshot(){
    try{
      if(legacy() && typeof legacy().readSnapshot === "function"){
        var snapLegacy = legacy().readSnapshot({
          clone:false
        });

        if(snapLegacy && Array.isArray(snapLegacy.students)){
          return snapLegacy;
        }
      }
    }catch(error){}

    try{
      if(baseLocalAPI() && typeof baseLocalAPI().getSnapshot === "function"){
        var snapAPI = baseLocalAPI().getSnapshot({
          force:false
        });

        if(snapAPI && Array.isArray(snapAPI.students)){
          return snapAPI;
        }
      }
    }catch(error2){}

    try{
      if(excelStorage() && typeof excelStorage().readSnapshot === "function"){
        var snapStorage = excelStorage().readSnapshot({
          clone:false
        });

        if(snapStorage && Array.isArray(snapStorage.students)){
          return snapStorage;
        }
      }
    }catch(error3){}

    try{
      if(excelBridge() && typeof excelBridge().getSnapshot === "function"){
        var snapBridge = excelBridge().getSnapshot({
          clone:false
        });

        if(snapBridge && Array.isArray(snapBridge.students)){
          return snapBridge;
        }
      }
    }catch(error4){}

    return {
      students:[],
      periods:[],
      history:[],
      diagnostics:[]
    };
  }

  function snapshotRows(){
    var snap = readSnapshot();
    return Array.isArray(snap && snap.students) ? snap.students : [];
  }

  function rowMatchesPeriod(row, payload){
    var period = text(payload.periodoId || payload.periodId || "");

    if(!period){
      return true;
    }

    row = normalizeRow(row);

    return (
      samePeriod(periodoIdOf(row), period) ||
      samePeriod(periodoOf(row), period) ||
      samePeriod(row.periodoId, period) ||
      samePeriod(row.periodoLabel, period) ||
      samePeriod(row.ultimoPeriodoId, period)
    );
  }

  function rowMatchesEstado(row, payload){
    var estado = text(payload.estadoMatricula || payload.matricula || "").toUpperCase();

    if(!estado || estado === "TODOS" || estado === "ALL"){
      return true;
    }

    return estadoOf(row).toUpperCase() === estado;
  }

  function rowMatches(row, payload){
    row = normalizeRow(row);

    var search = norm(payload.search || payload.q || "");
    var career = norm(payload.carrera || payload.career || "");
    var division = norm(payload.division || "");
    var sede = norm(payload.sede || "");
    var jornada = norm(payload.jornada || "");

    if(!rowMatchesPeriod(row, payload)){
      return false;
    }

    if(career && norm(carreraOf(row)) !== career){
      return false;
    }

    if(division && norm(divisionOf(row)) !== division){
      return false;
    }

    if(sede && norm(row.sede || row.Sede || "") !== sede){
      return false;
    }

    if(jornada && norm(row.jornada || row.Jornada || "") !== jornada){
      return false;
    }

    if(!rowMatchesEstado(row, payload)){
      return false;
    }

    if(search && String(row._bl2Search || "").indexOf(search) < 0){
      return false;
    }

    return true;
  }

  function pageFromRows(rows, payload, source){
    rows = Array.isArray(rows) ? rows : [];

    var out = [];
    var total = 0;

    for(var i = 0; i < rows.length; i += 1){
      if(!rowMatches(rows[i], payload)){
        continue;
      }

      if(!payload.limit || (total >= payload.offset && out.length < payload.limit)){
        out.push(normalizeRow(rows[i]));
      }

      total += 1;

      if(payload.limit && out.length >= payload.limit && payload.countTotal === false){
        break;
      }
    }

    return {
      rows:out,
      estudiantes:out,
      total:total,
      offset:payload.offset,
      limit:payload.limit || total,
      page:payload.limit ? Math.floor(payload.offset / payload.limit) + 1 : 1,
      source:source || "BL2EstudiantesRepo.snapshotFallback",
      version:VERSION
    };
  }

  async function pageFromRowsAsync(rows, payload, source){
    rows = Array.isArray(rows) ? rows : [];

    var out = [];
    var total = 0;

    for(var i = 0; i < rows.length; i += 1){
      if(i > 0 && i % 350 === 0){
        await waitFrame();
      }

      if(!rowMatches(rows[i], payload)){
        continue;
      }

      if(!payload.limit || (total >= payload.offset && out.length < payload.limit)){
        out.push(normalizeRow(rows[i]));
      }

      total += 1;

      if(payload.limit && out.length >= payload.limit && payload.countTotal === false){
        break;
      }
    }

    return {
      rows:out,
      estudiantes:out,
      total:total,
      offset:payload.offset,
      limit:payload.limit || total,
      page:payload.limit ? Math.floor(payload.offset / payload.limit) + 1 : 1,
      source:source || "BL2EstudiantesRepo.snapshotFallbackAsync",
      version:VERSION
    };
  }

  function cacheKey(payload){
    return JSON.stringify(payload);
  }

  function fromCache(payload){
    var key = cacheKey(payload);

    if(payload.force !== true && cache.result && cache.key === key && Date.now() - cache.at < CACHE_MS){
      return cache.result;
    }

    return null;
  }

  function saveCache(payload, result){
    cache.key = cacheKey(payload);
    cache.result = result;
    cache.at = Date.now();
    return result;
  }

  function query(options){
    var payload = sanitizeOptions(options || {});
    var cached = fromCache(payload);

    if(cached){
      return cached;
    }

    return saveCache(payload, pageFromRows(snapshotRows(), payload, "BL2EstudiantesRepo.snapshotSync"));
  }

  function listarPagina(options){
    return query(options);
  }

  function buscar(options){
    return query(options);
  }

  function relaxedPayload(payload){
    return Object.assign({}, payload, {
      search:"",
      q:"",
      periodId:"",
      periodoId:"",
      division:"",
      career:"",
      carrera:"",
      sede:"",
      jornada:"",
      matricula:"",
      estadoMatricula:"",
      offset:0,
      limit:SAFE_FULL_SCAN_LIMIT,
      allowLarge:true,
      countTotal:false,
      all:true,
      force:true
    });
  }

  async function listAllFromStorage(payload){
    if(!storage() || typeof storage().listStudents !== "function"){
      return [];
    }

    try{
      var result = await storage().listStudents(relaxedPayload(payload));
      return normalizeRows((result && result.rows) || []);
    }catch(error){
      console.warn("[BL2EstudiantesRepo] No se pudo leer storage completo", error);
      return [];
    }
  }

  function normalizeStorageResult(result){
    result = result || {
      rows:[],
      total:0
    };

    var rows = normalizeRows(result.rows || []);

    return Object.assign({}, result, {
      rows:rows,
      estudiantes:rows,
      total:Number(result.total == null ? rows.length : result.total) || 0,
      source:result.source || "BL2Storage",
      version:VERSION
    });
  }

  async function listarPaginaAsync(options){
    var payload = sanitizeOptions(options || {});
    var cached = fromCache(payload);

    if(cached && payload.force !== true){
      return cached;
    }

    if(storage() && typeof storage().listStudents === "function"){
      try{
        var result = normalizeStorageResult(await storage().listStudents(payload));

        if((result.total || result.rows.length) > 0 || payload.force === true){
          return saveCache(payload, result);
        }

        var allStorageRows = await listAllFromStorage(payload);

        if(allStorageRows.length){
          var fallbackStorage = await pageFromRowsAsync(
            allStorageRows,
            payload,
            "BL2EstudiantesRepo.storageFullScanFallback"
          );

          if(fallbackStorage.total > 0){
            return saveCache(payload, fallbackStorage);
          }
        }
      }catch(error){
        console.warn("[BL2EstudiantesRepo] BL2Storage falló, usando snapshot local", error);
      }
    }

    var rows = snapshotRows();
    var fallback = await pageFromRowsAsync(rows, payload, "BL2EstudiantesRepo.snapshotAsyncFallback");

    return saveCache(payload, fallback);
  }

  function obtenerPorCedula(cedula, options){
    var wanted = text(cedula);

    if(!wanted){
      return null;
    }

    var rows = query(Object.assign({}, options || {}, {
      search:wanted,
      all:true,
      limit:25,
      force:true
    })).rows;

    return rows.filter(function(row){
      return cedulaOf(row) === wanted || text(row.numeroIdentificacion) === wanted;
    })[0] || null;
  }

  function obtenerPorCedulaAsync(cedula, options){
    if(storage() && typeof storage().getStudentById === "function"){
      return storage().getStudentById(cedula, options || {}).then(function(row){
        return row ? normalizeRow(row) : obtenerPorCedula(cedula, options);
      }).catch(function(){
        return obtenerPorCedula(cedula, options);
      });
    }

    return Promise.resolve(obtenerPorCedula(cedula, options));
  }

  function listForDivisions(options){
    return query(Object.assign({}, options || {}, {
      search:"",
      q:"",
      limit:DIVISION_LIMIT,
      allowLarge:true,
      estadoMatricula:"",
      matricula:"",
      all:true
    })).rows;
  }

  async function listForDivisionsAsync(options){
    return (await listarPaginaAsync(Object.assign({}, options || {}, {
      search:"",
      q:"",
      limit:DIVISION_LIMIT,
      allowLarge:true,
      estadoMatricula:"",
      matricula:"",
      all:true,
      countTotal:false
    }))).rows;
  }

  function listDivisions(options){
    var rows = listForDivisions(options || {});
    var map = Object.create(null);

    rows.forEach(function(row){
      map[divisionOf(row) || "Sin división"] = true;
    });

    return Object.keys(map).sort(function(a, b){
      return a.localeCompare(b, "es");
    });
  }

  function listDivisionsAsync(options){
    return listForDivisionsAsync(options || {}).then(function(rows){
      var map = Object.create(null);

      rows.forEach(function(row){
        map[divisionOf(row) || "Sin división"] = true;
      });

      return Object.keys(map).sort(function(a, b){
        return a.localeCompare(b, "es");
      });
    });
  }

  function diagnostico(options){
    var payload = sanitizeOptions(options || {});
    var rows = snapshotRows();
    var matchedPeriod = 0;
    var matchedEstado = 0;
    var matchedAll = 0;

    rows.forEach(function(row){
      row = normalizeRow(row);

      if(rowMatchesPeriod(row, payload)){
        matchedPeriod += 1;
      }

      if(rowMatchesEstado(row, payload)){
        matchedEstado += 1;
      }

      if(rowMatches(row, payload)){
        matchedAll += 1;
      }
    });

    return {
      ok:true,
      version:VERSION,
      totalSnapshot:rows.length,
      matchedPeriod:matchedPeriod,
      matchedEstado:matchedEstado,
      matchedAll:matchedAll,
      payload:payload,
      storageReady:!!storage(),
      legacyReady:!!legacy(),
      updatedAt:new Date().toISOString()
    };
  }

  function invalidate(){
    cache = {
      key:"",
      result:null,
      at:0
    };

    return true;
  }

  function status(){
    var snapRows = [];

    try{
      snapRows = snapshotRows();
    }catch(error){}

    return {
      ok:!!(storage() || legacy() || baseLocalAPI() || excelStorage() || excelBridge()),
      mode:"bl2_estudiantes_repo_period_flex_fallback",
      version:VERSION,
      storageReady:!!storage(),
      legacyReady:!!legacy(),
      baseLocalAPIReady:!!baseLocalAPI(),
      excelStorageReady:!!excelStorage(),
      excelBridgeReady:!!excelBridge(),
      snapshotStudents:snapRows.length,
      cacheAgeMs:cache.at ? Date.now() - cache.at : null,
      updatedAt:new Date().toISOString()
    };
  }

  window.BL2EstudiantesRepo = {
    version:VERSION,
    listPeriods:listPeriods,
    listarPeriodos:listPeriods,
    buscar:buscar,
    listarPagina:listarPagina,
    listarPaginaAsync:listarPaginaAsync,
    obtenerPorCedula:obtenerPorCedula,
    obtenerPorCedulaAsync:obtenerPorCedulaAsync,
    listDivisions:listDivisions,
    listDivisionsAsync:listDivisionsAsync,
    listForDivisions:listForDivisions,
    listForDivisionsAsync:listForDivisionsAsync,
    diagnostico:diagnostico,
    invalidate:invalidate,
    normalizeRow:normalizeRow,
    normalizeRows:normalizeRows,
    status:status,
    helpers:{
      cedulaOf:cedulaOf,
      nombreOf:nombreOf,
      carreraOf:carreraOf,
      periodoOf:periodoOf,
      periodoIdOf:periodoIdOf,
      divisionOf:divisionOf,
      estadoOf:estadoOf,
      samePeriod:samePeriod
    }
  };
})(window);