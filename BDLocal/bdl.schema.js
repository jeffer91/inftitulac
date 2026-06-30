(function(window){
  "use strict";

  var cfg = window.BDLConfig;

  if(!cfg){
    throw new Error("BDLConfig debe cargarse antes de BDLSchema.");
  }

  function idx(name, keyPath, unique){
    return { name: name, keyPath: keyPath, unique: !!unique };
  }

  var schema = [
    { name: cfg.stores.appConfig, keyPath: "clave", indexes: [idx("by_updatedAt", "updatedAt")] },
    { name: cfg.stores.periodos, keyPath: "periodoId", indexes: [idx("by_activo", "activo"), idx("by_estado", "estado"), idx("by_updatedAt", "updatedAt")] },
    { name: cfg.stores.carreras, keyPath: "codigoCarrera", indexes: [idx("by_nombreCarreraKey", "nombreCarreraKey"), idx("by_modalidad", "modalidad"), idx("by_activa", "activa")] },
    { name: cfg.stores.requisitosCatalogo, keyPath: "requisitoId", indexes: [idx("by_orden", "orden"), idx("by_activo", "activo"), idx("by_esPrincipal", "esPrincipal")] },
    { name: cfg.stores.estudiantesPersona, keyPath: "numeroIdentificacion", indexes: [idx("by_searchKey", "searchKey"), idx("by_updatedAt", "updatedAt")] },
    { name: cfg.stores.estudiantesResumen, keyPath: "idEstudiantePeriodo", indexes: [idx("by_periodoId", "periodoId"), idx("by_numeroIdentificacion", "numeroIdentificacion"), idx("by_codigoCarrera", "codigoCarrera"), idx("by_sedeKey", "sedeKey"), idx("by_estadoGeneral", "estadoGeneral"), idx("by_estadoMatricula", "estadoMatricula"), idx("by_divisionPrincipalKey", "divisionPrincipalKey"), idx("by_periodo_carrera", ["periodoId", "codigoCarrera"]), idx("by_periodo_estadoGeneral", ["periodoId", "estadoGeneral"]), idx("by_periodo_estadoMatricula", ["periodoId", "estadoMatricula"])] },
    { name: cfg.stores.estudiantesDetalle, keyPath: "idEstudiantePeriodo", indexes: [idx("by_periodoId", "periodoId"), idx("by_numeroIdentificacion", "numeroIdentificacion"), idx("by_updatedAt", "updatedAt")] },
    { name: cfg.stores.estudianteRequisitos, keyPath: "id", indexes: [idx("by_idEstudiantePeriodo", "idEstudiantePeriodo"), idx("by_periodoId", "periodoId"), idx("by_requisitoId", "requisitoId"), idx("by_estado", "estado"), idx("by_periodo_requisito_estado", ["periodoId", "requisitoId", "estado"])] },
    { name: cfg.stores.estudianteNotas, keyPath: "idNota", indexes: [idx("by_idEstudiantePeriodo", "idEstudiantePeriodo"), idx("by_periodoId", "periodoId"), idx("by_tipoNota", "tipoNota")] },
    { name: cfg.stores.estudianteDivisiones, keyPath: "id", indexes: [idx("by_idEstudiantePeriodo", "idEstudiantePeriodo"), idx("by_periodoId", "periodoId"), idx("by_divisionKey", "divisionKey"), idx("by_periodo_division", ["periodoId", "divisionKey"])] },
    { name: cfg.stores.dashboardCache, keyPath: "id", indexes: [idx("by_periodoId", "periodoId"), idx("by_actualizadoEn", "actualizadoEn")] },
    { name: cfg.stores.syncQueue, keyPath: "id", indexes: [idx("by_estado", "estado"), idx("by_tabla", "tabla"), idx("by_createdAt", "createdAt")] },
    { name: cfg.stores.syncLog, keyPath: "id", indexes: [idx("by_tipo", "tipo"), idx("by_estado", "estado"), idx("by_inicio", "inicio")] },
    { name: cfg.stores.erroresDatos, keyPath: "id", indexes: [idx("by_tipoError", "tipoError"), idx("by_nivel", "nivel"), idx("by_resuelto", "resuelto"), idx("by_createdAt", "createdAt")] }
  ];

  window.BDLSchema = {
    stores: schema,
    list: function(){ return schema.slice(); }
  };
})(window);
