/* =========================================================
Nombre completo: gs.export-report.js
Ruta: /BDLocal/connections/google-sheets/gs.export-report.js
Función:
- Preparar reporte visible para Google Sheets.
- Puede enviar a Apps Script si se configura webAppUrl.
========================================================= */
(function(window){
  "use strict";

  function rows(){
    if(!window.BDLGoogleSheetsMapper){ return []; }
    return window.BDLGoogleSheetsMapper.summaryRows();
  }

  function sendReport(){
    var data = rows();
    var url = window.BDLGoogleSheetsConfig ? window.BDLGoogleSheetsConfig.webAppUrl() : "";
    if(!url){
      return Promise.resolve({ ok:false, skipped:true, reason:"google_sheets_no_configurado", rows:data.length, data:data });
    }
    return fetch(url, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ source:"Requisitos BL", createdAt:new Date().toISOString(), rows:data })
    }).then(function(res){
      return res.text().then(function(text){
        if(!res.ok){ throw new Error(text || ("Google Sheets error " + res.status)); }
        return { ok:true, rows:data.length, response:text };
      });
    });
  }

  function preview(){
    return Promise.resolve({ ok:true, rows:rows() });
  }

  window.BDLGoogleSheetsExportReport = {
    rows: rows,
    sendReport: sendReport,
    preview: preview
  };
})(window);
