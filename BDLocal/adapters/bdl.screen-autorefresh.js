(function(window, document){
  "use strict";

  if(window.__BDL_SCREEN_AUTOREFRESH_DONE__){ return; }
  window.__BDL_SCREEN_AUTOREFRESH_DONE__ = true;

  var timer = null;
  var lastRun = 0;

  function clickIfExists(id){
    var btn = document.getElementById(id);
    if(!btn || btn.disabled){ return false; }
    try{ btn.click(); return true; }catch(error){ return false; }
  }

  function callIf(fn){
    try{ if(typeof fn === "function"){ fn(); return true; } }catch(error){ console.warn("[BDL AutoRefresh] No se pudo refrescar pantalla", error); }
    return false;
  }

  function refreshScreen(reason){
    var now = Date.now();
    if(now - lastRun < 250){ return; }
    lastRun = now;

    var refreshed = false;
    refreshed = callIf(window.TablaApp && window.TablaApp.render) || refreshed;
    refreshed = callIf(window.FichaApp && function(){ window.FichaApp.render("bdlocal-refresh"); }) || refreshed;

    refreshed = clickIfExists("stats-refresh") || refreshed;
    refreshed = clickIfExists("coordi-refresh") || refreshed;
    refreshed = clickIfExists("repo-refresh") || refreshed;
    refreshed = clickIfExists("def-btn-refresh") || refreshed;
    refreshed = clickIfExists("bdlBtnRefresh") || refreshed;

    try{
      window.dispatchEvent(new CustomEvent("requisitos:pantalla-refrescada", { detail:{ reason:reason || "bdlocal", refreshed:refreshed, at:new Date().toISOString() } }));
    }catch(error){}
  }

  function schedule(reason){
    if(timer){ clearTimeout(timer); }
    timer = setTimeout(function(){ timer = null; refreshScreen(reason); }, 180);
  }

  window.addEventListener("bdlocal:legacy-ready", function(){ schedule("bdlocal:legacy-ready"); });
  window.addEventListener("bdlocal:legacy-snapshot", function(){ schedule("bdlocal:legacy-snapshot"); });
  window.addEventListener("requisitos:bl:snapshot-changed", function(){ schedule("snapshot-changed"); });
  window.addEventListener("storage", function(event){
    if(event && (event.key === "REQ_BDLOCAL_LEGACY_SNAPSHOT_V1" || event.key === "REQ_EXCEL_LOCAL_V1:snapshot" || event.key === "REQ_BL_SIGNAL_V1")){
      schedule("storage:" + event.key);
    }
  });

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ schedule("dom-ready"); });
  }else{
    schedule("loaded");
  }
})(window, document);
