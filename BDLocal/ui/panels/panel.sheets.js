/* =========================================================
Nombre completo: panel.sheets.js
Ruta: /BDLocal/ui/panels/panel.sheets.js
Función:
- Conectar botones de Google Sheets en BL.
========================================================= */
(function(window, document){
  "use strict";

  function $(id){ return document.getElementById(id); }
  function json(value){ try{ return JSON.stringify(value, null, 2); }catch(error){ return String(value); } }
  function out(value){ var box = $("blSheetsOutput"); if(box){ box.textContent = typeof value === "string" ? value : json(value); } }

  function preview(){
    out("Generando vista previa de reporte...");
    if(!window.BDLConnGoogleSheets || typeof window.BDLConnGoogleSheets.preview !== "function"){
      out({ ok:false, error:"Google Sheets no disponible." });
      return;
    }
    window.BDLConnGoogleSheets.preview().then(out).catch(function(error){ out({ ok:false, error:error && error.message ? error.message : String(error) }); });
  }

  function send(){
    out("Enviando reporte a Google Sheets...");
    if(!window.BDLConnGoogleSheets || typeof window.BDLConnGoogleSheets.sendReport !== "function"){
      out({ ok:false, error:"Google Sheets no disponible." });
      return;
    }
    window.BDLConnGoogleSheets.sendReport().then(function(result){
      out(result);
      if(window.BLToast){ window.BLToast.show("Google Sheets", result && result.ok ? "Reporte enviado." : "Reporte preparado, pero falta configuración."); }
    }).catch(function(error){ out({ ok:false, error:error && error.message ? error.message : String(error) }); });
  }

  function bind(){
    var p = $("blBtnSheetsPreview");
    var s = $("blBtnSheetsSend");
    if(p){ p.addEventListener("click", preview); }
    if(s){ s.addEventListener("click", send); }
  }

  window.BLPanelSheets = { bind: bind, preview: preview, send: send };
})(window, document);
