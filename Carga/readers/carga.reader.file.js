/* =========================================================
Nombre completo: carga.reader.file.js
Ruta: /Carga/readers/carga.reader.file.js
Función:
- Recibir un archivo y enviarlo al lector correcto.
- Soportar XLSX moderno, XLS binario real, XLS viejo tipo HTML,
  CSV, TXT, JSON, HTML y archivos con extensión rara.
- Usar CargaReaderEncoding para evitar caracteres dañados.
========================================================= */
(function(window){
  "use strict";

  function extension(fileName){
    var parts = String(fileName || "").split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  }

  function readTextFallback(file){
    return new Promise(function(resolve, reject){
      if(!file){
        reject(new Error("No se recibió archivo."));
        return;
      }

      var reader = new FileReader();

      reader.onload = function(){
        resolve({
          ok: true,
          text: String(reader.result || ""),
          encoding: "default",
          buffer: null,
          bytes: null,
          binaryType: "",
          isBinary: false,
          isHtml: false,
          isCsvLike: false,
          replacements: 0,
          mojibake: 0,
          confidence: "fallback"
        });
      };

      reader.onerror = function(){
        reject(reader.error || new Error("No se pudo leer el archivo."));
      };

      reader.readAsText(file);
    });
  }

  function readArrayBufferFallback(file){
    return new Promise(function(resolve, reject){
      if(!file){
        reject(new Error("No se recibió archivo."));
        return;
      }

      var reader = new FileReader();

      reader.onload = function(){
        resolve(reader.result);
      };

      reader.onerror = function(){
        reject(reader.error || new Error("No se pudo leer el archivo como bytes."));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  function readSmartText(file){
    if(window.CargaReaderEncoding && typeof window.CargaReaderEncoding.readTextSmart === "function"){
      return window.CargaReaderEncoding.readTextSmart(file);
    }

    return readTextFallback(file);
  }

  function readArrayBuffer(file){
    if(window.CargaReaderEncoding && typeof window.CargaReaderEncoding.readArrayBuffer === "function"){
      return window.CargaReaderEncoding.readArrayBuffer(file);
    }

    return readArrayBufferFallback(file);
  }

  function ensureXLSX(){
    if(window.CargaReaderXLSX && typeof window.CargaReaderXLSX.ensureXLSX === "function"){
      return window.CargaReaderXLSX.ensureXLSX();
    }

    if(window.XLSX){
      return Promise.resolve(window.XLSX);
    }

    return Promise.reject(new Error("La librería XLSX no está disponible."));
  }

  function sheetToRows(XLSX, sheet){
    if(!XLSX || !sheet){
      return [];
    }

    return XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false
    });
  }

  function chooseBestSheet(XLSX, workbook){
    var names = workbook && workbook.SheetNames ? workbook.SheetNames : [];

    if(!names.length){
      return {
        name: "",
        rows: []
      };
    }

    var best = {
      name: names[0],
      rows: sheetToRows(XLSX, workbook.Sheets[names[0]])
    };

    names.forEach(function(name){
      var rows = sheetToRows(XLSX, workbook.Sheets[name]);

      if(rows.length > best.rows.length){
        best = {
          name: name,
          rows: rows
        };
      }
    });

    return best;
  }

  function readWorkbookFromBuffer(file, buffer, origen){
    return ensureXLSX().then(function(XLSX){
      var workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: false,
        raw: false
      });

      var selected = chooseBestSheet(XLSX, workbook);

      return {
        rows: selected.rows,
        fileName: file.name,
        origen: origen || "archivo_excel",
        detectedType: "excel",
        sheetName: selected.name,
        sheetCount: workbook.SheetNames ? workbook.SheetNames.length : 0,
        encoding: "",
        readerMeta: {
          detectedType: "excel",
          encoding: "",
          confidence: "workbook",
          sheetName: selected.name,
          sheetCount: workbook.SheetNames ? workbook.SheetNames.length : 0,
          columnsRemoved: [],
          replacements: 0,
          mojibake: 0,
          rowCount: selected.rows.length
        }
      };
    });
  }

  function parseJsonText(text){
    text = String(text || "").trim();

    if(!text){
      return [];
    }

    try{
      var parsed = JSON.parse(text);

      if(Array.isArray(parsed)){
        return parsed;
      }

      if(parsed && Array.isArray(parsed.rows)){
        return parsed.rows;
      }

      if(parsed && Array.isArray(parsed.estudiantes)){
        return parsed.estudiantes;
      }

      return [parsed];
    }catch(error){
      return [];
    }
  }

  function parseTextRows(text, ext){
    text = String(text || "");

    if(ext === "json"){
      return parseJsonText(text);
    }

    if(ext === "csv"){
      return window.CargaReaderCSV ? window.CargaReaderCSV.parse(text) : [];
    }

    if(window.CargaReaderCSV && (ext === "txt" || ext === "texto" || ext === "")){
      return window.CargaReaderCSV.parse(text);
    }

    if(window.CargaReaderTXT){
      return window.CargaReaderTXT.parse(text);
    }

    return [];
  }

  function buildHtmlResult(file, decoded, origen, detectedType){
    var parsed = null;

    if(window.CargaReaderHTML && typeof window.CargaReaderHTML.parseDetailed === "function"){
      parsed = window.CargaReaderHTML.parseDetailed(decoded.text || "");
    }else if(window.CargaReaderHTML && typeof window.CargaReaderHTML.parse === "function"){
      parsed = {
        rows: window.CargaReaderHTML.parse(decoded.text || ""),
        columnsRemoved: []
      };
    }else{
      parsed = {
        rows: [],
        columnsRemoved: []
      };
    }

    return {
      rows: parsed.rows || [],
      fileName: file.name,
      origen: origen || "html_excel_viejo",
      detectedType: detectedType || "html_excel_viejo",
      encoding: decoded.encoding || "",
      readerMeta: {
        detectedType: detectedType || "html_excel_viejo",
        encoding: decoded.encoding || "",
        confidence: decoded.confidence || "",
        replacements: Number(decoded.replacements || 0),
        mojibake: Number(decoded.mojibake || 0),
        columnsRemoved: parsed.columnsRemoved || [],
        tableIndex: parsed.tableIndex,
        totalTables: parsed.totalTables,
        headerIndex: parsed.headerIndex,
        rowCount: parsed.rows ? parsed.rows.length : 0
      }
    };
  }

  function buildTextResult(file, decoded, ext, origen, detectedType){
    decoded = decoded || {};

    var text = String(decoded.text || "");

    if(window.CargaReaderHTML && window.CargaReaderHTML.looksHtml(text)){
      return buildHtmlResult(file, decoded, origen || "html_excel_viejo", detectedType || "html_excel_viejo");
    }

    var rows = parseTextRows(text, ext);

    return {
      rows: rows,
      fileName: file.name,
      origen: origen || "archivo_texto",
      detectedType: detectedType || ext || "texto",
      encoding: decoded.encoding || "",
      readerMeta: {
        detectedType: detectedType || ext || "texto",
        encoding: decoded.encoding || "",
        confidence: decoded.confidence || "",
        replacements: Number(decoded.replacements || 0),
        mojibake: Number(decoded.mojibake || 0),
        columnsRemoved: [],
        rowCount: rows.length
      }
    };
  }

  function readXLS(file){
    return readSmartText(file).then(function(decoded){
      var binaryType = decoded.binaryType || "";

      if(binaryType === "xls_binario_real" || binaryType === "zip_xlsx"){
        return readWorkbookFromBuffer(file, decoded.buffer, "archivo_excel_binario").catch(function(error){
          throw new Error("No se pudo leer el archivo Excel binario: " + (error && error.message ? error.message : error));
        });
      }

      if(decoded.text && window.CargaReaderHTML && window.CargaReaderHTML.looksHtml(decoded.text)){
        return buildHtmlResult(file, decoded, "html_excel_viejo", "html_excel_viejo");
      }

      if(decoded.buffer){
        return readWorkbookFromBuffer(file, decoded.buffer, "archivo_xls").catch(function(){
          return buildTextResult(file, decoded, "xls", "archivo_xls_texto", "texto");
        });
      }

      return buildTextResult(file, decoded, "xls", "archivo_xls_texto", "texto");
    });
  }

  function readXLSX(file){
    return readArrayBuffer(file).then(function(buffer){
      return readWorkbookFromBuffer(file, buffer, "archivo_xlsx");
    });
  }

  function readTextBased(file, ext){
    return readSmartText(file).then(function(decoded){
      return buildTextResult(file, decoded, ext, "archivo", ext || "texto");
    });
  }

  function read(file){
    if(!file){
      return Promise.reject(new Error("No se recibió archivo."));
    }

    var ext = extension(file.name);

    if(ext === "xlsx"){
      return readXLSX(file);
    }

    if(ext === "xls"){
      return readXLS(file);
    }

    if(ext === "csv" || ext === "txt" || ext === "json" || ext === "html" || ext === "htm"){
      return readTextBased(file, ext);
    }

    return readTextBased(file, ext || "texto");
  }

  window.CargaReaderFile = {
    read: read,
    extension: extension,
    readText: function(file){
      return readSmartText(file).then(function(result){
        return result.text || "";
      });
    },
    readArrayBuffer: readArrayBuffer
  };
})(window);