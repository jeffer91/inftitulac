/* =========================================================
Nombre completo: cont.alert.throttle.js
Ruta: /BDLocal/continuity/alerts/cont.alert.throttle.js
Función:
- Evitar que la app muestre demasiados avisos repetidos.
========================================================= */
(function(window){
  "use strict";

  var last = {};

  function canShow(key, ms){
    key = key || "general";
    ms = Number(ms || 60000);
    var now = Date.now();
    if(!last[key] || now - last[key] > ms){ last[key] = now; return true; }
    return false;
  }

  window.BDLContAlertThrottle = { canShow:canShow };
})(window);
