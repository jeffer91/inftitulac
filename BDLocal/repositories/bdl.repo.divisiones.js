(function(window){
  "use strict";

  var B = window.BDLRepoBase;
  var T = window.BDLNormText;
  if(!B || !T){ throw new Error("BDLRepoDivisiones requiere BDLRepoBase y BDLNormText."); }

  function cfgKey(periodoId){ return "divisiones_periodo__" + String(periodoId || ""); }
  function text(value){ return T.cleanSpaces(value || ""); }
  function carreraKey(row){ return T.key(row && (row.nombreCarrera || row.NombreCarrera || row.carrera || row.Carrera || "SIN_CARRERA")); }
  function carreraLabel(row){ return T.cleanSpaces(row && (row.nombreCarrera || row.NombreCarrera || row.carrera || row.Carrera || "Sin carrera")); }
  function divisionName(value){ return text(value); }
  function divisionKey(value){ return T.key(value); }

  function recordDivision(action, periodoId, nombre, payload){
    if(window.BDLManualEvents && typeof window.BDLManualEvents.recordDivision === "function"){
      window.BDLManualEvents.recordDivision(action, periodoId, nombre, payload || {});
    }
  }

  function guardarMuchos(rows){ return B.putAll(B.stores.estudianteDivisiones, rows); }
  function porEstudiante(idEstudiantePeriodo){ return B.byIndex(B.stores.estudianteDivisiones, "by_idEstudiantePeriodo", idEstudiantePeriodo, { limit: 0 }); }
  function porPeriodo(periodoId){ return B.byIndex(B.stores.estudianteDivisiones, "by_periodoId", periodoId, { limit: 0 }); }
  function porPeriodoDivision(periodoId, divKey){ return B.byIndex(B.stores.estudianteDivisiones, "by_periodo_division", [periodoId, divKey], { limit: 0 }); }

  function saveConfig(periodoId, config){
    config = config || { periodoId: periodoId, divisiones: [] };
    config.periodoId = periodoId;
    config.divisiones = normalizeDivisiones(config.divisiones || []);
    config.updatedAt = B.now();
    return B.put(B.stores.appConfig, { clave: cfgKey(periodoId), valor: config, updatedAt: B.now() }).then(function(){ return config; });
  }

  function normalizeDivisiones(divisiones){
    var map = {};
    (Array.isArray(divisiones) ? divisiones : []).forEach(function(div){
      var name = divisionName(div && div.nombre);
      if(!name){ return; }
      if(!map[name]){ map[name] = { nombre:name, carreras:[] }; }
      (Array.isArray(div.carreras) ? div.carreras : []).forEach(function(key){
        key = T.key(key);
        if(key && map[name].carreras.indexOf(key) < 0){ map[name].carreras.push(key); }
      });
    });
    return Object.keys(map).map(function(k){ return map[k]; }).sort(function(a,b){ return a.nombre.localeCompare(b.nombre, "es"); });
  }

  function carrerasPorPeriodo(periodoId){
    return B.byIndex(B.stores.estudiantesResumen, "by_periodoId", periodoId, { limit: 0 }).then(function(rows){
      var map = {};
      rows.forEach(function(row){
        var key = carreraKey(row);
        if(key && !map[key]){
          map[key] = {
            key: key,
            nombre: carreraLabel(row),
            codigo: row.codigoCarrera || row.CodigoCarrera || ""
          };
        }
      });
      return Object.keys(map).map(function(k){ return map[k]; }).sort(function(a,b){ return a.nombre.localeCompare(b.nombre, "es"); });
    });
  }

  function buildStudentMap(students){
    var byId = {};
    var byNumero = {};
    (Array.isArray(students) ? students : []).forEach(function(student){
      if(student && student.idEstudiantePeriodo){ byId[student.idEstudiantePeriodo] = student; }
      if(student && student.numeroIdentificacion){ byNumero[String(student.numeroIdentificacion)] = student; }
    });
    return { byId:byId, byNumero:byNumero };
  }

  function addCarreraToDivision(map, division, student){
    division = divisionName(division);
    if(!division || !student){ return; }
    var key = carreraKey(student);
    if(!key || key === "sin_carrera"){ return; }
    if(!map[division]){ map[division] = { nombre:division, carreras:[] }; }
    if(map[division].carreras.indexOf(key) < 0){ map[division].carreras.push(key); }
  }

  function reconstruirConfigDesdeEstudiantes(periodoId){
    return Promise.all([
      B.byIndex(B.stores.estudiantesResumen, "by_periodoId", periodoId, { limit: 0 }),
      porPeriodo(periodoId)
    ]).then(function(parts){
      var students = parts[0] || [];
      var divRows = parts[1] || [];
      var studentMap = buildStudentMap(students);
      var divMap = {};

      divRows.forEach(function(row){
        var student = studentMap.byId[row.idEstudiantePeriodo] || studentMap.byNumero[String(row.numeroIdentificacion || "")] || null;
        addCarreraToDivision(divMap, row.division, student);
      });

      students.forEach(function(student){
        addCarreraToDivision(divMap, student.divisionPrincipal || student.division || student.Division, student);
      });

      var config = {
        periodoId: periodoId,
        divisiones: normalizeDivisiones(Object.keys(divMap).map(function(key){ return divMap[key]; })),
        reconstruidoDesde: "estudiante_divisiones",
        updatedAt: B.now()
      };

      if(!config.divisiones.length){ return config; }

      return saveConfig(periodoId, config).then(function(saved){
        return Object.assign({}, saved, { reconstruido:true });
      });
    });
  }

  function getConfig(periodoId){
    return B.get(B.stores.appConfig, cfgKey(periodoId)).then(function(row){
      var config = row && row.valor ? row.valor : null;
      if(config && Array.isArray(config.divisiones) && config.divisiones.length){
        config.periodoId = periodoId;
        config.divisiones = normalizeDivisiones(config.divisiones);
        return config;
      }
      return reconstruirConfigDesdeEstudiantes(periodoId).then(function(rebuilt){
        return rebuilt && rebuilt.divisiones && rebuilt.divisiones.length ? rebuilt : { periodoId: periodoId, divisiones: [] };
      });
    });
  }

  function rowDivision(student, division){
    var id = student.idEstudiantePeriodo;
    var key = divisionKey(division);
    return {
      id: id + "__" + key,
      idEstudiantePeriodo: id,
      periodoId: student.periodoId,
      numeroIdentificacion: student.numeroIdentificacion || "",
      division: division,
      divisionKey: key,
      esPrincipal: true,
      actualizadaEn: B.now()
    };
  }

  function limpiarDivisionesEstudiante(idEstudiantePeriodo){
    return porEstudiante(idEstudiantePeriodo).then(function(rows){
      var chain = Promise.resolve();
      (rows || []).forEach(function(row){
        if(row && row.id){
          chain = chain.then(function(){ return B.remove(B.stores.estudianteDivisiones, row.id).catch(function(){ return null; }); });
        }
      });
      return chain;
    });
  }

  function updateStudent(student, division){
    var resumen = Object.assign({}, student || {});
    var id = resumen.idEstudiantePeriodo;
    resumen.divisionPrincipal = division || "";
    resumen.division = division || "";
    resumen.Division = division || "";
    resumen.divisiones = division ? [division] : [];
    resumen.actualizadoEn = B.now();

    return B.put(B.stores.estudiantesResumen, resumen).then(function(){
      return B.get(B.stores.estudiantesDetalle, id).then(function(detalle){
        if(!detalle){ return null; }
        detalle = Object.assign({}, detalle, {
          divisionPrincipal: resumen.divisionPrincipal,
          division: resumen.division,
          Division: resumen.Division,
          divisiones: resumen.divisiones,
          actualizadoEn: B.now()
        });
        return B.put(B.stores.estudiantesDetalle, detalle);
      });
    }).then(function(){
      return limpiarDivisionesEstudiante(id).then(function(){
        if(division){ return B.put(B.stores.estudianteDivisiones, rowDivision(resumen, division)); }
        return null;
      });
    });
  }

  function aplicarConfiguracionReal(periodoId, config){
    var carreraToDivision = {};
    (config.divisiones || []).forEach(function(div){
      (div.carreras || []).forEach(function(key){ carreraToDivision[T.key(key)] = div.nombre; });
    });

    return B.byIndex(B.stores.estudiantesResumen, "by_periodoId", periodoId, { limit: 0 }).then(function(students){
      var updated = 0;
      var chain = Promise.resolve();
      students.forEach(function(student){
        var div = carreraToDivision[carreraKey(student)] || "";
        chain = chain.then(function(){ return updateStudent(student, div).then(function(){ updated += 1; }); });
      });
      return chain.then(function(){
        B.cacheClear();
        if(window.BDLRepoEstudiantes && window.BDLRepoEstudiantes.mirrorSnapshot){ window.BDLRepoEstudiantes.mirrorSnapshot(); }
        return { ok:true, updated:updated };
      });
    });
  }

  function aplicarConfiguracion(periodoId, config, options){
    options = options || {};
    config = config || { periodoId:periodoId, divisiones:[] };
    config.divisiones = normalizeDivisiones(config.divisiones || []);

    if(!config.divisiones.length && !options.forceEmpty){
      return porPeriodo(periodoId).then(function(existing){
        if(existing && existing.length){
          return reconstruirConfigDesdeEstudiantes(periodoId).then(function(rebuilt){
            if(rebuilt && rebuilt.divisiones && rebuilt.divisiones.length){
              return aplicarConfiguracionReal(periodoId, rebuilt);
            }
            return {
              ok:false,
              updated:0,
              blocked:true,
              message:"No se aplicó una configuración vacía porque ya existen divisiones guardadas para este período."
            };
          });
        }
        return aplicarConfiguracionReal(periodoId, config);
      });
    }

    return aplicarConfiguracionReal(periodoId, config);
  }

  function guardarDivision(periodoId, nombre, oldNombre, carreras){
    nombre = text(nombre);
    oldNombre = text(oldNombre || nombre);
    carreras = Array.isArray(carreras) ? carreras.map(T.key).filter(Boolean) : [];
    if(!nombre){ return Promise.reject(new Error("Ingrese el nombre de la división.")); }
    return getConfig(periodoId).then(function(config){
      var before = JSON.parse(JSON.stringify(config || {}));
      var divisiones = config.divisiones || [];
      divisiones.forEach(function(div){ div.carreras = (div.carreras || []).filter(function(key){ return carreras.indexOf(T.key(key)) < 0; }); });
      var current = divisiones.filter(function(div){ return div.nombre === oldNombre; })[0];
      if(!current){ current = { nombre:nombre, carreras:[] }; divisiones.push(current); }
      current.nombre = nombre;
      current.carreras = carreras;
      config.divisiones = divisiones.filter(function(div){ return div.nombre && ((div.carreras || []).length || div.nombre === nombre); });
      return saveConfig(periodoId, config).then(function(saved){
        return aplicarConfiguracion(periodoId, saved).then(function(){
          recordDivision("guardar_division", periodoId, nombre, { oldNombre:oldNombre, carreras:carreras, before:before, after:saved });
          return saved;
        });
      });
    });
  }

  function borrarDivision(periodoId, nombre){
    nombre = text(nombre || "");
    return getConfig(periodoId).then(function(config){
      var before = JSON.parse(JSON.stringify(config || {}));
      config.divisiones = (config.divisiones || []).filter(function(div){ return div.nombre !== nombre; });
      return saveConfig(periodoId, config).then(function(saved){
        return aplicarConfiguracion(periodoId, saved).then(function(){
          recordDivision("borrar_division", periodoId, nombre, { oldNombre:nombre, before:before, after:saved });
          return saved;
        });
      });
    });
  }

  window.BDLRepoDivisiones = {
    guardarMuchos:guardarMuchos,
    porEstudiante:porEstudiante,
    porPeriodo:porPeriodo,
    porPeriodoDivision:porPeriodoDivision,
    getConfig:getConfig,
    saveConfig:saveConfig,
    carrerasPorPeriodo:carrerasPorPeriodo,
    reconstruirConfigDesdeEstudiantes:reconstruirConfigDesdeEstudiantes,
    guardarDivision:guardarDivision,
    borrarDivision:borrarDivision,
    aplicarConfiguracion:aplicarConfiguracion
  };
})(window);
