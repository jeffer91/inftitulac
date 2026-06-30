/* =========================================================
Nombre completo: panel.sheets.js
Ruta: /BDLocal/ui/panels/panel.sheets.js
Función:
- Conectar botones de Google Sheets en BL.
- Mostrar cola incremental, vista previa y envío manual por lotes.
========================================================= */
(function(window, document){
  "use strict";

  function $(id){ return document.getElementById(id); }
  function json(value){ try{ return JSON.stringify(value, null, 2); }catch(error){ return String(value); } }
  function out(value){ var box = $("blSheetsOutput"); if(box){ box.textContent = typeof value === "string" ? value : json(value); } }

  function conn(){ return window.BDLConnGoogleSheets; }

  function preview(){
    out("Generando vista previa y estado de cola...");
    if(!conn() || typeof conn().preview !== "function"){
      out({ ok:false, error:"Google Sheets no disponible." });
      return;
    }
    conn().preview().then(out).catch(function(error){ out({ ok:false, error:error && error.message ? error.message : String(error) }); });
  }

  function send(){
    out("Encolando reporte y enviando un lote pequeño a Google Sheets...");
    if(!conn() || typeof conn().sendReport !== "function"){
      out({ ok:false, error:"Google Sheets no disponible." });
      return;
    }
    conn().sendReport().then(function(result){
      out(result);
      if(window.BLToast){ window.BLToast.show("Google Sheets", result && result.ok ? "Lote enviado." : "Reporte encolado o pendiente de configuración."); }
    }).catch(function(error){ out({ ok:false, error:error && error.message ? error.message : String(error) }); });
  }

  function sendPending(){
    out("Enviando pendientes de Google Sheets poquito a poquito...");
    if(!conn() || typeof conn().sendPending !== "function"){
      out({ ok:false, error:"Google Sheets incremental no disponible." });
      return;
    }
    conn().sendPending(25).then(out).catch(function(error){ out({ ok:false, error:error && error.message ? error.message : String(error) }); });
  }

  function status(){
    if(!conn() || typeof conn().queueStatus !== "function"){
      out({ ok:false, error:"Estado de cola Google Sheets no disponible." });
      return;
    }
    conn().queueStatus().then(out).catch(function(error){ out({ ok:false, error:error && error.message ? error.message : String(error) }); });
  }

  function clearSent(){
    if(window.BDLGoogleSheetsQueue && typeof window.BDLGoogleSheetsQueue.clearSent === "function"){
      out({ ok:true, cleared:"sent", queue:window.BDLGoogleSheetsQueue.clearSent() });
      return;
    }
    out({ ok:false, error:"Cola Google Sheets no disponible." });
  }

  function bind(){
    var p = $("blBtnSheetsPreview");
    var s = $("blBtnSheetsSend");
    var sp = $("blBtnSheetsSendPending");
    var st = $("blBtnSheetsStatus");
    var cs = $("blBtnSheetsClearSent");
    if(p){ p.addEventListener("click", preview); }
    if(s){ s.addEventListener("click", send); }
    if(sp){ sp.addEventListener("click", sendPending); }
    if(st){ st.addEventListener("click", status); }
    if(cs){ cs.addEventListener("click", clearSent); }
  }

  window.addEventListener("googleSheets:queue-changed", function(){
    var box = $("blSheetsQueueMini");
    if(box && window.BDLGoogleSheetsQueue){
      var c = window.BDLGoogleSheetsQueue.counts();
      box.textContent = "Pendientes: " + (c.pending || 0) + " · Errores: " + (c.error || 0) + " · Enviados: " + (c.sent || 0);
    }
  });

  window.BLPanelSheets = { bind: bind, preview: preview, send: send, sendPending: sendPending, status: status };
})(window, document);