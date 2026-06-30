(function(window){
  "use strict";

  var BDLConfig = {
    version: "1.0.0",
    dbName: "REQ_BDLOCAL_DB",
    dbVersion: 1,
    defaultPageSize: 100,
    stores: {
      appConfig: "app_config",
      periodos: "periodos",
      carreras: "carreras",
      requisitosCatalogo: "requisitos_catalogo",
      estudiantesPersona: "estudiantes_persona",
      estudiantesResumen: "estudiantes_periodo_resumen",
      estudiantesDetalle: "estudiantes_periodo_detalle",
      estudianteRequisitos: "estudiante_requisitos",
      estudianteNotas: "estudiante_notas",
      estudianteDivisiones: "estudiante_divisiones",
      dashboardCache: "dashboard_cache",
      syncQueue: "sync_queue",
      syncLog: "sync_log",
      erroresDatos: "errores_datos"
    },
    loadStatus: {
      idle: "idle",
      loading: "loading",
      loaded: "loaded",
      error: "error",
      refreshing: "refreshing"
    },
    syncStatus: {
      pendiente: "pendiente",
      procesando: "procesando",
      sincronizado: "sincronizado",
      error: "error",
      conflicto: "conflicto"
    },
    keys: {
      status: "REQ_BDLOCAL_STATUS_V1",
      lastBoot: "REQ_BDLOCAL_LAST_BOOT_V1",
      activePeriod: "REQ_BDLOCAL_ACTIVE_PERIOD_V1"
    },
    now: function(){
      return new Date().toISOString();
    }
  };

  window.BDLConfig = BDLConfig;
})(window);
