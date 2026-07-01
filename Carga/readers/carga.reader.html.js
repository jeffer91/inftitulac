/* =========================================================
Nombre completo: carga.reader.html.js
Ruta: /Carga/readers/carga.reader.html.js
Función:
- Leer archivos HTML exportados como Excel viejo.
- Convertir la tabla principal HTML en filas JSON.
- Limpiar columnas vacías, encabezados raros y espacios invisibles.
========================================================= */
(function(window){
  "use strict";

  function cleanSpaces(value){
    return String(value == null ? "" : value)
      .replace(/\u00a0/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function looksHtml(text){
    text = String(text || "").trim().slice(0, 4000).toLowerCase();

    return (
      text.indexOf("<html") >= 0 ||
      text.indexOf("<table") >= 0 ||
      text.indexOf("<tr") >= 0 ||
      text.indexOf("<!doctype") >= 0 ||
      text.indexOf("urn:schemas-microsoft-com:office") >= 0 ||
      text.indexOf("mso-") >= 0
    );
  }

  function removeDiacritics(value){
    try{
      return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }catch(error){
      return String(value || "");
    }
  }

  function key(value){
    return removeDiacritics(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function cellText(cell){
    if(!cell){
      return "";
    }

    return cleanSpaces(cell.textContent || cell.innerText || "");
  }

  function normalizeHeader(value, index){
    value = cleanSpaces(value);

    if(!value){
      return "Column" + (index + 1);
    }

    return value;
  }

  function makeUniqueHeaders(headers){
    var used = Object.create(null);

    return (Array.isArray(headers) ? headers : []).map(function(header, index){
      var clean = normalizeHeader(header, index);
      var base = clean;
      var n = 1;

      while(used[clean]){
        n += 1;
        clean = base + " " + n;
      }

      used[clean] = true;
      return clean;
    });
  }

  function rowFilledCount(row){
    return (Array.isArray(row) ? row : []).filter(function(value){
      return cleanSpaces(value) !== "";
    }).length;
  }

  function headerScore(row){
    row = Array.isArray(row) ? row : [];

    var joined = key(row.join(" "));
    var filled = rowFilledCount(row);
    var score = filled * 10;

    if(joined.indexOf("cedula") >= 0){
      score += 70;
    }

    if(joined.indexOf("identificacion") >= 0){
      score += 70;
    }

    if(joined.indexOf("nombres") >= 0 || joined.indexOf("nombre") >= 0){
      score += 60;
    }

    if(joined.indexOf("carrera") >= 0){
      score += 60;
    }

    if(joined.indexOf("modalidad") >= 0){
      score += 30;
    }

    if(joined.indexOf("correo") >= 0){
      score += 25;
    }

    if(joined.indexOf("aprobacion") >= 0){
      score += 25;
    }

    if(joined.indexOf("vinculacion") >= 0){
      score += 20;
    }

    if(joined.indexOf("practicas") >= 0){
      score += 20;
    }

    return score;
  }

  function detectHeaderIndex(matrix){
    matrix = Array.isArray(matrix) ? matrix : [];

    var max = Math.min(matrix.length, 20);
    var bestIndex = 0;
    var bestScore = -1;

    for(var i = 0; i < max; i += 1){
      var row = matrix[i] || [];
      var filled = rowFilledCount(row);

      if(filled < 2){
        continue;
      }

      var score = headerScore(row);

      if(score > bestScore){
        bestScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  function tableMatrix(table){
    var trs = Array.prototype.slice.call(table.querySelectorAll("tr"));

    return trs.map(function(tr){
      var cells = Array.prototype.slice.call(tr.children);

      return cells.map(function(cell){
        return cellText(cell);
      });
    }).filter(function(row){
      return rowFilledCount(row) > 0;
    });
  }

  function shouldRemoveColumn(header, rows){
    var hasValue = (Array.isArray(rows) ? rows : []).some(function(row){
      return cleanSpaces(row && row[header]) !== "";
    });

    return !hasValue;
  }

  function removeEmptyColumns(rows, headers){
    rows = Array.isArray(rows) ? rows : [];
    headers = Array.isArray(headers) ? headers : [];

    var removed = [];
    var keptHeaders = headers.filter(function(header){
      var remove = shouldRemoveColumn(header, rows);

      if(remove){
        removed.push(header);
        return false;
      }

      return true;
    });

    var cleanedRows = rows.map(function(row){
      var out = {};

      keptHeaders.forEach(function(header){
        out[header] = row[header];
      });

      return out;
    });

    return {
      rows: cleanedRows,
      headers: keptHeaders,
      columnsRemoved: removed
    };
  }

  function tableToRowsDetailed(table){
    var matrix = tableMatrix(table);

    if(!matrix.length){
      return {
        rows: [],
        headers: [],
        columnsRemoved: [],
        headerIndex: 0
      };
    }

    var headerIndex = detectHeaderIndex(matrix);
    var headers = makeUniqueHeaders(matrix[headerIndex] || []);
    var dataRows = matrix.slice(headerIndex + 1);

    var rows = dataRows.map(function(row){
      var obj = {};

      headers.forEach(function(header, index){
        obj[header] = cleanSpaces(row[index] == null ? "" : row[index]);
      });

      return obj;
    }).filter(function(row){
      return Object.keys(row).some(function(field){
        return cleanSpaces(row[field]) !== "";
      });
    });

    var cleaned = removeEmptyColumns(rows, headers);

    return {
      rows: cleaned.rows,
      headers: cleaned.headers,
      columnsRemoved: cleaned.columnsRemoved,
      headerIndex: headerIndex
    };
  }

  function chooseBestTable(tables){
    tables = Array.prototype.slice.call(tables || []);

    if(!tables.length){
      return {
        table: null,
        index: -1
      };
    }

    var best = {
      table: tables[0],
      index: 0,
      score: -1
    };

    tables.forEach(function(table, index){
      var matrix = tableMatrix(table);
      var rows = matrix.length;
      var cols = matrix.reduce(function(max, row){
        return Math.max(max, row.length);
      }, 0);

      var score = rows * Math.max(cols, 1);

      if(score > best.score){
        best = {
          table: table,
          index: index,
          score: score
        };
      }
    });

    return best;
  }

  function parseDetailed(text){
    if(!looksHtml(text)){
      return {
        rows: [],
        headers: [],
        columnsRemoved: [],
        tableIndex: -1,
        totalTables: 0,
        headerIndex: 0
      };
    }

    var parser = new DOMParser();
    var doc = parser.parseFromString(String(text || ""), "text/html");
    var tables = Array.prototype.slice.call(doc.querySelectorAll("table"));

    if(!tables.length){
      return {
        rows: [],
        headers: [],
        columnsRemoved: [],
        tableIndex: -1,
        totalTables: 0,
        headerIndex: 0
      };
    }

    var selected = chooseBestTable(tables);
    var detailed = tableToRowsDetailed(selected.table);

    detailed.tableIndex = selected.index;
    detailed.totalTables = tables.length;

    return detailed;
  }

  function parse(text){
    return parseDetailed(text).rows;
  }

  window.CargaReaderHTML = {
    looksHtml: looksHtml,
    parse: parse,
    parseDetailed: parseDetailed,
    cleanSpaces: cleanSpaces
  };
})(window);