(function(window){
  "use strict";

  var B = window.BDLRepoBase;
  var E = window.BDLNormEstudiante;
  var R = window.BDLNormRequisito;
  var N = window.BDLNormNota;
  var D = window.BDLNormDivision;
  var X = window.BDLNormError;

  if(!B || !E || !R || !N || !D || !X){
    throw new Error("BDLRepoEstudiantes requiere normalizadores completos.");
  }

  function pageOptions(options){
    options = options || {};
    var page = Math.max(1, Number(options.page || 1));
    var limit = options.limit === 0 ? 0 : Math.max(1, Number(options.limit || 100));
    return Object.assign({}, options, {
      page: page,
      limit: limit,
      offset: options.offset == null ? (page - 1) * (limit || 0) : Number(options.offset || 0)
    });
  }

  function txt(value){ return String(value == null ? "" : value).trim(); }
  function searchKey(value){ return txt(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase(); }

  function byKey(rows, key){
    var map = {};
    B.asArray(rows).forEach(function(row){
      var id = txt(row && row[key]);
      if(id){ map[id] = row; }
    });
    return map;
  }

  function detailOriginal(detail){
    detail = detail || {};
    return Object.assign({}, detail.datosOriginalesFirebase || {}, detail.camposExtra || {});
  }

  function withAliases(row){
    row = Object.assign({}, row || {});
    row.cedula = row.cedula || row.numeroIdentificacion || "";
    row.Cedula = row.Cedula || row.numeroIdentificacion || "";
    row.Nombres = row.Nombres || row.nombres || "";
    row.NombreCarrera = row.NombreCarrera || row.nombreCarrera || "";
    row.Carrera = row.Carrera || row.nombreCarrera || "";
    row.CodigoCarrera = row.CodigoCarrera || row.codigoCarrera || "";
    row.Sede = row.Sede || row.sede || "";
    row.Periodo = row.Periodo || row.periodoLabel || row.periodoId || "";
    row.periodo = row.periodo || row.periodoLabel || row.periodoId || "";
    row.periodoLabel = row.periodoLabel || row.periodoId || "";
    row.division = row.division || row.divisionPrincipal || "";
    row.Division = row.Division || row.divisionPrincipal || "";
    row.divisiones = Array.isArray(row.divisiones) ? row.divisiones : (row.divisionPrincipal ? [row.divisionPrincipal] : []);
    row.correoPersonal = row.correoPersonal || row.CorreoPersonal || row.correo || row.Correo || row.email || row.Email || "";
    row.CorreoPersonal = row.CorreoPersonal || row.correoPersonal || "";
    row.correoInstitucional = row.correoInstitucional || row.CorreoInstitucional || row.correoInst || row.CorreoInst || "";
    row.CorreoInstitucional = row.CorreoInstitucional || row.correoInstitucional || "";
    row.correo = row.correo || row.correoPersonal || row.correoInstitucional || "";
    row.Correo = row.Correo || row.correo || "";
    row.celular = row.celular || row.Celular || row.telefono || row.Telefono || row["Teléfono"] || row.whatsapp || "";
    row.Celular = row.Celular || row.celular || "";
    row.telefono = row.telefono || row.celular || "";
    row.Academico = row.Academico || row.academico || "";
    row.Financiero = row.Financiero || row.financiero || "";
    row.Documentacion = row.Documentacion || row.documentacion || "";
    row.Titulacion = row.Titulacion || row.titulacion || "";
    row.Ingles = row.Ingles || row.ingles || "";
    row.ActualizacionDatos = row.ActualizacionDatos || row.actualizacionDatos || "";
    row.AprobacionTitulacion = row.AprobacionTitulacion || row.aprobacionTitulacion || "";
    row.AprobacionComplexivoProyecto = row.AprobacionComplexivoProyecto || row.aprobacionComplexivoProyecto || "";
    row.estado = row.estado || row.estadoGeneral || "";
    row.searchKey = searchKey([row.searchKey, row.numeroIdentificacion, row.cedula, row.Nombres, row.nombres, row.nombreCarrera, row.NombreCarrera, row.sede, row.Sede, row.division, row.Division, row.correoPersonal, row.correoInstitucional, row.correo, row.celular].join(" "));
    return row;
  }

  function progress(options, current, total, message, phase){
    options = options || {};
    var detail = {
      current: Number(current || 0),
      total: Number(total || 0),
      message: message || "",
      phase: phase || ""
    };

    if(typeof options.onProgress === "function"){
      try{ options.onProgress(detail); }catch(error){ console.warn("[BDLRepoEstudiantes] Error en onProgress", error); }
    }

    try{ window.dispatchEvent(new CustomEvent("bdlocal:estudiantes-progress", { detail: detail })); }catch(error){}
    return detail;
  }

  function mergeStudents(resumenRows, personaRows, detalleRows){
    var personas = byKey(personaRows, "numeroIdentificacion");
    var detalles = byKey(detalleRows, "idEstudiantePeriodo");
    return B.asArray(resumenRows).map(function(resumen){
      var persona = personas[txt(resumen && resumen.numeroIdentificacion)] || {};
      var detalle = detalles[txt(resumen && resumen.idEstudiantePeriodo)] || {};
      return withAliases(Object.assign({}, detailOriginal(detalle), persona, resumen, {
        detalleId: detalle.idEstudiantePeriodo || "",
        datosOriginalesFirebase: detalle.datosOriginalesFirebase || {}
      }));
    });
  }

  function mirrorSnapshot(){
    return Promise.all([
      B.list(B.stores.periodos, { limit: 0 }),
      B.list(B.stores.estudiantesResumen, { limit: 0 }),
      B.list(B.stores.estudiantesPersona, { limit: 0 }),
      B.list(B.stores.estudiantesDetalle, { limit: 0 })
    ]).then(function(parts){
      var periods = (parts[0] || []).map(function(p){
        return Object.assign({}, p, {
          id: p.periodoId,
          value: p.periodoId,
          label: p.periodoLabel || p.periodoId
        });
      });
      var students = mergeStudents(parts[1] || [], parts[2] || [], parts[3] || []);
      var snapshot = {
        meta: {
          app: "Requisitos",
          module: "BDLocal",
          source: "BDLRepoEstudiantes",
          updatedAt: B.now(),
          totalPeriods: periods.length,
          totalStudents: students.length
        },
        periods: periods,
        students: students,
        history: [],
        diagnostics: []
      };
      try{ window.localStorage.setItem("REQ_BDLOCAL_LEGACY_SNAPSHOT_V1", JSON.stringify(snapshot)); }catch(error){}
      try{ window.localStorage.setItem("REQ_EXCEL_LOCAL_V1:snapshot", JSON.stringify(snapshot)); }catch(error){}
      try{ window.dispatchEvent(new CustomEvent("bdlocal:legacy-snapshot", { detail: { totalStudents: students.length, totalPeriods: periods.length, at: B.now() } })); }catch(error){}
      return snapshot;
    });
  }

  function guardarRegistro(row, periodoInfo){
    var normalized = E.normalize(row, periodoInfo);
    var id = normalized.resumen.idEstudiantePeriodo;
    var numero = normalized.resumen.numeroIdentificacion;
    var periodoId = normalized.resumen.periodoId;
    var requisitos = R.registros(row, id, periodoId, numero);
    var notas = N.registros(row, id, periodoId, numero);
    var divisiones = D.registros(row, id, periodoId, numero);
    var errores = X.revisarBasicos(row, normalized.periodo, numero);

    return Promise.all([
      B.put(B.stores.periodos, normalized.periodo),
      B.put(B.stores.estudiantesPersona, normalized.persona),
      B.put(B.stores.estudiantesResumen, normalized.resumen),
      B.put(B.stores.estudiantesDetalle, normalized.detalle),
      B.putAll(B.stores.estudianteRequisitos, requisitos),
      B.putAll(B.stores.estudianteNotas, notas),
      B.putAll(B.stores.estudianteDivisiones, divisiones),
      B.putAll(B.stores.erroresDatos, errores)
    ]).then(function(){
      B.cacheClear();
      return { idEstudiantePeriodo: id, periodoId: periodoId, errores: errores.length };
    });
  }

  function guardarMuchos(rows, periodoInfo, options){
    options = options || {};
    rows = B.asArray(rows);

    var result = {
      ok: true,
      saved: 0,
      errors: 0,
      total: rows.length,
      periodoId: txt(periodoInfo && periodoInfo.periodoId),
      startedAt: B.now()
    };

    progress(options, 0, rows.length, "Guardando estudiantes", "save");

    var chain = Promise.resolve(result);

    rows.forEach(function(row, index){
      chain = chain.then(function(){
        progress(options, index, rows.length, "Guardando estudiante " + (index + 1) + " de " + rows.length, "save");
        return guardarRegistro(row, periodoInfo).then(function(saved){
          result.saved += 1;
          result.errors += saved.errores || 0;
          result.periodoId = result.periodoId || saved.periodoId || "";
          progress(options, result.saved, rows.length, "Estudiantes guardados: " + result.saved + " de " + rows.length, "save");
          return result;
        });
      });
    });

    return chain.then(function(finalResult){
      finalResult.finishedAt = B.now();
      return mirrorSnapshot().catch(function(error){
        console.warn("[BDLRepoEstudiantes] No se pudo crear snapshot legacy", error);
        return null;
      }).then(function(){
        progress(options, finalResult.saved, rows.length, "Snapshot local actualizado", "snapshot");
        return finalResult;
      });
    });
  }

  function borrarStorePorPeriodo(storeName, indexName, keyField, periodoId, options, label){
    return B.byIndex(storeName, indexName || "by_periodoId", periodoId, { limit: 0 }).then(function(rows){
      rows = B.asArray(rows);
      var result = { store: storeName, label: label || storeName, deleted: 0, total: rows.length };
      var chain = Promise.resolve(result);

      rows.forEach(function(row){
        chain = chain.then(function(){
          var key = row && row[keyField];
          if(!key){ return result; }
          return B.remove(storeName, key).then(function(){
            result.deleted += 1;
            return result;
          }).catch(function(error){
            console.warn("[BDLRepoEstudiantes] No se pudo borrar en " + storeName, error);
            return result;
          });
        });
      });

      return chain;
    });
  }

  function borrarPorPeriodo(periodoId, options){
    options = options || {};
    periodoId = txt(periodoId);

    if(!periodoId){
      return Promise.resolve({ ok:false, periodoId:"", deleted:0, message:"periodoId vacío" });
    }

    var totals = [];
    var order = [
      { store:B.stores.estudianteRequisitos, key:"id", label:"requisitos" },
      { store:B.stores.estudianteNotas, key:"idNota", label:"notas" },
      { store:B.stores.estudianteDivisiones, key:"id", label:"divisiones" },
      { store:B.stores.estudiantesDetalle, key:"idEstudiantePeriodo", label:"detalles" },
      { store:B.stores.estudiantesResumen, key:"idEstudiantePeriodo", label:"resúmenes" },
      { store:B.stores.dashboardCache, key:"id", label:"dashboard" }
    ];

    progress(options, 0, order.length, "Limpiando datos anteriores del período", "cleanup");

    var chain = Promise.resolve();

    order.forEach(function(item, index){
      chain = chain.then(function(){
        progress(options, index, order.length, "Limpiando " + item.label, "cleanup");
        return borrarStorePorPeriodo(item.store, "by_periodoId", item.key, periodoId, options, item.label).then(function(result){
          totals.push(result);
          progress(options, index + 1, order.length, "Limpieza de " + item.label + " finalizada", "cleanup");
          return result;
        });
      });
    });

    return chain.then(function(){
      B.cacheClear();
      return mirrorSnapshot().catch(function(error){
        console.warn("[BDLRepoEstudiantes] No se pudo actualizar snapshot después de limpiar período", error);
        return null;
      });
    }).then(function(){
      var deleted = totals.reduce(function(sum, item){ return sum + Number(item.deleted || 0); }, 0);
      return { ok:true, periodoId:periodoId, deleted:deleted, stores:totals, message:"Datos del período limpiados." };
    });
  }

  function reemplazarPorPeriodo(rows, periodoInfo, options){
    options = options || {};
    periodoInfo = periodoInfo || {};
    var periodoId = txt(periodoInfo.periodoId);

    if(!periodoId){
      return Promise.reject(new Error("No se puede reemplazar la carga porque periodoId está vacío."));
    }

    return borrarPorPeriodo(periodoId, options).then(function(cleanup){
      return guardarMuchos(rows, periodoInfo, options).then(function(result){
        return Object.assign({}, result, { cleanup: cleanup, replaced: true, mode: "replacePeriod" });
      });
    });
  }

  function listarResumen(periodoId, options){
    options = pageOptions(options || {});
    if(periodoId){
      return B.byIndex(B.stores.estudiantesResumen, "by_periodoId", periodoId, options);
    }
    return B.list(B.stores.estudiantesResumen, options);
  }

  function contarPorPeriodo(periodoId){
    if(!periodoId){ return Promise.resolve(0); }
    return B.byIndex(B.stores.estudiantesResumen, "by_periodoId", periodoId, { limit: 0 }).then(function(rows){
      return rows.length;
    });
  }

  function verificarPeriodo(periodoId, expected){
    expected = Number(expected || 0);
    return contarPorPeriodo(periodoId).then(function(count){
      return {
        ok: count === expected,
        periodoId: periodoId,
        esperados: expected,
        guardados: count,
        diferencia: count - expected,
        message: count === expected ? "Verificación correcta." : "La cantidad guardada no coincide con la cantidad detectada."
      };
    });
  }

  function obtenerResumen(idEstudiantePeriodo){
    return B.get(B.stores.estudiantesResumen, idEstudiantePeriodo);
  }

  function obtenerDetalle(idEstudiantePeriodo){
    return Promise.all([
      B.get(B.stores.estudiantesResumen, idEstudiantePeriodo),
      B.get(B.stores.estudiantesDetalle, idEstudiantePeriodo),
      B.byIndex(B.stores.estudianteRequisitos, "by_idEstudiantePeriodo", idEstudiantePeriodo, { limit: 0 }),
      B.byIndex(B.stores.estudianteNotas, "by_idEstudiantePeriodo", idEstudiantePeriodo, { limit: 0 }),
      B.byIndex(B.stores.estudianteDivisiones, "by_idEstudiantePeriodo", idEstudiantePeriodo, { limit: 0 })
    ]).then(function(parts){
      var resumen = parts[0] || null;
      var detalle = parts[1] || null;
      var numero = resumen && resumen.numeroIdentificacion;
      var personaPromise = numero ? B.get(B.stores.estudiantesPersona, numero).catch(function(){ return null; }) : Promise.resolve(null);
      return personaPromise.then(function(persona){
        return {
          resumen: resumen,
          persona: persona || null,
          detalle: detalle,
          estudiante: withAliases(Object.assign({}, detailOriginal(detalle), persona || {}, resumen || {})),
          requisitos: parts[2] || [],
          notas: parts[3] || [],
          divisiones: parts[4] || []
        };
      });
    });
  }

  window.BDLRepoEstudiantes = {
    guardarRegistro: guardarRegistro,
    guardarMuchos: guardarMuchos,
    reemplazarPorPeriodo: reemplazarPorPeriodo,
    borrarPorPeriodo: borrarPorPeriodo,
    listarResumen: listarResumen,
    contarPorPeriodo: contarPorPeriodo,
    verificarPeriodo: verificarPeriodo,
    obtenerResumen: obtenerResumen,
    obtenerDetalle: obtenerDetalle,
    mirrorSnapshot: mirrorSnapshot
  };
})(window);