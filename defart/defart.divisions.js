/* =========================================================
Nombre completo: defart.divisions.js
Ruta o ubicación: /Requisitos/defart/defart.divisions.js
Función o funciones:
- Leer la configuración de divisiones del período desde BDLocal.
- Usar BDLRepoDivisiones.getConfig(periodoId) como fuente principal.
- Convertir división -> carreras en listas simples para defart.
- Resolver carrera -> división sin modificar BDLocal.
- Usar estudiantes como respaldo si no existe configuración.
Con qué se conecta:
- ../BDLocal/adapters/bdl.screen-deps.js
- BDLocal/repositories/bdl.repo.divisiones.js
- defart.core.js
- defart.app.js
========================================================= */
(function(window){
  "use strict";

  var VERSION = "1.0.0-defart-divisions-reader";

  var state = {
    loadedPeriodId: null,
    loading: null,
    model: null,
    lastError: null
  };

  function text(value){ return String(value == null ? "" : value).trim(); }

  function norm(value){
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function compact(value){
    return norm(value).replace(/[^a-z0-9]/g, "");
  }

  function clone(value){
    try{ return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch(error){ return value; }
  }

  function carreraNormalize(value, code){
    if(window.BDLNormCarrera && typeof window.BDLNormCarrera.normalize === "function"){
      try{ return window.BDLNormCarrera.normalize(value || "", code || ""); }
      catch(error){}
    }

    return {
      key: compact(value || "SIN CARRERA").toUpperCase(),
      nombre: text(value) || "SIN CARRERA",
      codigo: code || "",
      original: text(value) || "SIN CARRERA"
    };
  }

  function careerKey(value){
    if(value && typeof value === "object"){
      return text(
        value.key ||
        value.carreraKey ||
        value.nombreCarreraKey ||
        value.codigo ||
        value.nombre ||
        value.name ||
        value.label ||
        value.carrera ||
        value.Carrera ||
        value.NombreCarrera ||
        value.nombreCarrera
      );
    }

    var normalized = carreraNormalize(value || "", "");
    return text(normalized.key) || compact(value);
  }

  function careerLabel(value){
    if(value && typeof value === "object"){
      return text(
        value.nombre ||
        value.name ||
        value.label ||
        value.original ||
        value.carrera ||
        value.Carrera ||
        value.NombreCarrera ||
        value.nombreCarrera ||
        value.key
      );
    }

    var normalized = carreraNormalize(value || "", "");
    return text(normalized.nombre || normalized.original || value);
  }

  function rowCareerLabel(row){
    row = row || {};

    return text(
      row._bl2Carrera ||
      row._carrera ||
      row.NombreCarrera ||
      row.nombreCarrera ||
      row.nombrecarrera ||
      row.Carrera ||
      row.carrera ||
      row.programa ||
      row.Programa ||
      "SIN CARRERA"
    );
  }

  function rowCareerCode(row){
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

  function rowCareerKey(row){
    row = row || {};

    if(text(row.carreraKey || row.nombreCarreraKey || row._carreraKey || "")){
      return text(row.carreraKey || row.nombreCarreraKey || row._carreraKey || "");
    }

    return careerKey(carreraNormalize(rowCareerLabel(row), rowCareerCode(row)));
  }

  function rowDivision(row){
    row = row || {};

    if(row._bl2Division){ return text(row._bl2Division); }
    if(row._division){ return text(row._division); }
    if(row.divisionPrincipal){ return text(row.divisionPrincipal); }
    if(row.division){ return text(row.division); }
    if(row.Division){ return text(row.Division); }
    if(row["División"]){ return text(row["División"]); }
    if(Array.isArray(row.divisiones) && row.divisiones.length){ return text(row.divisiones[0]); }

    return "Sin división";
  }

  function addCareerLabel(labels, key, label){
    key = text(key);
    label = text(label) || key;

    if(!key){ return; }

    if(!labels[key] || labels[key] === key || label.length > labels[key].length){
      labels[key] = label;
    }
  }

  function careerLabelMap(careers, rows){
    var labels = {};

    (Array.isArray(careers) ? careers : []).forEach(function(item){
      addCareerLabel(labels, careerKey(item), careerLabel(item));
    });

    (Array.isArray(rows) ? rows : []).forEach(function(row){
      addCareerLabel(labels, rowCareerKey(row), rowCareerLabel(row));
    });

    return labels;
  }

  function emptyModel(periodoId, source){
    return {
      version: VERSION,
      periodoId: text(periodoId),
      source: source || "empty",
      loadedAt: new Date().toISOString(),
      divisions: [],
      divisionNames: [],
      careers: [],
      careerLabels: {},
      careerToDivision: {},
      divisionKeyToName: {},
      diagnostics: {
        ok: true,
        source: source || "empty",
        periodoId: text(periodoId),
        divisions: 0,
        careers: 0
      }
    };
  }

  function buildFromConfig(periodoId, config, careers, rows){
    var labels = careerLabelMap(careers, rows);
    var model = emptyModel(periodoId, "BDLRepoDivisiones.getConfig");
    var seenCareers = {};

    (Array.isArray(config && config.divisiones) ? config.divisiones : []).forEach(function(div){
      var name = text(div && div.nombre);
      if(!name){ return; }

      var division = {
        name: name,
        key: compact(name),
        careers: []
      };

      model.divisionKeyToName[division.key] = name;

      (Array.isArray(div.carreras) ? div.carreras : []).forEach(function(item){
        var key = careerKey(item);
        if(!key){ return; }

        var label = labels[key] || careerLabel(item) || key;
        addCareerLabel(model.careerLabels, key, label);

        if(!division.careers.some(function(career){ return career.key === key; })){
          division.careers.push({ key: key, label: label });
        }

        model.careerToDivision[key] = name;

        if(!seenCareers[key]){
          seenCareers[key] = true;
          model.careers.push({ key: key, label: label, division: name });
        }
      });

      division.careers.sort(function(a, b){ return a.label.localeCompare(b.label, "es"); });
      model.divisions.push(division);
    });

    model.divisions.sort(function(a, b){ return a.name.localeCompare(b.name, "es"); });
    model.careers.sort(function(a, b){ return a.label.localeCompare(b.label, "es"); });
    model.divisionNames = model.divisions.map(function(div){ return div.name; });

    model.diagnostics = {
      ok: true,
      source: model.source,
      periodoId: text(periodoId),
      divisions: model.divisions.length,
      careers: model.careers.length,
      repoAvailable: !!window.BDLRepoDivisiones,
      configUpdatedAt: text(config && config.updatedAt),
      rebuilt: !!(config && config.reconstruido)
    };

    return model;
  }

  function buildFallback(rows, periodoId){
    var model = emptyModel(periodoId, "students-fallback");
    var divMap = {};
    var careerSeen = {};

    (Array.isArray(rows) ? rows : []).forEach(function(row){
      var divName = rowDivision(row) || "Sin división";
      var divKey = compact(divName);
      var cKey = rowCareerKey(row);
      var cLabel = rowCareerLabel(row);

      if(!divMap[divKey]){
        divMap[divKey] = { name: divName, key: divKey, careers: [] };
        model.divisionKeyToName[divKey] = divName;
      }

      addCareerLabel(model.careerLabels, cKey, cLabel);

      if(cKey && !divMap[divKey].careers.some(function(career){ return career.key === cKey; })){
        divMap[divKey].careers.push({ key: cKey, label: cLabel });
      }

      if(cKey){ model.careerToDivision[cKey] = divName; }

      if(cKey && !careerSeen[cKey]){
        careerSeen[cKey] = true;
        model.careers.push({ key: cKey, label: cLabel, division: divName });
      }
    });

    model.divisions = Object.keys(divMap).map(function(key){ return divMap[key]; }).sort(function(a, b){
      return a.name.localeCompare(b.name, "es");
    });

    model.divisions.forEach(function(div){
      div.careers.sort(function(a, b){ return a.label.localeCompare(b.label, "es"); });
    });

    model.careers.sort(function(a, b){ return a.label.localeCompare(b.label, "es"); });
    model.divisionNames = model.divisions.map(function(div){ return div.name; });

    model.diagnostics = {
      ok: true,
      source: model.source,
      periodoId: text(periodoId),
      divisions: model.divisions.length,
      careers: model.careers.length,
      repoAvailable: !!window.BDLRepoDivisiones
    };

    return model;
  }

  function load(periodoId, rows, options){
    periodoId = text(periodoId);
    options = options || {};

    if(!periodoId){
      state.loadedPeriodId = "";
      state.model = buildFallback(rows || [], "");
      state.lastError = null;
      state.loading = null;
      return Promise.resolve(clone(state.model));
    }

    if(!options.force && state.model && state.loadedPeriodId === periodoId){
      return Promise.resolve(clone(state.model));
    }

    if(!options.force && state.loading && state.loadedPeriodId === periodoId){
      return state.loading.then(function(){ return clone(state.model); });
    }

    state.loadedPeriodId = periodoId;

    if(!window.BDLRepoDivisiones || typeof window.BDLRepoDivisiones.getConfig !== "function"){
      state.model = buildFallback(rows || [], periodoId);
      state.lastError = "BDLRepoDivisiones no disponible. Se usó respaldo desde estudiantes.";
      state.loading = null;
      return Promise.resolve(clone(state.model));
    }

    state.loading = Promise.all([
      window.BDLRepoDivisiones.getConfig(periodoId),
      typeof window.BDLRepoDivisiones.carrerasPorPeriodo === "function"
        ? window.BDLRepoDivisiones.carrerasPorPeriodo(periodoId).catch(function(){ return []; })
        : Promise.resolve([])
    ]).then(function(parts){
      var config = parts[0] || { periodoId: periodoId, divisiones: [] };
      var careers = parts[1] || [];
      var model = buildFromConfig(periodoId, config, careers, rows || []);

      if(!model.divisions.length){
        model = buildFallback(rows || [], periodoId);
        model.source = "students-fallback-empty-config";
        model.diagnostics.source = model.source;
      }

      state.model = model;
      state.lastError = null;
      return model;
    }).catch(function(error){
      state.model = buildFallback(rows || [], periodoId);
      state.lastError = error && error.message ? error.message : String(error);
      state.model.diagnostics.ok = false;
      state.model.diagnostics.error = state.lastError;
      return state.model;
    }).then(function(model){
      state.loading = null;

      try{
        window.dispatchEvent(new CustomEvent("defart:divisions-loaded", {
          detail: { periodoId: periodoId, model: clone(model) }
        }));
      }catch(error){}

      return clone(model);
    });

    return state.loading;
  }

  function current(){
    return state.model || emptyModel("", "empty");
  }

  function divisionOf(row){
    var model = current();
    var cKey = rowCareerKey(row || {});
    return model.careerToDivision[cKey] || rowDivision(row) || "Sin división";
  }

  function hasDivision(row, division){
    division = text(division);
    if(!division){ return true; }
    return compact(divisionOf(row)) === compact(division);
  }

  function careerInDivision(row, division){
    division = text(division);
    if(!division){ return true; }

    var model = current();
    var cKey = rowCareerKey(row || {});
    return compact(model.careerToDivision[cKey] || rowDivision(row)) === compact(division);
  }

  function divisionList(rows){
    var model = current();

    if(model.divisionNames && model.divisionNames.length){
      return model.divisionNames.slice();
    }

    return buildFallback(rows || [], model.periodoId || "").divisionNames;
  }

  function careerList(division, rows){
    var model = current();
    division = text(division);

    if(model.divisions && model.divisions.length){
      var careers = [];

      model.divisions.forEach(function(div){
        if(division && compact(div.name) !== compact(division)){ return; }

        (div.careers || []).forEach(function(career){
          if(careers.indexOf(career.label) < 0){
            careers.push(career.label);
          }
        });
      });

      return careers.sort(function(a, b){ return a.localeCompare(b, "es"); });
    }

    var fallback = buildFallback(rows || [], model.periodoId || "");

    return fallback.careers.filter(function(item){
      return !division || compact(item.division) === compact(division);
    }).map(function(item){
      return item.label;
    }).filter(function(value, index, list){
      return value && list.indexOf(value) === index;
    }).sort(function(a, b){
      return a.localeCompare(b, "es");
    });
  }

  function sameCareer(a, b){
    if(!text(b)){ return true; }

    return careerKey(a) === careerKey(b) ||
      compact(a) === compact(b) ||
      norm(a) === norm(b);
  }

  function diagnostics(){
    var model = current();

    return Object.assign({}, model.diagnostics || {}, {
      loadedPeriodId: state.loadedPeriodId,
      lastError: state.lastError,
      version: VERSION
    });
  }

  window.DefartDivisions = {
    version: VERSION,
    load: load,
    current: current,
    diagnostics: diagnostics,
    divisionOf: divisionOf,
    hasDivision: hasDivision,
    careerInDivision: careerInDivision,
    divisionList: divisionList,
    careerList: careerList,
    careerKey: careerKey,
    careerLabel: careerLabel,
    rowCareerKey: rowCareerKey,
    rowCareerLabel: rowCareerLabel,
    sameCareer: sameCareer
  };
})(window);