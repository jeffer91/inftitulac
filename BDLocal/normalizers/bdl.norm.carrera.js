/* =========================================================
Nombre completo: bdl.norm.carrera.js
Ruta: /BDLocal/normalizers/bdl.norm.carrera.js
Función:
- Normalizar nombres de carreras que llegan desde Excel, HTML viejo o BDLocal.
- Corregir carreras con tildes rotas, caracteres dañados, nombres cortados o duplicados.
- Evitar duplicados como:
  SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES
  vs
  SEGURIDAD Y PREVENCI�N DE RIESGOS LABORA...
- Entregar una clave estable para Carga, Defensas, Ficha, Stats, Reportes y Divisiones.
========================================================= */
(function(window){
  "use strict";

  var T = window.BDLNormText;

  if(!T){
    throw new Error("BDLNormText debe cargarse antes de BDLNormCarrera.");
  }

  var OFICIALES = [
    "ESTÉTICA INTEGRAL",
    "MECÁNICA AUTOMOTRIZ",
    "PROCESAMIENTO EN ALIMENTOS",
    "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO ONLINE",
    "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES",
    "UNIVERSITARIA EN ADMINISTRACIÓN DE EMPRESAS",
    "UNIVERSITARIA EN ADMINISTRACIÓN DE TALENTO HUMANO",
    "UNIVERSITARIA EN CONTABILIDAD Y TRIBUTARIA",
    "UNIVERSITARIA EN EDUCACIÓN INICIAL ONLINE",
    "UNIVERSITARIA EN MARKETING DIGITAL ONLINE",
    "UNIVERSITARIA EN PEDAGOGÍA",
    "UNIVERSITARIA EN REDES Y TELECOMUNICACIONES ONLINE",
    "VENTAS ONLINE"
  ];

  var DIRECT = {
    "ESTETICA INTEGRAL": "ESTÉTICA INTEGRAL",
    "ESTÉTICA INTEGRAL": "ESTÉTICA INTEGRAL",

    "MECANICA AUTOMOTRIZ": "MECÁNICA AUTOMOTRIZ",
    "MECÁNICA AUTOMOTRIZ": "MECÁNICA AUTOMOTRIZ",

    "PROCESAMIENTO EN ALIMENTOS": "PROCESAMIENTO EN ALIMENTOS",
    "PROCESAMIENTO EN ALIMENTO": "PROCESAMIENTO EN ALIMENTOS",

    "SEGURIDAD CIUDADANA Y ORDEN PUBLICO ONLINE": "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO ONLINE",
    "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO ONLINE": "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO ONLINE",
    "SEGURIDAD CIUDADANA Y ORDEN P LICO ONLINE": "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO ONLINE",
    "SEGURIDAD CIUDADANA Y ORDEN PLICO ONLINE": "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO ONLINE",
    "SEGURIDAD CIUDADANA Y ORDEN PLICO ONLI": "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO ONLINE",
    "SEGURIDAD CIUDADANA Y ORDEN PUBLICO ONLI": "SEGURIDAD CIUDADANA Y ORDEN PÚBLICO ONLINE",

    "SEGURIDAD Y PREVENCION DE RIESGOS LABORALES": "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES",
    "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES": "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES",
    "SEGURIDAD Y PREVENCI N DE RIESGOS LABORALES": "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES",
    "SEGURIDAD Y PREVENCI DE RIESGOS LABORALES": "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES",
    "SEGURIDAD Y PREVENCIN DE RIESGOS LABORALES": "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES",
    "SEGURIDAD Y PREVENCION DE RIESGOS LABORA": "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES",
    "SEGURIDAD Y PREVENCI N DE RIESGOS LABORA": "SEGURIDAD Y PREVENCIÓN DE RIESGOS LABORALES",

    "ADMINISTRACION DE EMPRESAS": "UNIVERSITARIA EN ADMINISTRACIÓN DE EMPRESAS",
    "UNIVERSITARIA EN ADMINISTRACION DE EMPRESAS": "UNIVERSITARIA EN ADMINISTRACIÓN DE EMPRESAS",
    "UNIVERSITARIA EN ADMINISTRACIÓN DE EMPRESAS": "UNIVERSITARIA EN ADMINISTRACIÓN DE EMPRESAS",

    "ADMINISTRACION DE TALENTO HUMANO": "UNIVERSITARIA EN ADMINISTRACIÓN DE TALENTO HUMANO",
    "UNIVERSITARIA EN ADMINISTRACION DE TALENTO HUMANO": "UNIVERSITARIA EN ADMINISTRACIÓN DE TALENTO HUMANO",
    "UNIVERSITARIA EN ADMINISTRACIÓN DE TALENTO HUMANO": "UNIVERSITARIA EN ADMINISTRACIÓN DE TALENTO HUMANO",

    "CONTABILIDAD Y TRIBUTARIA": "UNIVERSITARIA EN CONTABILIDAD Y TRIBUTARIA",
    "UNIVERSITARIA EN CONTABILIDAD Y TRIBUTARIA": "UNIVERSITARIA EN CONTABILIDAD Y TRIBUTARIA",

    "EDUACION INICIAL ONLINE": "UNIVERSITARIA EN EDUCACIÓN INICIAL ONLINE",
    "EDUCACION INICIAL ONLINE": "UNIVERSITARIA EN EDUCACIÓN INICIAL ONLINE",
    "EDUACIÓN INICIAL ONLINE": "UNIVERSITARIA EN EDUCACIÓN INICIAL ONLINE",
    "UNIVERSITARIA EN EDUACION INICIAL ONLINE": "UNIVERSITARIA EN EDUCACIÓN INICIAL ONLINE",
    "UNIVERSITARIA EN EDUCACION INICIAL ONLINE": "UNIVERSITARIA EN EDUCACIÓN INICIAL ONLINE",
    "UNIVERSITARIA EN EDUCACIÓN INICIAL ONLINE": "UNIVERSITARIA EN EDUCACIÓN INICIAL ONLINE",

    "MARKETING DIGITAL ONLINE": "UNIVERSITARIA EN MARKETING DIGITAL ONLINE",
    "UNIVERSITARIA EN MARKETING DIGITAL ONLINE": "UNIVERSITARIA EN MARKETING DIGITAL ONLINE",
    "UNIVERSITARIA EN MARKETING DIGITAL ONLI": "UNIVERSITARIA EN MARKETING DIGITAL ONLINE",

    "PEDAGOGIA": "UNIVERSITARIA EN PEDAGOGÍA",
    "PEDAGOGÍA": "UNIVERSITARIA EN PEDAGOGÍA",
    "UNIVERSITARIA EN PEDAGOGIA": "UNIVERSITARIA EN PEDAGOGÍA",
    "UNIVERSITARIA EN PEDAGOGÍA": "UNIVERSITARIA EN PEDAGOGÍA",
    "UNIVERSITARIA EN PEDAGOG": "UNIVERSITARIA EN PEDAGOGÍA",
    "UNIVERSITARIA EN PEDAGOG A": "UNIVERSITARIA EN PEDAGOGÍA",

    "REDES Y TELECOMUNICACIONES ONLINE": "UNIVERSITARIA EN REDES Y TELECOMUNICACIONES ONLINE",
    "UNIVERSITARIA EN REDES Y TELECOMUNICACIONES ONLINE": "UNIVERSITARIA EN REDES Y TELECOMUNICACIONES ONLINE",
    "UNIVERSITARIA EN REDES Y TELECOMUNICACIONE ONLINE": "UNIVERSITARIA EN REDES Y TELECOMUNICACIONES ONLINE",
    "UNIVERSITARIA EN REDES Y TELECOMUNICACION": "UNIVERSITARIA EN REDES Y TELECOMUNICACIONES ONLINE",

    "VENTAS ONLINE": "VENTAS ONLINE",
    "VENTAS ONLI": "VENTAS ONLINE"
  };

  function rawText(value){
    return String(value == null ? "" : value).trim();
  }

  function cleanSpaces(value){
    return rawText(value)
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function upper(value){
    return cleanSpaces(value).toUpperCase();
  }

  function removeAccents(value){
    return cleanSpaces(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function hasSuspicious(value){
    value = rawText(value);

    return (
      value.indexOf("\uFFFD") >= 0 ||
      value.indexOf("�") >= 0 ||
      /Ã.|Â.|â€|â€™|â€œ|â€/i.test(value)
    );
  }

  function basicClean(value){
    var out = upper(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\uFFFD/g, " ")
      .replace(/�/g, " ")
      .replace(/Ã|Ã�/g, "Á")
      .replace(/Ã‰/g, "É")
      .replace(/Ã/g, "Í")
      .replace(/Ã“/g, "Ó")
      .replace(/Ãš/g, "Ú")
      .replace(/Ã‘/g, "Ñ")
      .replace(/Ã¡/g, "Á")
      .replace(/Ã©/g, "É")
      .replace(/Ã­/g, "Í")
      .replace(/Ã³/g, "Ó")
      .replace(/Ãº/g, "Ú")
      .replace(/Ã±/g, "Ñ")
      .replace(/\.{2,}/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    out = out.replace(/EDUACI[ÓO]N/g, "EDUCACIÓN");
    out = out.replace(/EDUCACION/g, "EDUCACIÓN");
    out = out.replace(/ADMINISTRACION/g, "ADMINISTRACIÓN");
    out = out.replace(/MECANICA/g, "MECÁNICA");
    out = out.replace(/ESTETICA/g, "ESTÉTICA");
    out = out.replace(/PUBLICO/g, "PÚBLICO");
    out = out.replace(/PREVENCION/g, "PREVENCIÓN");
    out = out.replace(/PEDAGOGIA/g, "PEDAGOGÍA");

    out = out.replace(/P\s+LICO/g, "PÚBLICO");
    out = out.replace(/P\s*BLICO/g, "PÚBLICO");
    out = out.replace(/P\s*LICO/g, "PÚBLICO");

    out = out.replace(/PREVENCI\s+N/g, "PREVENCIÓN");
    out = out.replace(/PREVENCI\s+DE/g, "PREVENCIÓN DE");
    out = out.replace(/PREVENCIN/g, "PREVENCIÓN");

    out = out.replace(/PEDAGOG\s+A/g, "PEDAGOGÍA");
    out = out.replace(/\bPEDAGOG\b/g, "PEDAGOGÍA");

    out = out.replace(/TELECOMUNICACIONES\s+ON\s+LINE/g, "TELECOMUNICACIONES ONLINE");
    out = out.replace(/\bON LINE\b/g, "ONLINE");
    out = out.replace(/\bONLI\b/g, "ONLINE");
    out = out.replace(/\bONLIN\b/g, "ONLINE");

    return out.replace(/\s+/g, " ").trim();
  }

  function clean(value){
    return basicClean(value);
  }

  function compact(value){
    return removeAccents(clean(value))
      .replace(/\uFFFD/g, "")
      .replace(/�/g, "")
      .replace(/[^A-Z0-9]+/gi, "")
      .toUpperCase();
  }

  function keyRaw(value){
    var c = compact(value);

    if(!c){
      return "";
    }

    return c.toLowerCase();
  }

  function words(value){
    return removeAccents(clean(value))
      .replace(/\uFFFD/g, " ")
      .replace(/�/g, " ")
      .replace(/[^A-Z0-9]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase()
      .split(" ")
      .filter(Boolean);
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

  function tokenScore(a, b){
    var aw = words(a);
    var bw = words(b);

    if(!aw.length || !bw.length){
      return 0;
    }

    var map = {};
    var union = {};
    var hits = 0;

    aw.forEach(function(word){
      map[word] = true;
      union[word] = true;
    });

    bw.forEach(function(word){
      if(map[word]){
        hits += 1;
      }
      union[word] = true;
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

    if(cb.indexOf(ca) >= 0){
      return ca.length / cb.length;
    }

    if(ca.indexOf(cb) >= 0){
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
    var hits = 0;

    for(var i = 0; i < min; i += 1){
      if(ca.charAt(i) !== cb.charAt(i)){
        break;
      }

      hits += 1;
    }

    return hits / Math.max(ca.length, cb.length);
  }

  function similarity(a, b){
    if(!rawText(a) || !rawText(b)){
      return 0;
    }

    if(compact(a) === compact(b)){
      return 1;
    }

    var d = dice(a, b);
    var t = tokenScore(a, b);
    var c = containment(a, b);
    var p = prefixScore(a, b);

    return Math.max(
      d,
      c,
      (d * 0.55) + (t * 0.30) + (c * 0.15),
      (p * 0.70) + (t * 0.30)
    );
  }

  function directMatch(value){
    var cleaned = clean(value);
    var noAccents = removeAccents(cleaned).toUpperCase();
    var compacted = compact(cleaned);

    if(DIRECT[cleaned]){
      return DIRECT[cleaned];
    }

    if(DIRECT[noAccents]){
      return DIRECT[noAccents];
    }

    var keys = Object.keys(DIRECT);

    for(var i = 0; i < keys.length; i += 1){
      if(compact(keys[i]) === compacted){
        return DIRECT[keys[i]];
      }
    }

    return "";
  }

  function nearest(value){
    var cleaned = clean(value);
    var direct = directMatch(cleaned);

    if(direct){
      return {
        name: direct,
        score: 1,
        reason: "direct"
      };
    }

    var best = {
      name: "",
      score: 0,
      reason: ""
    };

    OFICIALES.forEach(function(name){
      var score = similarity(cleaned, name);

      if(score > best.score){
        best = {
          name: name,
          score: score,
          reason: "similarity"
        };
      }
    });

    if(best.score >= 0.84){
      return best;
    }

    if(hasSuspicious(value) && best.score >= 0.68){
      best.reason = "damaged_similarity";
      return best;
    }

    if(hasSuspicious(value) && containment(value, best.name) >= 0.62){
      best.reason = "damaged_containment";
      return best;
    }

    if(hasSuspicious(value) && prefixScore(value, best.name) >= 0.62){
      best.reason = "damaged_prefix";
      return best;
    }

    return {
      name: "",
      score: best.score,
      reason: "no_match"
    };
  }

  function modalidad(nombre){
    return clean(nombre).indexOf("ONLINE") >= 0 ? "ONLINE" : "PRESENCIAL";
  }

  function normalize(value, codigo){
    var original = T.cleanSpaces(value || "");
    var cleaned = clean(original);
    var nearestResult = nearest(cleaned);
    var oficial = nearestResult.name || cleaned || "SIN CARRERA";
    var carreraKey = T.key ? T.key(oficial) : keyRaw(oficial);

    return {
      original: original,
      nombre: oficial,
      codigo: T.upper ? T.upper(codigo || "") : upper(codigo || ""),
      key: carreraKey,
      modalidad: modalidad(oficial),
      corregido: !!(original && clean(original) !== oficial),
      seguridad: {
        sospechoso: hasSuspicious(original),
        score: nearestResult.score || 0,
        reason: nearestResult.reason || "",
        autoCorregido: !!nearestResult.name && clean(original) !== oficial
      }
    };
  }

  function normalizeRow(row){
    row = Object.assign({}, row || {});

    var raw = T.first(row, [
      "nombreCarrera",
      "NombreCarrera",
      "nombrecarrera",
      "carrera",
      "Carrera",
      "programa",
      "Programa"
    ]);

    var code = T.first(row, [
      "codigoCarrera",
      "CodigoCarrera",
      "CódigoCarrera",
      "codCarrera",
      "CodCarrera"
    ]);

    var n = normalize(raw, code);

    row.nombreCarreraOriginal = raw || row.nombreCarreraOriginal || "";
    row.NombreCarreraOriginal = row.nombreCarreraOriginal;

    row.nombreCarrera = n.nombre;
    row.NombreCarrera = n.nombre;
    row.carrera = n.nombre;
    row.Carrera = n.nombre;

    row.nombreCarreraKey = n.key;
    row.carreraKey = n.key;

    row.modalidadCarrera = n.modalidad;

    row.codigoCarrera = n.codigo || row.codigoCarrera || row.CodigoCarrera || "";
    row.CodigoCarrera = row.codigoCarrera;

    row.carreraNormalizada = n;
    row.carreraNormalizadaTexto = n.nombre;

    if(n.seguridad && n.seguridad.sospechoso){
      row.carreraSeguridadSospechosa = true;
      row.carreraSeguridadScore = n.seguridad.score;
      row.carreraSeguridadMotivo = n.seguridad.reason;
    }

    if(n.seguridad && n.seguridad.autoCorregido){
      row.carreraSeguridadAutoCorregida = true;
    }

    return row;
  }

  function normalizeKey(value){
    return normalize(value).key;
  }

  window.BDLNormCarrera = {
    oficiales: OFICIALES.slice(),
    direct: Object.assign({}, DIRECT),
    normalize: normalize,
    normalizeRow: normalizeRow,
    clean: clean,
    key: normalizeKey,
    keyRaw: keyRaw,
    compact: compact,
    similarity: similarity,
    nearest: nearest,
    hasSuspicious: hasSuspicious,
    removeAccents: removeAccents
  };
})(window);