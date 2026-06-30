/* =========================================================
Nombre completo: conn.interface.js
Ruta: /BDLocal/connections/shared/conn.interface.js
Función:
- Definir la forma mínima que debe cumplir cada conector.
- No conecta con ninguna base real.
========================================================= */
(function(window){
  "use strict";

  function createDefinition(config){
    config = config || {};
    return {
      id: config.id || "",
      name: config.name || "",
      role: config.role || "",
      enabled: config.enabled !== false,
      priority: Number(config.priority || 0),
      capabilities: config.capabilities || [],
      test: typeof config.test === "function" ? config.test : null,
      health: typeof config.health === "function" ? config.health : null,
      upload: typeof config.upload === "function" ? config.upload : null,
      download: typeof config.download === "function" ? config.download : null,
      backup: typeof config.backup === "function" ? config.backup : null,
      restore: typeof config.restore === "function" ? config.restore : null,
      diagnostics: typeof config.diagnostics === "function" ? config.diagnostics : null
    };
  }

  window.BDLConnInterface = { createDefinition: createDefinition };
})(window);
