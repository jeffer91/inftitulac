/* =========================================================
Nombre completo: bdl.repo.divisiones.js
Ruta: /BDLocal/repositories/bdl.repo.divisiones.js
Función:
- Repositorio de divisiones por período.
- Guardar configuración división -> carreras.
- Reconstruir divisiones desde estudiantes.
- Aplicar divisiones a estudiantes del período.
- Normalizar carreras antes de comparar.
- Evitar duplicados por nombres dañados o mal decodificados.
========================================================= */
(function(window){
  "use strict";

  var B = window.BDLRepoBase;
  var T = window.BDLNormText;

  if(!B || !T){
    throw new Error("BDLRepoDivisiones requiere BDLRepoBase y BDLNormText.");
  }

  function cfgKey(periodoId){
    return "divisiones_periodo__" + String(periodoId || "");
  }

  function text(value){
    return T.cleanSpaces(value || "");
  }

  function divisionName(value){
    return text(value);
  }

  function divisionKey(value){
    return T.key(value);
  }

  function carreraRaw(row){
    row = row || {};

    return text(
      row.nombreCarrera ||
      row.NombreCarrera ||
      row.carrera ||
      row.Carrera ||
      row.programa ||
      row.Programa ||
      "SIN CARRERA"
    );
  }

  function carreraCode(row){
    row = row || {};

    return text(
      row.codigoCarrera ||
      row.CodigoCarrera ||
      row["CódigoCarrera"] ||
      row.codCarrera ||
      row.CodCarrera ||
      ""
    );
  }

  function carreraInfo(value, code){
    value = text(value);

    if(window.BDLNormCarrera && typeof window.BDLNormCarrera.normalize === "function"){
      return window.BDLNormCarrera.normalize(value, code || "");
    }

    return {
      original: value,
      nombre: value || "SIN CARRERA",
      codigo: code || "",
      key: T.key(value || "SIN CARRERA"),
      modalidad: value.indexOf("ONLINE") >= 0 ? "ONLINE" : "PRESENCIAL"
    };
  }

  function carreraInfoRow(row){
    return carreraInfo(carreraRaw(row), carreraCode(row));
  }

  function carreraKey(rowOrValue){
    if(typeof rowOrValue === "string"){
      return carreraInfo(rowOrValue, "").key;
    }

    return carreraInfoRow(rowOrValue || {}).key;
  }

  function carreraLabel(rowOrValue){
    if(typeof rowOrValue === "string"){
      return carreraInfo(rowOrValue, "").nombre;
    }

    return carreraInfoRow(rowOrValue || {}).nombre;
  }

  function normalizeStudentCareer(student){
    student = Object.assign({}, student || {});

    if(window.BDLNormCarrera && typeof window.BDLNormCarrera.normalizeRow === "function"){
      return window.BDLNormCarrera.normalizeRow(student);
    }

    return student;
  }

  function recordDivision(action, periodoId, nombre, payload){
    if(window.BDLManualEvents && typeof window.BDLManualEvents.recordDivision === "function"){
      window.BDLManualEvents.recordDivision(action, periodoId, nombre, payload || {});
    }
  }

  function guardarMuchos(rows){
    return B.putAll(B.stores.estudianteDivisiones, rows);
  }

  function porEstudiante(idEstudiantePeriodo){
    return B.byIndex(B.stores.estudianteDivisiones, "by_idEstudiantePeriodo", idEstudiantePeriodo, { limit: 0 });
  }

  function porPeriodo(periodoId){
    return B.byIndex(B.stores.estudianteDivisiones, "by_periodoId", periodoId, { limit: 0 });
  }

  function porPeriodoDivision(periodoId, divKey){
    return B.byIndex(B.stores.estudianteDivisiones, "by_periodo_division", [periodoId, divKey], { limit: 0 });
  }

  function normalizeDivisiones(divisiones){
    var map = {};
    var owner = {};

    (Array.isArray(divisiones) ? divisiones : []).forEach(function(div){
      var name = divisionName(div && div.nombre);

      if(!name){
        return;
      }

      if(!map[name]){
        map[name] = {
          nombre: name,
          carreras: []
        };
      }

      (Array.isArray(div.carreras) ? div.carreras : []).forEach(function(item){
        var key = carreraKey(item);

        if(!key){
          return;
        }

        if(owner[key] && owner[key] !== name){
          var previous = map[owner[key]];

          if(previous){
            previous.carreras = previous.carreras.filter(function(current){
              return carreraKey(current) !== key;
            });
          }
        }

        owner[key] = name;

        if(map[name].carreras.indexOf(key) < 0){
          map[name].carreras.push(key);
        }
      });
    });

    return Object.keys(map).map(function(k){
      return map[k];
    }).sort(function(a, b){
      return a.nombre.localeCompare(b.nombre, "es");
    });
  }

  function saveConfig(periodoId, config){
    config = config || {
      periodoId: periodoId,
      divisiones: []
    };

    config.periodoId = periodoId;
    config.divisiones = normalizeDivisiones(config.divisiones || []);
    config.updatedAt = B.now();

    return B.put(B.stores.appConfig, {
      clave: cfgKey(periodoId),
      valor: config,
      updatedAt: B.now()
    }).then(function(){
      return config;
    });
  }

  function carrerasPorPeriodo(periodoId){
    return B.byIndex(B.stores.estudiantesResumen, "by_periodoId", periodoId, { limit: 0 }).then(function(rows){
      var map = {};

      (rows || []).forEach(function(row){
        var normalized = normalizeStudentCareer(row || {});
        var info = carreraInfoRow(normalized);
        var key = info.key;

        if(!key || key === "sin_carrera"){
          return;
        }

        if(!map[key]){
          map[key] = {
            key: key,
            nombre: info.nombre,
            codigo: info.codigo || "",
            total: 0,
            originales: []
          };
        }

        map[key].total += 1;

        var original = carreraRaw(row);

        if(original && map[key].originales.indexOf(original) < 0){
          map[key].originales.push(original);
        }

        if(info.nombre && info.nombre.length > map[key].nombre.length){
          map[key].nombre = info.nombre;
        }

        if(!map[key].codigo && info.codigo){
          map[key].codigo = info.codigo;
        }
      });

      return Object.keys(map).map(function(k){
        return map[k];
      }).sort(function(a, b){
        return a.nombre.localeCompare(b.nombre, "es");
      });
    });
  }

  function buildStudentMap(students){
    var byId = {};
    var byNumero = {};

    (Array.isArray(students) ? students : []).forEach(function(student){
      if(student && student.idEstudiantePeriodo){
        byId[student.idEstudiantePeriodo] = student;
      }

      if(student && student.numeroIdentificacion){
        byNumero[String(student.numeroIdentificacion)] = student;
      }
    });

    return {
      byId: byId,
      byNumero: byNumero
    };
  }

  function addCarreraToDivision(map, division, student){
    division = divisionName(division);

    if(!division || !student){
      return;
    }

    var normalized = normalizeStudentCareer(student);
    var key = carreraKey(normalized);

    if(!key || key === "sin_carrera"){
      return;
    }

    if(!map[division]){
      map[division] = {
        nombre: division,
        carreras: []
      };
    }

    if(map[division].carreras.indexOf(key) < 0){
      map[division].carreras.push(key);
    }
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
        var student = studentMap.byId[row.idEstudiantePeriodo] ||
          studentMap.byNumero[String(row.numeroIdentificacion || "")] ||
          null;

        addCarreraToDivision(divMap, row.division, student);
      });

      students.forEach(function(student){
        addCarreraToDivision(
          divMap,
          student.divisionPrincipal || student.division || student.Division,
          student
        );
      });

      var config = {
        periodoId: periodoId,
        divisiones: normalizeDivisiones(Object.keys(divMap).map(function(key){
          return divMap[key];
        })),
        reconstruidoDesde: "estudiante_divisiones",
        updatedAt: B.now()
      };

      if(!config.divisiones.length){
        return config;
      }

      return saveConfig(periodoId, config).then(function(saved){
        return Object.assign({}, saved, {
          reconstruido: true
        });
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
        return rebuilt && rebuilt.divisiones && rebuilt.divisiones.length
          ? rebuilt
          : {
              periodoId: periodoId,
              divisiones: []
            };
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
          chain = chain.then(function(){
            return B.remove(B.stores.estudianteDivisiones, row.id).catch(function(){
              return null;
            });
          });
        }
      });

      return chain;
    });
  }

  function patchStudentDivision(student, division){
    var resumen = normalizeStudentCareer(student || {});

    resumen.divisionPrincipal = division || "";
    resumen.division = division || "";
    resumen.Division = division || "";
    resumen.divisiones = division ? [division] : [];
    resumen.actualizadoEn = B.now();

    return resumen;
  }

  function updateStudent(student, division){
    var resumen = patchStudentDivision(student, division);
    var id = resumen.idEstudiantePeriodo;

    return B.put(B.stores.estudiantesResumen, resumen).then(function(){
      return B.get(B.stores.estudiantesDetalle, id).then(function(detalle){
        if(!detalle){
          return null;
        }

        detalle = normalizeStudentCareer(Object.assign({}, detalle, {
          nombreCarrera: resumen.nombreCarrera,
          NombreCarrera: resumen.NombreCarrera,
          carrera: resumen.carrera,
          Carrera: resumen.Carrera,
          nombreCarreraKey: resumen.nombreCarreraKey,
          carreraKey: resumen.carreraKey,
          carreraNormalizada: resumen.carreraNormalizada,
          carreraNormalizadaTexto: resumen.carreraNormalizadaTexto,
          divisionPrincipal: resumen.divisionPrincipal,
          division: resumen.division,
          Division: resumen.Division,
          divisiones: resumen.divisiones,
          actualizadoEn: B.now()
        }));

        return B.put(B.stores.estudiantesDetalle, detalle);
      });
    }).then(function(){
      return limpiarDivisionesEstudiante(id).then(function(){
        if(division){
          return B.put(B.stores.estudianteDivisiones, rowDivision(resumen, division));
        }

        return null;
      });
    });
  }

  function buildCarreraToDivision(config){
    var carreraToDivision = {};

    (config.divisiones || []).forEach(function(div){
      (div.carreras || []).forEach(function(item){
        var key = carreraKey(item);

        if(key){
          carreraToDivision[key] = div.nombre;
        }
      });
    });

    return carreraToDivision;
  }

  function aplicarConfiguracionReal(periodoId, config){
    var carreraToDivision = buildCarreraToDivision(config);

    return B.byIndex(B.stores.estudiantesResumen, "by_periodoId", periodoId, { limit: 0 }).then(function(students){
      var updated = 0;
      var chain = Promise.resolve();

      (students || []).forEach(function(student){
        var normalized = normalizeStudentCareer(student || {});
        var div = carreraToDivision[carreraKey(normalized)] || "";

        chain = chain.then(function(){
          return updateStudent(normalized, div).then(function(){
            updated += 1;
          });
        });
      });

      return chain.then(function(){
        if(typeof B.cacheClear === "function"){
          B.cacheClear();
        }

        if(window.BDLRepoEstudiantes && typeof window.BDLRepoEstudiantes.mirrorSnapshot === "function"){
          try{
            window.BDLRepoEstudiantes.mirrorSnapshot();
          }catch(error){}
        }

        try{
          window.localStorage.setItem("REQ_BL_SIGNAL_V1", JSON.stringify({
            type: "divisiones-aplicadas",
            source: "bdl.repo.divisiones",
            periodoId: periodoId,
            updated: updated,
            updatedAt: B.now()
          }));
        }catch(error){}

        return {
          ok: true,
          updated: updated
        };
      });
    });
  }

  function aplicarConfiguracion(periodoId, config, options){
    options = options || {};

    config = config || {
      periodoId: periodoId,
      divisiones: []
    };

    config.divisiones = normalizeDivisiones(config.divisiones || []);

    if(!config.divisiones.length && !options.forceEmpty){
      return porPeriodo(periodoId).then(function(existing){
        if(existing && existing.length){
          return reconstruirConfigDesdeEstudiantes(periodoId).then(function(rebuilt){
            if(rebuilt && rebuilt.divisiones && rebuilt.divisiones.length){
              return aplicarConfiguracionReal(periodoId, rebuilt);
            }

            return {
              ok: false,
              updated: 0,
              blocked: true,
              message: "No se aplicó una configuración vacía porque ya existen divisiones guardadas para este período."
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

    carreras = Array.isArray(carreras)
      ? carreras.map(carreraKey).filter(Boolean)
      : [];

    if(!nombre){
      return Promise.reject(new Error("Ingrese el nombre de la división."));
    }

    return getConfig(periodoId).then(function(config){
      var before = JSON.parse(JSON.stringify(config || {}));
      var divisiones = config.divisiones || [];

      divisiones.forEach(function(div){
        div.carreras = (div.carreras || []).filter(function(item){
          return carreras.indexOf(carreraKey(item)) < 0;
        });
      });

      var current = divisiones.filter(function(div){
        return div.nombre === oldNombre;
      })[0];

      if(!current){
        current = {
          nombre: nombre,
          carreras: []
        };

        divisiones.push(current);
      }

      current.nombre = nombre;
      current.carreras = carreras;

      config.divisiones = divisiones.filter(function(div){
        return div.nombre && ((div.carreras || []).length || div.nombre === nombre);
      });

      return saveConfig(periodoId, config).then(function(saved){
        return aplicarConfiguracion(periodoId, saved).then(function(){
          recordDivision("guardar_division", periodoId, nombre, {
            oldNombre: oldNombre,
            carreras: carreras,
            before: before,
            after: saved
          });

          return saved;
        });
      });
    });
  }

  function borrarDivision(periodoId, nombre){
    nombre = text(nombre || "");

    return getConfig(periodoId).then(function(config){
      var before = JSON.parse(JSON.stringify(config || {}));

      config.divisiones = (config.divisiones || []).filter(function(div){
        return div.nombre !== nombre;
      });

      return saveConfig(periodoId, config).then(function(saved){
        return aplicarConfiguracion(periodoId, saved, {
          forceEmpty: true
        }).then(function(){
          recordDivision("borrar_division", periodoId, nombre, {
            oldNombre: nombre,
            before: before,
            after: saved
          });

          return saved;
        });
      });
    });
  }

  window.BDLRepoDivisiones = {
    guardarMuchos: guardarMuchos,
    porEstudiante: porEstudiante,
    porPeriodo: porPeriodo,
    porPeriodoDivision: porPeriodoDivision,
    getConfig: getConfig,
    saveConfig: saveConfig,
    carrerasPorPeriodo: carrerasPorPeriodo,
    reconstruirConfigDesdeEstudiantes: reconstruirConfigDesdeEstudiantes,
    guardarDivision: guardarDivision,
    borrarDivision: borrarDivision,
    aplicarConfiguracion: aplicarConfiguracion
  };
})(window);