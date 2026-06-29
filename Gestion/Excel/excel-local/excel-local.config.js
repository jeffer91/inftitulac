/* =========================================================
Nombre completo: excel-local.config.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-local/excel-local.config.js
Función o funciones:
- Configurar el módulo Excel Local.
- Declarar que BL2/IndexedDB es la base principal.
- Mantener claves antiguas solo como compatibilidad liviana.
========================================================= */
(function(window){
  "use strict";

  var KEY_PREFIX = "REQ_EXCEL_LOCAL_V1";
  var config = {
    appName:"Requisitos",
    moduleName:"ExcelLocal",
    version:"1.1.0-bl2-primary",
    storagePrimary:"BL2_INDEXEDDB",
    legacySnapshotMode:"marker_only",
    keys:{
      snapshot:KEY_PREFIX + ":snapshot",
      marker:KEY_PREFIX + ":bl2Marker",
      meta:KEY_PREFIX + ":meta",
      queue:KEY_PREFIX + ":queue",
      updatedAt:KEY_PREFIX + ":updatedAt",
      status:KEY_PREFIX + ":storageStatus"
    },
    collections:{periods:"periods",students:"students",history:"history",diagnostics:"diagnostics"},
    limits:{localStorageStudentsPreview:300,historyPreview:50,diagnosticsPreview:20,bulkChunkSize:500},
    rules:{writeFullSnapshotToLocalStorage:false,writeMarkerToLocalStorage:true,copyImportsToBL2:true,enqueueFirebaseChanges:true,mirrorLegacyCollections:false}
  };

  window.ExcelLocalConfig = config;
})(window);
