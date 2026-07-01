/* =========================================================
Nombre completo: carga.carreras.guard.js
Ruta: /Carga/seguridad/carga.carreras.guard.js
Función:
- Seguridad contra carreras dañadas, duplicadas o mal decodificadas.
- Detecta textos con �, nombres cortados, tildes rotas y duplicados.
- Corrige automáticamente cuando la coincidencia es alta.
- Marca coincidencias dudosas para revisión.
- Evita que una carrera dañada cree una carrera nueva.
========================================================= */
(function(window){
  "use strict";

  var AUTO_SCORE = 0.86;
  var DOUBTFUL_SCORE = 0.72;

  var CAREER_FIELDS = [
    "nombreCarrera",
    "NombreCarrera",
    "carrera",
    "Carrera",
    "programa",
    "Programa",
    "carreraNormalizada",
    "nombreCarreraOriginal"
  ];

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function safeArray(value){
    return Array.isArray(value) ? value : [];
  }

  function clone(value){
    try{
      return JSON.parse(JSON.stringify(value == null ? null : value));
    }catch(error){
      return value;
    }
  }

  function upper(value){
    return text(value)
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function removeAccents(value){
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function compact(value){
    return removeAccents(value)
      .replace(/\uFFFD/g, "")
      .replace(/�/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "")
      .toLowerCase();
  }

  function normWords(value){
    return removeAccents(value)
      .replace(/\uFFFD/g, " ")
      .replace(/�/g, " ")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function key(value){
    if(window.BDLNormText && typeof window.BDLNormText.key === "function"){
      return window.BDLNormText.key(value);
    }

    return compact(value);
  }

  function hasDamaged(value){
    return /[\uFFFD�]/.test(text(value));
  }

  function hasSuspiciousEncoding(value){
    value = text(value);

    return (
      hasDamaged(value) ||
      /Ã.|Â.|â€|â€™|â€œ|â€/i.test(value)
    );
  }

  function isEmptyCareer(value){
    var v = normWords(value);

    return (
      !v ||
      v === "sin carrera" ||
      v === "sin programa" ||
      v === "null" ||
      v === "undefined" ||
      v === "nan"
    );
  }

  function firstCareerName(row){
    row = row || {};

    for(var i = 0; i < CAREER_FIELDS.length; i += 1){
      var field = CAREER_FIELDS[i];

      if(text(row[field])){
        return text(row[field]);
      }
    }

    return "";
  }

  function firstCareerCode(row){
    row = row || {};

    return text(
      row.codigoCarrera ||
      row.CodigoCarrera ||
      row["CódigoCarrera"] ||
      row.codCarrera ||
      row.CodCarrera ||
      ""
    );
  }

  function setCareerName(row, name, options){
    row = Object.assign({}, row || {});
    options = options || {};

    var clean = upper(name);
    var original = text(options.original || firstCareerName(row));
    var careerKey = key(clean);

    row.nombreCarrera = clean;
    row.NombreCarrera = clean;
    row.carrera = clean;
    row.Carrera = clean;
    row.carreraNormalizada = clean;
    row.nombreCarreraKey = careerKey;
    row.carreraKey = careerKey;

    if(!text(row.nombreCarreraOriginal)){
      row.nombreCarreraOriginal = original || clean;
    }

    return row;
  }

  function bigrams(value){
    value = compact(value);

    if(value.length < 2){
      return value ? [value] : [];
    }

    var out = [];

    for(var i = 0; i < value.length - 1; i += 1){
      out.push(value.slice(i, i + 2));
    }

    return out;
  }

  function dice(a, b){
    var aa = bigrams(a);
    var bb = bigrams(b);

    if(!aa.length || !bb.length){
      return 0;
    }

    var map = {};
    var hits = 0;

    aa.forEach(function(item){
      map[item] = (map[item] || 0) + 1;
    });

    bb.forEach(function(item){
      if(map[item]){
        hits += 1;
        map[item] -= 1;
      }
    });

    return (2 * hits) / (aa.length + bb.length);
  }

  function tokenJaccard(a, b){
    var aw = normWords(a).split(" ").filter(Boolean);
    var bw = normWords(b).split(" ").filter(Boolean);

    if(!aw.length || !bw.length){
      return 0;
    }

    var map = {};
    var union = {};
    var hits = 0;

    aw.forEach(function(w){
      map[w] = true;
      union[w] = true;
    });

    bw.forEach(function(w){
      if(map[w]){
        hits += 1;
      }
      union[w] = true;
    });

    return hits / Object.keys(union).length;
  }

  function containment(a, b){
    var ca = compact(a);
    var cb = compact(b);

    if(!ca || !cb){
      return 0;
    }

    if(ca === cb){
      return 1;
    }

    if(ca.length <= cb.length && cb.indexOf(ca) >= 0){
      return ca.length / cb.length;
    }

    if(cb.length <= ca.length && ca.indexOf(cb) >= 0){
      return cb.length / ca.length;
    }

    return 0;
  }

  function prefixScore(a, b){
    var ca = compact(a);
    var cb = compact(b);

    if(!ca || !cb){
      return 0;
    }

    var min = Math.min(ca.length, cb.length);
    var hit = 0;

    for(var i = 0; i < min; i += 1){
      if(ca.charAt(i) !== cb.charAt(i)){
        break;
      }

      hit += 1;
    }

    return hit / Math.max(ca.length, cb.length);
  }

  function similarity(a, b){
    a = text(a);
    b = text(b);

    if(!a || !b){
      return 0;
    }

    if(compact(a) === compact(b)){
      return 1;
    }

    var d = dice(a, b);
    var j = tokenJaccard(a, b);
    var c = containment(a, b);
    var p = prefixScore(a, b);

    return Math.max(
      d,
      (d * 0.55) + (j * 0.30) + (c * 0.15),
      (p * 0.70) + (j * 0.30),
      c
    );
  }

  function betterCandidateName(a, b){
    a = upper(a);
    b = upper(b);

    if(!a){ return b; }
    if(!b){ return a; }

    var aDamaged = hasSuspiciousEncoding(a);
    var bDamaged = hasSuspiciousEncoding(b);

    if(aDamaged && !bDamaged){ return b; }
    if(bDamaged && !aDamaged){ return a; }

    if(b.length > a.length){ return b; }

    return a;
  }

  function addCandidate(map, name, source, rowIndex){
    name = upper(name);

    if(isEmptyCareer(name)){
      return;
    }

    var candidateKey = key(name);

    if(!candidateKey){
      return;
    }

    if(!map[candidateKey]){
      map[candidateKey] = {
        key: candidateKey,
        name: name,
        source: source || "rows",
        total: 0,
        damaged: false,
        rowIndexes: []
      };
    }

    map[candidateKey].name = betterCandidateName(map[candidateKey].name, name);
    map[candidateKey].total += 1;
    map[candidateKey].damaged = map[candidateKey].damaged || hasSuspiciousEncoding(name);

    if(rowIndex !== undefined && rowIndex !== null){
      map[candidateKey].rowIndexes.push(rowIndex);
    }
  }

  function buildCandidates(rows, options){
    options = options || {};

    var map = {};
    var referencias = safeArray(options.carrerasReferencia);

    referencias.forEach(function(item){
      if(typeof item === "string"){
        addCandidate(map, item, "referencia");
        return;
      }

      item = item || {};
      addCandidate(map, item.nombre || item.NombreCarrera || item.carrera || item.name || item.key, "referencia");
    });

    safeArray(rows).forEach(function(row, index){
      var name = firstCareerName(row);
      var code = firstCareerCode(row);

      if(window.BDLNormCarrera && typeof window.BDLNormCarrera.normalize === "function"){
        try{
          var info = window.BDLNormCarrera.normalize(name, code);

          if(info && info.nombre){
            addCandidate(map, info.nombre, "normalizador", index);
          }
        }catch(error){}
      }

      addCandidate(map, name, "rows", index);
    });

    return Object.keys(map).map(function(k){
      return map[k];
    }).sort(function(a, b){
      if(a.damaged !== b.damaged){
        return a.damaged ? 1 : -1;
      }

      return b.name.length - a.name.length || b.total - a.total;
    });
  }

  function bestMatch(name, candidates){
    var best = null;

    safeArray(candidates).forEach(function(candidate){
      if(!candidate || !candidate.name){
        return;
      }

      var candidateName = candidate.name;

      if(compact(name) === compact(candidateName)){
        return;
      }

      var score = similarity(name, candidateName);

      if(!best || score > best.score){
        best = {
          name: candidateName,
          key: candidate.key,
          score: score,
          source: candidate.source || ""
        };
      }
    });

    return best;
  }

  function shouldAutoCorrect(sourceName, targetName, score){
    if(!sourceName || !targetName){
      return false;
    }

    if(score >= AUTO_SCORE){
      return true;
    }

    if(hasSuspiciousEncoding(sourceName) && score >= 0.78){
      return true;
    }

    if(hasSuspiciousEncoding(sourceName) && containment(sourceName, targetName) >= 0.70){
      return true;
    }

    if(hasSuspiciousEncoding(sourceName) && prefixScore(sourceName, targetName) >= 0.72){
      return true;
    }

    return false;
  }

  function cleanRows(rows, options){
    options = options || {};
    rows = safeArray(rows).map(function(row){
      return Object.assign({}, row || {});
    });

    var candidates = buildCandidates(rows, options);
    var applied = [];
    var doubtful = [];
    var unresolved = [];
    var seen = {};

    var fixedRows = rows.map(function(row, index){
      var currentName = firstCareerName(row);

      if(isEmptyCareer(currentName)){
        return row;
      }

      var currentKey = key(currentName);
      var currentDamaged = hasSuspiciousEncoding(currentName);
      var match = bestMatch(currentName, candidates);

      if(match && shouldAutoCorrect(currentName, match.name, match.score)){
        var newRow = setCareerName(row, match.name, {
          original: currentName
        });

        newRow.carreraGuardStatus = "auto_corregida";
        newRow.carreraGuardScore = Math.round(match.score * 1000) / 1000;

        applied.push({
          row: index + 1,
          from: currentName,
          to: match.name,
          score: newRow.carreraGuardScore,
          reason: currentDamaged ? "caracteres_danados" : "duplicado_alta_similitud"
        });

        seen[currentKey] = match.name;

        return newRow;
      }

      if(match && match.score >= DOUBTFUL_SCORE){
        row.carreraGuardStatus = "dudosa";
        row.carreraGuardScore = Math.round(match.score * 1000) / 1000;
        row.carreraGuardSuggested = match.name;

        doubtful.push({
          row: index + 1,
          from: currentName,
          suggested: match.name,
          score: row.carreraGuardScore
        });

        return row;
      }

      if(currentDamaged){
        row.carreraGuardStatus = "sin_corregir";

        unresolved.push({
          row: index + 1,
          value: currentName,
          reason: "caracteres_danados_sin_coincidencia"
        });
      }

      return row;
    });

    return {
      rows: fixedRows,
      report: {
        ok: unresolved.length === 0,
        applied: applied,
        doubtful: doubtful,
        unresolved: unresolved,
        totalApplied: applied.length,
        totalDoubtful: doubtful.length,
        totalUnresolved: unresolved.length,
        totalCandidates: candidates.length,
        seen: seen,
        createdAt: new Date().toISOString()
      }
    };
  }

  function normalizeCareerName(value){
    return upper(value);
  }

  window.CargaCarrerasGuard = {
    cleanRows: cleanRows,
    normalizeCareerName: normalizeCareerName,
    similarity: similarity,
    key: key,
    compact: compact,
    hasDamaged: hasDamaged,
    hasSuspiciousEncoding: hasSuspiciousEncoding,
    firstCareerName: firstCareerName,
    setCareerName: setCareerName,
    buildCandidates: buildCandidates
  };
})(window);