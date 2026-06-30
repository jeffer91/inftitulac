/* =========================================================
Nombre completo: panel.close-day.js
Ruta: /BDLocal/ui/panels/panel.close-day.js
Función:
- Conectar botones de Excel/cierre del día en BL.
========================================================= */
(function(window, document){
  "use strict";

  function $(id){ return document.getElementById(id); }
  function json(value){ try{ return JSON.stringify(value, null, 2); }catch(error){ return String(value); } }
  function out(value){ var box = $("blCloseDayOutput"); if(box){ box.textContent = typeof value === "string" ? value : json(value); } }

  function runCloseDay(){
    out("Generando cierre del día...");
    if(!window.BDLConnExcel || typeof window.BDLConnExcel.closeDay !== "function"){
      out({ ok:false, error:"Excel/cierre del día no disponible." });
      return;
    }
    window.BDLConnExcel.closeDay().then(function(result){
      out(result);
      if(window.BLToast){ window.BLToast.show("Cierre del día", "Respaldo generado correctamente."); }
    }).catch(function(error){
      out({ ok:false, error:error && error.message ? error.message : String(error) });
    });
  }

  function runJsonBackup(){
    out("Generando respaldo JSON...");
    if(!window.BDLConnExcel || typeof window.BDLConnExcel.backup !== "function"){
      out({ ok:false, error:"Respaldo Excel no disponible." });
      return;
    }
    window.BDLConnExcel.backup().then(out).catch(function(error){ out({ ok:false, error:error && error.message ? error.message : String(error) }); });
  }

  function runCriticalCsv(){
    out("Generando CSV crítico...");
    if(!window.BDLConnExcel || typeof window.BDLConnExcel.backupCriticalCsv !== "function"){
      out({ ok:false, error:"CSV crítico no disponible." });
      return;
    }
    window.BDLConnExcel.backupCriticalCsv().then(out).catch(function(error){ out({ ok:false, error:error && error.message ? error.message : String(error) }); });
  }

  function bind(){
    var close = $("blBtnCloseDay");
    var jsonBtn = $("blBtnBackupJson");
    var csvBtn = $("blBtnBackupCriticalCsv");
    if(close){ close.addEventListener("click", runCloseDay); }
    if(jsonBtn){ jsonBtn.addEventListener("click", runJsonBackup); }
    if(csvBtn){ csvBtn.addEventListener("click", runCriticalCsv); }
  }

  window.BLPanelCloseDay = { bind: bind, runCloseDay: runCloseDay };
})(window, document);
