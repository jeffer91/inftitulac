(function(window){
  "use strict";

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function cleanSpaces(value){
    return text(value).replace(/\s+/g, " ").trim();
  }

  function noAccents(value){
    return cleanSpaces(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function key(value){
    return noAccents(value).replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
  }

  function searchKey(value){
    return noAccents(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function upper(value){
    return cleanSpaces(value).toUpperCase();
  }

  function lower(value){
    return cleanSpaces(value).toLowerCase();
  }

  function number(value){
    var raw = text(value).replace(",", ".");
    var n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function first(row, names){
    row = row || {};
    for(var i = 0; i < names.length; i += 1){
      if(row[names[i]] != null && text(row[names[i]]) !== ""){
        return row[names[i]];
      }
    }
    return "";
  }

  window.BDLNormText = {
    text: text,
    cleanSpaces: cleanSpaces,
    noAccents: noAccents,
    key: key,
    searchKey: searchKey,
    upper: upper,
    lower: lower,
    number: number,
    first: first
  };
})(window);
