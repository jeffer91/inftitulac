/* =========================================================
Nombre completo: gs.export-report.js
Ruta: /BDLocal/connections/google-sheets/gs.export-report.js
Función:
- Preparar reporte visible para Google Sheets.
- Encolar reportes y eventos para envío incremental lento.
- Permitir envío manual de pendientes por lotes pequeños.
========================================================= */
(function(window){
  "use strict";

  function rows(){
    if(!window.BDLGoogleSheetsMapper){ return []; }
    return window.BDLGoogleSheetsMapper.summaryRows();
  }

  function queueCounts(){
    return window.BDLGoogleSheetsQueue && window.BDLGoogleSheetsQueue.counts ? window.BDLGoogleSheetsQueue.counts() : {};
  }

  function enqueueRows(data){
    data = Array.isArray(data) ? data : [];
    if(!window.BDLGoogleSheetsQueue){ return { ok:false, error:"Cola Google Sheets no disponible", enqueued:0 }; }
    data.forEach(function(row){ window.BDLGoogleSheetsQueue.enqueue(row); });
    return { ok:true, enqueued:data.length, queue:queueCounts() };
  }

  function sendReport(){
    var data = rows();
    var queued = enqueueRows(data);
    if(!queued.ok){ return Promise.resolve(queued); }
    if(!window.BDLGoogleSheetsIncremental || typeof window.BDLGoogleSheetsIncremental.flush !== "function"){
      return Promise.resolve({ ok:false, queued:true, enqueued:data.length, reason:"incremental_no_disponible", queue:queueCounts(), data:data });
    }
    return window.BDLGoogleSheetsIncremental.flush({ limit:25, force:false }).then(function(result){
      return Object.assign({ queued:true, enqueued:data.length }, result || {}, { queue:queueCounts() });
    });
  }

  function sendPending(limit){
    if(!window.BDLGoogleSheetsIncremental || typeof window.BDLGoogleSheetsIncremental.flush !== "function"){
      return Promise.resolve({ ok:false, reason:"incremental_no_disponible", queue:queueCounts() });
    }
    return window.BDLGoogleSheetsIncremental.flush({ limit:limit || 25, force:false });
  }

  function preview(){
    return Promise.resolve({ ok:true, rows:rows(), queue:queueCounts(), incremental: window.BDLGoogleSheetsIncremental && window.BDLGoogleSheetsIncremental.status ? window.BDLGoogleSheetsIncremental.status() : null });
  }

  window.BDLGoogleSheetsExportReport = {
    rows: rows,
    enqueueRows: enqueueRows,
    sendReport: sendReport,
    sendPending: sendPending,
    preview: preview
  };
})(window);