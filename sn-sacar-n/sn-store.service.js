/* =========================================================
Nombre completo: sn-store.service.js
Ruta o ubicacion: /Requisitos/sn-sacar-n/sn-store.service.js
Modulo: Sacar N
Funcion o funciones:
- Centralizar guardado local del modulo Sacar N.
- Guardar estudiantes cargados, resultados y novedades en localStorage.
- Preparar persistencia de avance para pausa, continuacion y exportacion.
Con que se conecta:
- sn-config.js
- sn-state.service.js
- sn-estudiantes.service.js
- sn-queue.service.js
========================================================= */
(function(window){
  "use strict";

  var cfg = window.SNConfig || {};

  function key(nombre){
    var keys = cfg.storageKeys || {};
    return keys[nombre] || ("REQ_SN_" + String(nombre || "DATO").toUpperCase() + "_V1");
  }

  function leer(clave, fallback){
    try{
      var raw = window.localStorage.getItem(clave);
      return raw ? JSON.parse(raw) : fallback;
    }catch(error){
      console.warn("[SN_STORE] No se pudo leer", clave, error);
      return fallback;
    }
  }

  function guardar(clave, valor){
    try{
      window.localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    }catch(error){
      console.warn("[SN_STORE] No se pudo guardar", clave, error);
      return false;
    }
  }

  function guardarEstudiantes(estudiantes){
    return guardar("REQ_SN_ESTUDIANTES_V1", Array.isArray(estudiantes) ? estudiantes : []);
  }

  function leerEstudiantes(){
    return leer("REQ_SN_ESTUDIANTES_V1", []);
  }

  function guardarResultados(resultados){
    return guardar(key("resultados"), Array.isArray(resultados) ? resultados : []);
  }

  function leerResultados(){
    return leer(key("resultados"), []);
  }

  function guardarNovedades(novedades){
    return guardar(key("novedades"), Array.isArray(novedades) ? novedades : []);
  }

  function leerNovedades(){
    return leer(key("novedades"), []);
  }

  function registrarUltimaCarga(meta){
    meta = Object.assign({ fecha: new Date().toISOString(), fuente: "BDLocal" }, meta || {});
    return guardar(key("ultimaExtraccion"), meta);
  }

  window.SNStore = {
    leer: leer,
    guardar: guardar,
    guardarEstudiantes: guardarEstudiantes,
    leerEstudiantes: leerEstudiantes,
    guardarResultados: guardarResultados,
    leerResultados: leerResultados,
    guardarNovedades: guardarNovedades,
    leerNovedades: leerNovedades,
    registrarUltimaCarga: registrarUltimaCarga
  };
})(window);
