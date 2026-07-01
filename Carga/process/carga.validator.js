/* =========================================================
Nombre completo: carga.validator.js
Ruta: /Carga/process/carga.validator.js
Función:
- Validar errores graves antes de guardar.
- Bloquear cargas con caracteres dañados por mala codificación.
- Validar seguridad de carreras dañadas o duplicadas.
- Mantener validaciones básicas de período, identificación y carrera.
- Generar advertencias útiles sin impedir cargas correctas.
========================================================= */
(function(window){
  "use strict";

  function safeArray(value){
    return Array.isArray(value) ? value : [];
  }

  function text(value){
    return String(value == null ? "" : value);
  }

  function clean(value){
    return text(value).trim();
  }

  function hasDamagedText(value){
    return text(value).indexOf("\uFFFD") >= 0 || text(value).indexOf("�") >= 0;
  }

  function findDamagedSamples(rows, limit){
    var samples = [];
    limit = Number(limit || 10);

    safeArray(rows).some(function(row, index){
      Object.keys(row || {}).some(function(field){
        var value = row[field];

        if(hasDamagedText(field) || hasDamagedText(value)){
          samples.push({
            row: index + 1,
            field: field,
            value: text(value).slice(0, 140)
          });
        }

        return samples.length >= limit;
      });

      return samples.length >= limit;
    });

    return samples;
  }

  function hasAnyCareer(row){
    row = row || {};

    return !!(
      clean(row.nombreCarrera) ||
      clean(row.NombreCarrera) ||
      clean(row.carrera) ||
      clean(row.Carrera) ||
      clean(row.programa) ||
      clean(row.Programa) ||
      clean(row.nombreCarreraOriginal) ||
      clean(row.carreraNormalizada)
    );
  }

  function getCareerName(row){
    row = row || {};

    return clean(
      row.nombreCarrera ||
      row.NombreCarrera ||
      row.carrera ||
      row.Carrera ||
      row.programa ||
      row.Programa ||
      row.carreraNormalizada ||
      ""
    );
  }

  function getPeriodo(row, normalized){
    if(window.BDLNormPeriodo && typeof window.BDLNormPeriodo.normalize === "function"){
      return window.BDLNormPeriodo.normalize(
        row || {},
        normalized.periodoDetectado && normalized.periodoDetectado.periodoId
      );
    }

    return {
      periodoId: clean(
        row && (
          row.periodoId ||
          row.periodo ||
          row.Periodo ||
          (normalized.periodoDetectado && normalized.periodoDetectado.periodoId)
        )
      ) || "SIN_PERIODO"
    };
  }

  function getNumero(row){
    if(window.BDLNormEstudiante && typeof window.BDLNormEstudiante.numero === "function"){
      return window.BDLNormEstudiante.numero(row || {});
    }

    row = row || {};

    return clean(
      row.numeroIdentificacion ||
      row.identificacion ||
      row.cedula ||
      row.cédula ||
      row.documento ||
      row.id
    );
  }

  function validateCareerGuard(metadata, rows, errors, warnings){
    metadata = metadata || {};
    rows = safeArray(rows);

    var report = metadata.carreraGuardReport || {};

    safeArray(report.applied).forEach(function(item){
      warnings.push({
        row: item.row || 0,
        tipo: "CARRERA_CORREGIDA_AUTOMATICAMENTE",
        mensaje: "La carrera fue corregida automáticamente para evitar duplicados: " + (item.from || "") + " → " + (item.to || ""),
        desde: item.from || "",
        hacia: item.to || "",
        score: item.score || 0
      });
    });

    safeArray(report.doubtful).forEach(function(item){
      warnings.push({
        row: item.row || 0,
        tipo: "CARRERA_POSIBLE_DUPLICADA",
        mensaje: "Posible carrera duplicada. Revise si '" + (item.from || "") + "' debe unirse con '" + (item.suggested || "") + "'.",
        carrera: item.from || "",
        sugerida: item.suggested || "",
        score: item.score || 0
      });
    });

    safeArray(report.unresolved).forEach(function(item){
      errors.push({
        row: item.row || 0,
        tipo: "CARRERA_DANADA_NO_CORREGIDA",
        mensaje: "La carrera contiene caracteres dañados y no se pudo corregir automáticamente: " + (item.value || ""),
        carrera: item.value || ""
      });
    });

    rows.forEach(function(row, index){
      var careerName = getCareerName(row);

      if(careerName && hasDamagedText(careerName)){
        errors.push({
          row: index + 1,
          tipo: "CARRERA_CON_CARACTERES_DANADOS",
          mensaje: "La carrera todavía contiene caracteres dañados después de la seguridad: " + careerName,
          carrera: careerName
        });
      }
    });
  }

  function validateMetadata(metadata, rows, errors, warnings){
    metadata = metadata || {};
    rows = safeArray(rows);

    validateCareerGuard(metadata, rows, errors, warnings);

    var damagedCount = Number(metadata.damagedCharactersMapped || metadata.damagedCharactersOriginal || 0);
    var damagedSamples = findDamagedSamples(rows, 10);

    if(damagedCount > 0 || damagedSamples.length > 0){
      errors.push({
        row: 0,
        tipo: "ENCODING_DANADO",
        mensaje: "El archivo contiene caracteres dañados como �. No se guardó para evitar carreras, requisitos o nombres mal escritos.",
        total: damagedCount || damagedSamples.length,
        muestras: damagedSamples
      });
    }

    if(Number(metadata.replacements || 0) > 0){
      errors.push({
        row: 0,
        tipo: "LECTURA_CON_REEMPLAZOS",
        mensaje: "La lectura del archivo produjo caracteres de reemplazo. El archivo no se guardó porque puede tener tildes o ñ dañadas.",
        total: Number(metadata.replacements || 0)
      });
    }

    if(Number(metadata.mojibake || 0) > 0){
      warnings.push({
        row: 0,
        tipo: "LECTURA_CON_MOJIBAKE",
        mensaje: "Se detectaron posibles textos mal decodificados. La app intentó escoger la mejor codificación automáticamente.",
        total: Number(metadata.mojibake || 0)
      });
    }

    if(metadata.detectedType === "html_excel_viejo" && !metadata.encoding){
      warnings.push({
        row: 0,
        tipo: "ENCODING_NO_IDENTIFICADO",
        mensaje: "El archivo parece ser un Excel HTML viejo, pero no se pudo identificar claramente la codificación."
      });
    }

    safeArray(metadata.columnsRemoved).forEach(function(column){
      warnings.push({
        row: 0,
        tipo: "COLUMNA_VACIA_ELIMINADA",
        mensaje: "Se eliminó una columna vacía del archivo: " + column,
        campo: column
      });
    });

    if(metadata.detectedType === "html_excel_viejo" && metadata.encoding){
      warnings.push({
        row: 0,
        tipo: "EXCEL_HTML_VIEJO",
        mensaje: "Archivo leído como Excel HTML viejo con codificación " + metadata.encoding + ".",
        encoding: metadata.encoding
      });
    }
  }

  function validateRows(normalized, errors, warnings){
    normalized = normalized || {};

    var rows = safeArray(normalized.rowsMapeadas);

    if(!rows.length){
      errors.push({
        row: 0,
        tipo: "SIN_FILAS",
        mensaje: "No se detectaron filas para cargar."
      });

      return;
    }

    rows.forEach(function(row, index){
      row = row || {};

      var periodo = getPeriodo(row, normalized);
      var numero = getNumero(row);

      if(!periodo || periodo.periodoId === "SIN_PERIODO" || !clean(periodo.periodoId)){
        errors.push({
          row: index + 1,
          tipo: "PERIODO_VACIO",
          mensaje: "Registro sin período válido."
        });
      }

      if(!numero || numero === "SIN_IDENTIFICACION"){
        errors.push({
          row: index + 1,
          tipo: "IDENTIFICACION_VACIA",
          mensaje: "Registro sin número de identificación."
        });
      }

      if(!hasAnyCareer(row)){
        warnings.push({
          row: index + 1,
          tipo: "CARRERA_VACIA",
          mensaje: "Registro sin carrera detectada."
        });
      }
    });
  }

  function validate(normalized){
    normalized = normalized || {};

    var rows = safeArray(normalized.rowsMapeadas);
    var metadata = normalized.metadata || {};
    var errors = [];
    var warnings = [];

    validateMetadata(metadata, rows, errors, warnings);
    validateRows(normalized, errors, warnings);

    return {
      ok: errors.length === 0,
      errors: errors,
      warnings: warnings,
      total: rows.length
    };
  }

  window.CargaValidator = {
    validate: validate,
    findDamagedSamples: findDamagedSamples,
    validateCareerGuard: validateCareerGuard
  };
})(window);