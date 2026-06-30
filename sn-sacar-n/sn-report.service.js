/* =========================================================
Nombre completo: sn-report.service.js
Ruta o ubicacion: /Requisitos/sn-sacar-n/sn-report.service.js
Modulo: Sacar N
Funcion o funciones:
- Construir el resumen final del modulo Sacar N.
- Agrupar procesados, sin notas, no encontrados, errores y casos para revision manual.
- Generar acciones recomendadas para revisar novedades al final del proceso.
Con que se conecta:
- sn-config.js
- sn-state.service.js
- sn-ui-render.service.js
- sn-export-excel.service.js
========================================================= */
(function(window){
  "use strict";

  var cfg = window.SNConfig || {};
  var state = window.SNState || {};

  function texto(valor){
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function estados(){
    return cfg.estadosEstudiante || {};
  }

  function accionRecomendada(estado){
    estado = texto(estado);
    var e = estados();
    if(estado === (e.procesado || "Procesado")) return "Sin accion";
    if(estado === (e.sinNotas || "Sin notas")) return "Verificar si el estudiante ya tiene notas registradas en SISACAD.";
    if(estado === (e.noEncontrado || "No encontrado")) return "Revisar cedula, periodo, carrera y existencia del estudiante en SISACAD.";
    if(estado === (e.sesionExpirada || "Sesion expirada")) return "Iniciar sesion nuevamente en SISACAD y continuar desde pendientes.";
    if(estado === (e.errorCarga || "Error de carga")) return "Reintentar el estudiante o revisarlo manualmente.";
    if(estado === (e.revisarManualmente || "Revisar manualmente")) return "Abrir el caso en SISACAD y confirmar las notas manualmente.";
    return "Revisar manualmente.";
  }

  function clasificar(estudiante){
    var e = estados();
    var estado = texto(estudiante && estudiante.estado);
    if(estado === (e.procesado || "Procesado")) return "procesados";
    if(estado === (e.sinNotas || "Sin notas")) return "sinNotas";
    if(estado === (e.noEncontrado || "No encontrado")) return "noEncontrados";
    if(estado === (e.errorCarga || "Error de carga")) return "errores";
    if(estado === (e.sesionExpirada || "Sesion expirada")) return "errores";
    if(estado === (e.revisarManualmente || "Revisar manualmente")) return "revisar";
    return "pendientes";
  }

  function construir(snapshot){
    snapshot = snapshot || (state.get ? state.get() : {});
    var estudiantes = Array.isArray(snapshot.estudiantes) ? snapshot.estudiantes : [];
    var grupos = {
      procesados: [],
      sinNotas: [],
      noEncontrados: [],
      errores: [],
      revisar: [],
      pendientes: []
    };

    estudiantes.forEach(function(estudiante){
      var grupo = clasificar(estudiante);
      grupos[grupo].push(estudiante);
    });

    var resumen = {
      total: estudiantes.length,
      procesados: grupos.procesados.length,
      sinNotas: grupos.sinNotas.length,
      noEncontrados: grupos.noEncontrados.length,
      errores: grupos.errores.length,
      revisar: grupos.revisar.length,
      pendientes: grupos.pendientes.length,
      finalizados: grupos.procesados.length + grupos.sinNotas.length + grupos.noEncontrados.length + grupos.errores.length + grupos.revisar.length
    };

    var novedades = [];
    estudiantes.forEach(function(estudiante){
      var estado = texto(estudiante.estado);
      if(clasificar(estudiante) !== "procesados"){
        novedades.push({
          cedula: texto(estudiante.cedula),
          nombres: texto(estudiante.nombres),
          carrera: texto(estudiante.carrera),
          periodo: texto(estudiante.periodo),
          estado: estado || "Pendiente",
          observacion: texto(estudiante.observacion),
          accionRecomendada: accionRecomendada(estado)
        });
      }
    });

    return {
      resumen: resumen,
      grupos: grupos,
      novedades: novedades,
      generadoEn: new Date().toISOString()
    };
  }

  function estadoGeneral(reporte){
    reporte = reporte || construir();
    var r = reporte.resumen || {};
    if(!r.total) return "Sin estudiantes cargados";
    if(r.pendientes > 0) return "Extraccion pendiente";
    if(r.errores > 0 || r.revisar > 0) return "Finalizado con casos para revisar";
    if(r.sinNotas > 0 || r.noEncontrados > 0) return "Finalizado con novedades";
    return "Finalizado correctamente";
  }

  window.SNReport = {
    construir: construir,
    estadoGeneral: estadoGeneral,
    accionRecomendada: accionRecomendada
  };
})(window);
