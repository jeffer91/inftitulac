(function(window){
  "use strict";

  var T = window.BDLNormText;
  if(!T){ throw new Error("BDLNormText debe cargarse antes de BDLNormRequisito."); }

  var catalog = [
    ["academico", "Académico", "Academico", 1],
    ["actualizacionDatos", "Actualización de datos", "ActualizaciónDatos", 2],
    ["aprobacionComplexivoProyecto", "Aprobación complexivo/proyecto", "AprobacionComplexivoProyecto", 3],
    ["aprobacionTitulacion", "Aprobación titulación", "AprobacionTitulacion", 4],
    ["documentacion", "Documentación", "Documentacion", 5],
    ["financiero", "Financiero", "Financiero", 6],
    ["ingles", "Inglés", "Ingles", 7],
    ["practicasVinculacion", "Prácticas vinculación", "PrácticasVinculacion", 8],
    ["seguimientoGraduados", "Seguimiento graduados", "SeguimientoGraduados", 9],
    ["titulacion", "Titulación", "Titulacion", 10],
    ["vinculacion", "Vinculación", "Vinculacion", 11]
  ].map(function(item){
    return { requisitoId:item[0], nombreVisible:item[1], campoFirebase:item[2], orden:item[3], activo:true, esPrincipal:true };
  });

  function estado(value){
    var raw = T.searchKey(value);
    if(!raw){ return "INCOMPLETO"; }
    if(raw.indexOf("no cumple") >= 0 || raw === "no" || raw === "pendiente" || raw.indexOf("falta") >= 0){ return "NO CUMPLE"; }
    if(raw.indexOf("cumple") >= 0 || raw === "si" || raw === "aprobado" || raw === "ok"){ return "CUMPLE"; }
    return "INCOMPLETO";
  }

  function rawValue(row, req){
    return T.first(row, [req.requisitoId, req.campoFirebase, req.nombreVisible, T.noAccents(req.campoFirebase)]);
  }

  function resumen(row){
    var result = {};
    var no = 0;
    var incomplete = 0;
    catalog.forEach(function(req){
      var st = estado(rawValue(row, req));
      result[req.requisitoId] = st;
      if(st === "NO CUMPLE"){ no += 1; }
      if(st === "INCOMPLETO"){ incomplete += 1; }
    });
    return {
      resumen: result,
      estadoGeneral: no > 0 ? "NO CUMPLE" : (incomplete > 0 ? "INCOMPLETO" : "CUMPLE"),
      cumpleTodo: no === 0 && incomplete === 0
    };
  }

  function registros(row, idEstudiantePeriodo, periodoId, numeroIdentificacion){
    var now = new Date().toISOString();
    return catalog.map(function(req){
      return {
        id: idEstudiantePeriodo + "__" + req.requisitoId,
        idEstudiantePeriodo: idEstudiantePeriodo,
        periodoId: periodoId,
        numeroIdentificacion: numeroIdentificacion,
        requisitoId: req.requisitoId,
        estado: estado(rawValue(row, req)),
        observacion: "",
        updatedAt: now,
        syncStatus: "sincronizado"
      };
    });
  }

  window.BDLNormRequisito = {
    catalogo: function(){ return catalog.map(function(x){ return Object.assign({}, x); }); },
    estado: estado,
    resumen: resumen,
    registros: registros
  };
})(window);
