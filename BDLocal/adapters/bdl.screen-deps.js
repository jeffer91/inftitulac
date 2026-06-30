(function(window, document){
  "use strict";

  if(window.__BDL_SCREEN_DEPS_DONE__){ return; }
  window.__BDL_SCREEN_DEPS_DONE__ = true;

  var current = document.currentScript && document.currentScript.src ? document.currentScript.src : window.location.href;
  var base = new URL("../", current).href;
  var files = [
    "bdl.config.js",
    "bdl.schema.js",
    "bdl.keys.js",
    "bdl.db.js",
    "bdl.state.js",
    "bdl.cache.js",
    "normalizers/bdl.norm.text.js",
    "normalizers/bdl.norm.periodo.js",
    "normalizers/bdl.norm.requisito.js",
    "normalizers/bdl.norm.estudiante.js",
    "normalizers/bdl.norm.nota.js",
    "normalizers/bdl.norm.division.js",
    "normalizers/bdl.norm.error.js",
    "repositories/bdl.repo.base.js",
    "repositories/bdl.repo.config.js",
    "repositories/bdl.repo.periodos.js",
    "repositories/bdl.repo.carreras.js",
    "repositories/bdl.repo.personas.js",
    "repositories/bdl.repo.estudiantes.js",
    "repositories/bdl.repo.requisitos.js",
    "repositories/bdl.repo.notas.js",
    "repositories/bdl.repo.divisiones.js",
    "repositories/bdl.repo.dashboard.js",
    "repositories/bdl.repo.errores.js",
    "repositories/bdl.repositories.index.js",
    "api/bdl.api.js",
    "sync/bdl.sync.config.js",
    "sync/bdl.sync.queue.js",
    "sync/bdl.sync.log.js",
    "sync/bdl.sync.firebase.js",
    "sync/bdl.sync.upload.js",
    "sync/bdl.sync.download.js",
    "sync/bdl.sync.engine.js",
    "sync/bdl.sync.index.js",
    "adapters/bdl.legacy-adapter.js"
  ];

  document.write(files.map(function(file){
    return '<script src="' + base + file + '"><\/script>';
  }).join(""));
})(window, document);
