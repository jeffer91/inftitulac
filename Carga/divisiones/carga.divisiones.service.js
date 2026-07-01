/* =========================================================
Nombre completo: carga.divisiones.service.js
Ruta: /Carga/divisiones/carga.divisiones.service.js
Función:
- Servicio de gestión de divisiones desde Carga.
- Trabaja por período.
- Crea, edita, borra divisiones.
- Asigna carreras a divisiones.
- Una carrera solo puede pertenecer a una división por período.
- Une carreras duplicadas por nombre dañado o texto cortado antes de mostrarlas.
- Al aplicar cambios, actualiza estudiantes del período en BDLocal.
========================================================= */
(function(window){
  "use strict";

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function cleanName(value){
    return text(value).replace(/\s+/g, " ");
  }

  function upper(value){
    return cleanName(value).toUpperCase();
  }

  function repo(){
    if(!window.BDLRepoDivisiones){
      throw new Error("BDLRepoDivisiones no está disponible.");
    }

    return window.BDLRepoDivisiones;
  }

  function boot(){
    if(window.BDLocal && typeof window.BDLocal.boot === "function"){
      return Promise.resolve(window.BDLocal.boot()).catch(function(){
        return null;
      });
    }

    if(window.BDLDB && typeof window.BDLDB.open === "function"){
      return window.BDLDB.open().catch(function(){
        return null;
      });
    }

    return Promise.resolve(null);
  }

  function removeAccents(value){
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function compact(value){
    if(window.BDLNormCarrera && typeof window.BDLNormCarrera.compact === "function"){
      return window.BDLNormCarrera.compact(value).toLowerCase();
    }

    if(window.CargaCarrerasGuard && typeof window.CargaCarrerasGuard.compact === "function"){
      return window.CargaCarrerasGuard.compact(value).toLowerCase();
    }

    return removeAccents(value)
      .replace(/\uFFFD/g, "")
      .replace(/�/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "")
      .toLowerCase();
  }

  function suspicious(value){
    value = text(value);

    if(window.BDLNormCarrera && typeof window.BDLNormCarrera.hasSuspicious === "function"){
      return window.BDLNormCarrera.hasSuspicious(value);
    }

    if(window.CargaCarrerasGuard && typeof window.CargaCarrerasGuard.hasSuspiciousEncoding === "function"){
      return window.CargaCarrerasGuard.hasSuspiciousEncoding(value);
    }

    return (
      value.indexOf("\uFFFD") >= 0 ||
      value.indexOf("�") >= 0 ||
      /Ã.|Â.|â€|â€™|â€œ|â€/i.test(value)
    );
  }

  function similarity(a, b){
    if(window.BDLNormCarrera && typeof window.BDLNormCarrera.similarity === "function"){
      return window.BDLNormCarrera.similarity(a, b);
    }

    if(window.CargaCarrerasGuard && typeof window.CargaCarrerasGuard.similarity === "function"){
      return window.CargaCarrerasGuard.similarity(a, b);
    }

    var ca = compact(a);
    var cb = compact(b);

    if(!ca || !cb){
      return 0;
    }

    if(ca === cb){
      return 1;
    }

    if(ca.indexOf(cb) >= 0 || cb.indexOf(ca) >= 0){
      return Math.min(ca.length, cb.length) / Math.max(ca.length, cb.length);
    }

    return 0;
  }

  function careerNameFromItem(item){
    item = item || {};

    return text(
      item.nombre ||
      item.NombreCarrera ||
      item.nombreCarrera ||
      item.carrera ||
      item.Carrera ||
      item.programa ||
      item.Programa ||
      item.name ||
      item.key ||
      ""
    );
  }

  function careerCodeFromItem(item){
    item = item || {};

    return text(
      item.codigo ||
      item.codigoCarrera ||
      item.CodigoCarrera ||
      item["CódigoCarrera"] ||
      item.codCarrera ||
      item.CodCarrera ||
      ""
    );
  }

  function normalizeCareerName(value, code){
    value = text(value);

    if(!value){
      return "";
    }

    if(window.BDLNormCarrera && typeof window.BDLNormCarrera.normalize === "function"){
      var info = window.BDLNormCarrera.normalize(value, code || "");

      if(info && info.nombre){
        return info.nombre;
      }
    }

    if(window.CargaCarrerasGuard && typeof window.CargaCarrerasGuard.normalizeCareerName === "function"){
      return window.CargaCarrerasGuard.normalizeCareerName(value);
    }

    return upper(value);
  }

  function key(value){
    value = text(value);

    if(!value){
      return "";
    }

    if(window.BDLNormCarrera && typeof window.BDLNormCarrera.key === "function"){
      return window.BDLNormCarrera.key(value);
    }

    if(window.CargaCarrerasGuard && typeof window.CargaCarrerasGuard.key === "function"){
      return window.CargaCarrerasGuard.key(value);
    }

    if(window.BDLNormText && typeof window.BDLNormText.key === "function"){
      return window.BDLNormText.key(value);
    }

    return compact(value);
  }

  function normalizeCareerItem(item){
    item = item || {};

    var rawName = careerNameFromItem(item);
    var code = careerCodeFromItem(item);
    var name = normalizeCareerName(rawName, code);
    var careerKey = key(name || rawName);

    return {
      key: careerKey,
      nombre: name || rawName || "SIN CARRERA",
      codigo: code,
      raw: rawName,
      division: text(item.division || item.Division || item.divisionPrincipal || ""),
      total: Number(item.total || 0),
      suspicious: suspicious(rawName) || suspicious(name)
    };
  }

  function betterCareer(a, b){
    a = a || {};
    b = b || {};

    if(!a.nombre){ return b; }
    if(!b.nombre){ return a; }

    if(a.suspicious && !b.suspicious){ return b; }
    if(b.suspicious && !a.suspicious){ return a; }

    if((b.nombre || "").length > (a.nombre || "").length){ return b; }

    if(Number(b.total || 0) > Number(a.total || 0) && (b.nombre || "").length >= (a.nombre || "").length){
      return b;
    }

    return a;
  }

  function sameCareer(a, b){
    if(!a || !b){
      return false;
    }

    if(a.key && b.key && a.key === b.key){
      return true;
    }

    var score = similarity(a.nombre || a.raw || "", b.nombre || b.raw || "");

    if(score >= 0.86){
      return true;
    }

    if((a.suspicious || b.suspicious) && score >= 0.68){
      return true;
    }

    var ca = compact(a.nombre || a.raw || "");
    var cb = compact(b.nombre || b.raw || "");

    if(ca && cb && (ca.indexOf(cb) >= 0 || cb.indexOf(ca) >= 0)){
      var ratio = Math.min(ca.length, cb.length) / Math.max(ca.length, cb.length);

      if(ratio >= 0.62){
        return true;
      }
    }

    return false;
  }

  function mergeTwoCareers(a, b){
    var best = betterCareer(a, b);
    var other = best === a ? b : a;

    return {
      key: key(best.nombre || best.raw || other.nombre || other.raw || ""),
      nombre: best.nombre || other.nombre || "SIN CARRERA",
      codigo: best.codigo || other.codigo || "",
      raw: best.raw || other.raw || "",
      division: best.division || other.division || "",
      total: Number(a.total || 0) + Number(b.total || 0),
      suspicious: !!(a.suspicious || b.suspicious),
      mergedFrom: []
        .concat(Array.isArray(a.mergedFrom) ? a.mergedFrom : [a.raw || a.nombre])
        .concat(Array.isArray(b.mergedFrom) ? b.mergedFrom : [b.raw || b.nombre])
        .filter(Boolean)
    };
  }

  function mergeCareerItems(items){
    var out = [];

    (Array.isArray(items) ? items : []).forEach(function(item){
      var career = normalizeCareerItem(item);

      if(!career.key){
        return;
      }

      var merged = false;

      for(var i = 0; i < out.length; i += 1){
        if(sameCareer(out[i], career)){
          out[i] = mergeTwoCareers(out[i], career);
          merged = true;
          break;
        }
      }

      if(!merged){
        out.push(career);
      }
    });

    var map = {};

    out.forEach(function(career){
      var careerKey = key(career.nombre || career.key || "");

      if(!careerKey){
        return;
      }

      if(!map[careerKey]){
        map[careerKey] = Object.assign({}, career, {
          key: careerKey
        });
      }else{
        map[careerKey] = mergeTwoCareers(map[careerKey], career);
        map[careerKey].key = careerKey;
      }
    });

    return Object.keys(map).map(function(careerKey){
      return map[careerKey];
    }).sort(function(a, b){
      return a.nombre.localeCompare(b.nombre, "es");
    });
  }

  function normalizeDivision(div){
    div = div || {};

    var nombre = cleanName(div.nombre || div.name || "");
    var carreras = Array.isArray(div.carreras) ? div.carreras : [];

    return {
      nombre: nombre,
      carreras: carreras.map(function(item){
        return key(item);
      }).filter(Boolean)
    };
  }

  function normalizeConfig(config, periodoId){
    config = config || {};

    var divMap = {};
    var careerOwner = {};
    var divisiones = Array.isArray(config.divisiones) ? config.divisiones : [];

    divisiones.forEach(function(div){
      var normalized = normalizeDivision(div);

      if(!normalized.nombre){
        return;
      }

      if(!divMap[normalized.nombre]){
        divMap[normalized.nombre] = {
          nombre: normalized.nombre,
          carreras: []
        };
      }

      normalized.carreras.forEach(function(carreraKey){
        carreraKey = key(carreraKey);

        if(!carreraKey){
          return;
        }

        if(careerOwner[carreraKey] && careerOwner[carreraKey] !== normalized.nombre){
          var oldDiv = divMap[careerOwner[carreraKey]];

          if(oldDiv){
            oldDiv.carreras = oldDiv.carreras.filter(function(item){
              return key(item) !== carreraKey;
            });
          }
        }

        careerOwner[carreraKey] = normalized.nombre;

        if(divMap[normalized.nombre].carreras.indexOf(carreraKey) < 0){
          divMap[normalized.nombre].carreras.push(carreraKey);
        }
      });
    });

    return {
      periodoId: periodoId || config.periodoId || "",
      divisiones: Object.keys(divMap).map(function(nombre){
        return divMap[nombre];
      }).sort(function(a, b){
        return a.nombre.localeCompare(b.nombre, "es");
      })
    };
  }

  function divisionByName(config, nombre){
    nombre = cleanName(nombre);

    return (config.divisiones || []).filter(function(div){
      return div.nombre === nombre;
    })[0] || null;
  }

  function removeCareerFromAll(config, carreraKey){
    carreraKey = key(carreraKey);

    (config.divisiones || []).forEach(function(div){
      div.carreras = (div.carreras || []).filter(function(item){
        return key(item) !== carreraKey;
      });
    });

    return config;
  }

  function assignedMap(config){
    var map = {};

    (config.divisiones || []).forEach(function(div){
      (div.carreras || []).forEach(function(carreraKey){
        map[key(carreraKey)] = div.nombre;
      });
    });

    return map;
  }

  function remapAssignedByMergedCareers(config, carreras){
    config = normalizeConfig(config || {}, config && config.periodoId);
    carreras = Array.isArray(carreras) ? carreras : [];

    var normalizedKeys = {};
    carreras.forEach(function(carrera){
      normalizedKeys[key(carrera.key || carrera.nombre)] = carrera.key;
    });

    config.divisiones.forEach(function(div){
      var fixed = [];

      (div.carreras || []).forEach(function(item){
        var k = key(item);
        var target = normalizedKeys[k] || k;

        if(target && fixed.indexOf(target) < 0){
          fixed.push(target);
        }
      });

      div.carreras = fixed;
    });

    return normalizeConfig(config, config.periodoId || "");
  }

  function emitChange(periodoId, payload){
    payload = payload || {};

    try{
      window.localStorage.setItem("REQ_BL_SIGNAL_V1", JSON.stringify({
        type: "carga-divisiones-updated",
        source: "carga.divisiones",
        periodoId: periodoId,
        updatedAt: new Date().toISOString()
      }));
    }catch(error){}

    try{
      window.dispatchEvent(new CustomEvent("carga:divisiones-updated", {
        detail: Object.assign({
          periodoId: periodoId,
          updatedAt: new Date().toISOString()
        }, payload)
      }));
    }catch(error){}
  }

  function saveAndApply(periodoId, config, options){
    options = options || {};
    periodoId = text(periodoId);

    if(!periodoId){
      return Promise.reject(new Error("Seleccione un período antes de gestionar divisiones."));
    }

    var normalized = normalizeConfig(config, periodoId);

    return boot().then(function(){
      return repo().saveConfig(periodoId, normalized);
    }).then(function(saved){
      return repo().aplicarConfiguracion(periodoId, saved, {
        forceEmpty: !!options.forceEmpty
      }).then(function(result){
        emitChange(periodoId, {
          result: result,
          config: saved
        });

        return {
          ok: true,
          periodoId: periodoId,
          config: saved,
          result: result,
          updated: result && result.updated ? result.updated : 0
        };
      });
    });
  }

  function load(periodoId){
    periodoId = text(periodoId);

    if(!periodoId){
      return Promise.reject(new Error("Seleccione un período."));
    }

    return boot().then(function(){
      return Promise.all([
        repo().getConfig(periodoId),
        repo().carrerasPorPeriodo(periodoId)
      ]);
    }).then(function(parts){
      var config = normalizeConfig(parts[0] || {}, periodoId);
      var carreras = mergeCareerItems(parts[1] || []);

      config = remapAssignedByMergedCareers(config, carreras);

      var asignadas = assignedMap(config);

      carreras = carreras.map(function(carrera){
        var finalKey = key(carrera.nombre || carrera.key);

        return {
          key: finalKey,
          nombre: carrera.nombre,
          codigo: carrera.codigo || "",
          division: asignadas[finalKey] || "",
          total: carrera.total || 0,
          mergedFrom: carrera.mergedFrom || []
        };
      });

      return {
        ok: true,
        periodoId: periodoId,
        config: config,
        carreras: carreras,
        asignadas: asignadas
      };
    });
  }

  function createDivision(periodoId, nombre){
    nombre = cleanName(nombre);

    if(!nombre){
      return Promise.reject(new Error("Ingrese el nombre de la división."));
    }

    return load(periodoId).then(function(data){
      var config = data.config;

      if(!divisionByName(config, nombre)){
        config.divisiones.push({
          nombre: nombre,
          carreras: []
        });
      }

      return saveAndApply(periodoId, config).then(function(result){
        result.selected = nombre;
        return result;
      });
    });
  }

  function renameDivision(periodoId, oldNombre, newNombre){
    oldNombre = cleanName(oldNombre);
    newNombre = cleanName(newNombre);

    if(!oldNombre){
      return Promise.reject(new Error("Seleccione una división."));
    }

    if(!newNombre){
      return Promise.reject(new Error("Ingrese el nuevo nombre de la división."));
    }

    return load(periodoId).then(function(data){
      var config = data.config;
      var current = divisionByName(config, oldNombre);

      if(!current){
        throw new Error("La división seleccionada ya no existe.");
      }

      var target = divisionByName(config, newNombre);

      if(target && target !== current){
        current.carreras.forEach(function(carreraKey){
          carreraKey = key(carreraKey);

          if(target.carreras.indexOf(carreraKey) < 0){
            target.carreras.push(carreraKey);
          }
        });

        config.divisiones = config.divisiones.filter(function(div){
          return div.nombre !== oldNombre;
        });
      }else{
        current.nombre = newNombre;
      }

      return saveAndApply(periodoId, config).then(function(result){
        result.selected = newNombre;
        return result;
      });
    });
  }

  function deleteDivision(periodoId, nombre){
    nombre = cleanName(nombre);

    if(!nombre){
      return Promise.reject(new Error("Seleccione una división."));
    }

    return load(periodoId).then(function(data){
      var config = data.config;

      config.divisiones = (config.divisiones || []).filter(function(div){
        return div.nombre !== nombre;
      });

      return saveAndApply(periodoId, config, {
        forceEmpty: true
      }).then(function(result){
        result.selected = "";
        return result;
      });
    });
  }

  function assignCareer(periodoId, carreraKey, divisionName){
    carreraKey = key(carreraKey);
    divisionName = cleanName(divisionName);

    if(!carreraKey){
      return Promise.reject(new Error("Carrera inválida."));
    }

    if(!divisionName){
      return Promise.reject(new Error("Seleccione una división de destino."));
    }

    return load(periodoId).then(function(data){
      var config = data.config;
      var target = divisionByName(config, divisionName);

      if(!target){
        target = {
          nombre: divisionName,
          carreras: []
        };
        config.divisiones.push(target);
      }

      removeCareerFromAll(config, carreraKey);

      if(target.carreras.indexOf(carreraKey) < 0){
        target.carreras.push(carreraKey);
      }

      return saveAndApply(periodoId, config).then(function(result){
        result.selected = divisionName;
        return result;
      });
    });
  }

  function unassignCareer(periodoId, carreraKey){
    carreraKey = key(carreraKey);

    if(!carreraKey){
      return Promise.reject(new Error("Carrera inválida."));
    }

    return load(periodoId).then(function(data){
      var config = data.config;

      removeCareerFromAll(config, carreraKey);

      return saveAndApply(periodoId, config, {
        forceEmpty: true
      }).then(function(result){
        return result;
      });
    });
  }

  window.CargaDivisionesService = {
    load: load,
    createDivision: createDivision,
    renameDivision: renameDivision,
    deleteDivision: deleteDivision,
    assignCareer: assignCareer,
    unassignCareer: unassignCareer,
    saveAndApply: saveAndApply,
    normalizeConfig: normalizeConfig,
    assignedMap: assignedMap,
    key: key,
    cleanName: cleanName,
    normalizeCareerItem: normalizeCareerItem,
    mergeCareerItems: mergeCareerItems,
    sameCareer: sameCareer,
    similarity: similarity
  };
})(window);