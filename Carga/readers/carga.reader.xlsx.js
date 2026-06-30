(function(window){
  "use strict";

  function readArrayBuffer(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(){ resolve(reader.result); };
      reader.onerror = function(){ reject(reader.error || new Error("No se pudo leer XLSX.")); };
      reader.readAsArrayBuffer(file);
    });
  }

  function read(file){
    if(!window.XLSX){ return Promise.reject(new Error("Librería XLSX no disponible.")); }
    return readArrayBuffer(file).then(function(buffer){
      var workbook = window.XLSX.read(buffer, { type: "array" });
      var firstSheet = workbook.SheetNames[0];
      var sheet = workbook.Sheets[firstSheet];
      var rows = window.XLSX.utils.sheet_to_json(sheet, { defval: "" });
      return { rows: rows, fileName: file.name, origen: "archivo", sheetName: firstSheet };
    });
  }

  window.CargaReaderXLSX = { read: read };
})(window);
