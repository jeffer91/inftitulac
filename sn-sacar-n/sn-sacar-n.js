/* =========================================================
Nombre completo: sn-sacar-n.js
Ruta o ubicacion: /Requisitos/sn-sacar-n/sn-sacar-n.js
Modulo: Sacar N
Funcion o funciones:
- Inicializar la pantalla visual completa Sacar N.
- Conectar estado, renderizado y eventos principales.
- Mantener la pantalla lista para cargar estudiantes en el siguiente bloque.
Con que se conecta:
- sn-config.js
- sn-models.js
- sn-state.service.js
- sn-ui-render.service.js
- sn-ui-events.service.js
- sn-sacar-n.html
========================================================= */
(function(window, document){
  "use strict";

  var cfg = window.SNConfig || {};
  var state = window.SNState || {};
  var render = window.SNUIRender || {};
  var events = window.SNUIEvents || {};
  var models = window.SNModels || {};

  function boot(){
    if(render.initStatic){ render.initStatic(); }
    if(events.init){ events.init(); }

    if(state.subscribe && render.render){
      state.subscribe(function(snapshot){
        render.render(snapshot);
      });
    }else if(render.render){
      render.render({});
    }

    if(state.setModulo && cfg.estadosModulo){
      state.setModulo(
        cfg.estadosModulo.listo || "listo",
        "Bloque 3 listo: pantalla visual preparada. Siguiente paso: cargar estudiantes desde BDLocal."
      );
    }

    try{
      window.dispatchEvent(new CustomEvent("sn:boot", {
        detail: {
          bloque: 3,
          at: models.ahora ? models.ahora() : new Date().toISOString()
        }
      }));
    }catch(error){}
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})(window, document);
