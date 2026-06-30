/* =========================================================
Nombre completo: conn.audit.js
Ruta: /BDLocal/connections/shared/conn.audit.js
Función:
- Auditar conexiones, procesos y subprocesos cargados en la pantalla actual.
- No modifica datos.
========================================================= */
(function(window, document){
  "use strict";

  function exists(path){
    var parts = String(path || "").split(".");
    var ref = window;
    for(var i=0;i<parts.length;i+=1){
      if(!ref || typeof ref[parts[i]] === "undefined"){ return false; }
      ref = ref[parts[i]];
    }
    return true;
  }

  function check(name, ok, detail, level){
    return { name:name, ok:!!ok, level:level || (ok ? "ok" : "warn"), detail:detail || "" };
  }

  function currentScreen(){
    var path = String(window.location.pathname || "").toLowerCase();
    if(path.indexOf("bdlocal/bl.html") >= 0){ return "BL"; }
    if(path.indexOf("bdlocal/bdlocal.html") >= 0){ return "Carga"; }
    if(path.indexOf("gestion/tabla") >= 0){ return "Tabla"; }
    if(path.indexOf("ficha/") >= 0){ return "Ficha"; }
    if(path.indexOf("stats/") >= 0){ return "Stats"; }
    if(path.indexOf("coordi/") >= 0){ return "Coordi"; }
    if(path.indexOf("reportes/") >= 0){ return "Reportes"; }
    if(path.indexOf("defart/") >= 0){ return "Defensas"; }
    if(path.indexOf("titulos/") >= 0){ return "Títulos"; }
    return "Pantalla";
  }

  function moduleChecks(){
    return [
      check("BDLocal API", exists("BDLocal"), "Contrato central de BDLocal"),
      check("BDLDB", exists("BDLDB"), "IndexedDB local"),
      check("Repositorios", exists("BDLRepositories") || exists("BDLRepoEstudiantes"), "Repositorios BDLocal"),
      check("Sync Queue", exists("BDLSyncQueue"), "Cola de sincronización"),
      check("Sync Upload", exists("BDLSyncUpload"), "Subida modular"),
      check("Sync Download", exists("BDLSyncDownload"), "Bajada modular"),
      check("Firebase", exists("BDLConnFirebase"), "Nube principal"),
      check("Supabase", exists("BDLConnSupabase"), "Nube secundaria"),
      check("Excel", exists("BDLConnExcel"), "Respaldo portable"),
      check("Google Sheets", exists("BDLConnGoogleSheets"), "Reporte visible"),
      check("Continuity", exists("BDLContinuity"), "Motor automático"),
      check("Manual Events", exists("BDLManualEvents"), "Eventos manuales/críticos"),
      check("Guardian", exists("BDLContGuardian"), "Monitor de continuidad"),
      check("Router", exists("BDLContRouteFallback"), "Ruta de protección")
    ];
  }

  function screenChecks(){
    var screen = currentScreen();
    var list = [];
    if(screen === "BL"){
      list.push(check("Panel estado", exists("BLPanelStatus"), "Semáforo de bases"));
      list.push(check("Panel cierre día", exists("BLPanelCloseDay"), "Excel / respaldo"));
      list.push(check("Panel Sheets", exists("BLPanelSheets"), "Google Sheets"));
      list.push(check("Tabs BL", exists("BLTabs"), "Submenú interno"));
    }else if(screen === "Tabla"){
      list.push(check("TablaApp", exists("TablaApp"), "Pantalla Tabla"));
      list.push(check("Telegram tabla", exists("TablaTelegram") || !!document.getElementById("tabla-telegram-modal"), "Mensajes Telegram"));
      list.push(check("Refresh Tabla", exists("TablaApp.refreshFromBDLocal") || !!document.getElementById("tabla-refresh"), "Actualización desde BL"));
    }else if(screen === "Ficha"){
      list.push(check("FichaApp", exists("FichaApp"), "Pantalla Ficha"));
      list.push(check("FichaCore", exists("FichaCore"), "Lectura de estudiante"));
      list.push(check("Modalidad", exists("FichaModalidad"), "Cambio manual protegido"));
    }else if(screen === "Stats"){
      list.push(check("StatsApp", exists("StatsApp"), "Pantalla Stats"));
      list.push(check("StatsCore", exists("StatsCore"), "Resumen de datos"));
      list.push(check("StatsRules", exists("StatsRules"), "Reglas PVC/Regular"));
    }else if(screen === "Coordi"){
      list.push(check("CoordiApp", exists("CoordiApp"), "Pantalla coordinación"));
      list.push(check("CoordiCore", exists("CoordiCore"), "Priorización"));
    }else if(screen === "Reportes"){
      list.push(check("RepoApp", exists("RepoApp"), "Pantalla reportes"));
      list.push(check("RepoCore", exists("RepoCore"), "Generador de reportes"));
    }else if(screen === "Defensas"){
      list.push(check("DefartCore", exists("DefartCore"), "Notas de defensas"));
      list.push(check("DefartContinuity", exists("DefartContinuity"), "Puente de continuidad"));
      list.push(check("DefartExport", exists("DefartExport"), "Exportación Excel"));
    }
    return list;
  }

  function audit(){
    var modules = moduleChecks();
    var screens = screenChecks();
    var all = modules.concat(screens);
    var errors = all.filter(function(x){ return !x.ok && x.level === "error"; });
    var warnings = all.filter(function(x){ return !x.ok && x.level !== "error"; });
    return {
      ok: errors.length === 0,
      screen: currentScreen(),
      checkedAt: new Date().toISOString(),
      summary: { total:all.length, ok:all.filter(function(x){ return x.ok; }).length, warnings:warnings.length, errors:errors.length },
      modules: modules,
      screenProcesses: screens,
      continuity: window.BDLContinuity && typeof window.BDLContinuity.status === "function" ? window.BDLContinuity.status() : null
    };
  }

  window.BDLConnectionAudit = { audit:audit, currentScreen:currentScreen };
})(window, document);