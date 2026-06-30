(function(window){
  "use strict";

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function key(value){
    return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
  }

  function numeroIdentificacion(row){
    row = row || {};
    return text(row.numeroIdentificacion || row.NumeroIdentificacion || row.cedula || row.Cedula || row.CEDULA || row.identificacion || row.Identificacion || row._docId || row.id).replace(/\s+/g, "") || "SIN_IDENTIFICACION";
  }

  function periodoId(value){
    var raw = text(value);
    return raw ? key(raw) : "SIN_PERIODO";
  }

  function idEstudiantePeriodo(periodo, numero){
    return periodoId(periodo) + "__" + text(numero || "SIN_IDENTIFICACION").replace(/\s+/g, "");
  }

  function id(prefix){
    return key(prefix || "bdl") + "__" + Date.now() + "__" + Math.random().toString(36).slice(2, 10);
  }

  window.BDLKeys = {
    text: text,
    key: key,
    numeroIdentificacion: numeroIdentificacion,
    periodoId: periodoId,
    idEstudiantePeriodo: idEstudiantePeriodo,
    id: id
  };
})(window);
