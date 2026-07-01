/* =========================================================
Nombre completo: carga.reader.encoding.js
Ruta: /Carga/readers/carga.reader.encoding.js
Función:
- Leer archivos como bytes.
- Detectar si un .xls viejo realmente es HTML/texto.
- Decodificar correctamente UTF-8, Windows-1252 e ISO-8859-1.
- Evitar caracteres dañados como � en carreras, requisitos y campos.
========================================================= */
(function(window){
  "use strict";

  function toUint8Array(input){
    if(input instanceof Uint8Array){
      return input;
    }

    if(input instanceof ArrayBuffer){
      return new Uint8Array(input);
    }

    if(input && input.buffer instanceof ArrayBuffer){
      return new Uint8Array(input.buffer);
    }

    return new Uint8Array(0);
  }

  function readArrayBuffer(file){
    return new Promise(function(resolve, reject){
      if(!file){
        reject(new Error("No se recibió archivo para leer."));
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

  function startsWithBytes(bytes, signature){
    bytes = toUint8Array(bytes);

    if(bytes.length < signature.length){
      return false;
    }

    for(var i = 0; i < signature.length; i += 1){
      if(bytes[i] !== signature[i]){
        return false;
      }
    }

    return true;
  }

  function detectBinaryType(bytes){
    bytes = toUint8Array(bytes);

    if(startsWithBytes(bytes, [0x50, 0x4B, 0x03, 0x04])){
      return "zip_xlsx";
    }

    if(startsWithBytes(bytes, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])){
      return "xls_binario_real";
    }

    return "";
  }

  function looksBinary(bytes){
    bytes = toUint8Array(bytes);

    if(detectBinaryType(bytes)){
      return true;
    }

    var max = Math.min(bytes.length, 4096);
    var controls = 0;
    var total = 0;

    for(var i = 0; i < max; i += 1){
      var b = bytes[i];

      if(b === 0){
        return true;
      }

      total += 1;

      if(b < 32 && b !== 9 && b !== 10 && b !== 13){
        controls += 1;
      }
    }

    return total > 0 && (controls / total) > 0.08;
  }

  function decode(bytes, encoding, fatal){
    bytes = toUint8Array(bytes);

    try{
      var decoder = new TextDecoder(encoding, { fatal: !!fatal });
      return decoder.decode(bytes);
    }catch(error){
      return null;
    }
  }

  function countReplacement(text){
    var match = String(text || "").match(/\uFFFD/g);
    return match ? match.length : 0;
  }

  function countMojibake(text){
    text = String(text || "");

    var total = 0;
    total += (text.match(/Ã./g) || []).length;
    total += (text.match(/Â./g) || []).length;
    total += (text.match(/â€/g) || []).length;
    total += (text.match(/�/g) || []).length;

    return total;
  }

  function countSpanishAccents(text){
    var match = String(text || "").match(/[áéíóúÁÉÍÓÚñÑüÜ]/g);
    return match ? match.length : 0;
  }

  function looksHtml(text){
    text = String(text || "").slice(0, 4000).toLowerCase();

    return (
      text.indexOf("<html") >= 0 ||
      text.indexOf("<table") >= 0 ||
      text.indexOf("<tr") >= 0 ||
      text.indexOf("<!doctype") >= 0 ||
      text.indexOf("urn:schemas-microsoft-com:office") >= 0 ||
      text.indexOf("mso-") >= 0
    );
  }

  function looksCsvLike(text){
    var lines = String(text || "")
      .split(/\r?\n/)
      .filter(function(line){
        return line.trim();
      })
      .slice(0, 6);

    if(!lines.length){
      return false;
    }

    var joined = lines.join("\n");
    var tabs = (joined.match(/\t/g) || []).length;
    var semis = (joined.match(/;/g) || []).length;
    var commas = (joined.match(/,/g) || []).length;

    return tabs >= 3 || semis >= 3 || commas >= 3;
  }

  function readMetaCharset(text){
    text = String(text || "").slice(0, 8000);

    var meta = text.match(/charset\s*=\s*["']?([^"'\s;>]+)/i);

    if(!meta || !meta[1]){
      return "";
    }

    return normalizeEncodingName(meta[1]);
  }

  function normalizeEncodingName(encoding){
    encoding = String(encoding || "").trim().toLowerCase();

    if(!encoding){
      return "";
    }

    if(encoding === "utf8"){
      return "utf-8";
    }

    if(encoding === "latin1" || encoding === "latin-1" || encoding === "iso8859-1"){
      return "iso-8859-1";
    }

    if(encoding === "ansi" || encoding === "cp1252" || encoding === "win1252"){
      return "windows-1252";
    }

    if(encoding === "windows1252"){
      return "windows-1252";
    }

    return encoding;
  }

  function unique(values){
    var seen = Object.create(null);
    var out = [];

    (Array.isArray(values) ? values : []).forEach(function(value){
      value = normalizeEncodingName(value);

      if(value && !seen[value]){
        seen[value] = true;
        out.push(value);
      }
    });

    return out;
  }

  function scoreText(text, encoding){
    text = String(text || "");

    var score = 0;
    var replacements = countReplacement(text);
    var mojibake = countMojibake(text);
    var accents = countSpanishAccents(text);

    score -= replacements * 1000;
    score -= mojibake * 80;
    score += Math.min(accents, 100) * 4;

    if(looksHtml(text)){
      score += 350;
    }

    if(looksCsvLike(text)){
      score += 100;
    }

    if(/carrera|cédula|cedula|identificación|identificacion|nombres|aprobación|aprobacion/i.test(text)){
      score += 160;
    }

    if(/mecánica|mecanica|administración|administracion|prácticas|practicas|vinculación|vinculacion/i.test(text)){
      score += 80;
    }

    if(encoding === "windows-1252"){
      score += 15;
    }

    if(encoding === "utf-8"){
      score += 8;
    }

    return score;
  }

  function detectBestText(bytes){
    bytes = toUint8Array(bytes);

    var binaryType = detectBinaryType(bytes);

    if(binaryType){
      return {
        ok: true,
        text: "",
        encoding: "",
        binaryType: binaryType,
        isBinary: true,
        isHtml: false,
        isCsvLike: false,
        replacements: 0,
        mojibake: 0,
        confidence: "binary"
      };
    }

    var candidates = ["utf-8", "windows-1252", "iso-8859-1"];

    var utf8Strict = decode(bytes, "utf-8", true);

    if(utf8Strict !== null){
      var metaFromUtf8 = readMetaCharset(utf8Strict);
      candidates = unique([metaFromUtf8].concat(candidates));
    }else{
      candidates = unique(["windows-1252", "iso-8859-1", "utf-8"]);
    }

    var best = null;

    candidates.forEach(function(encoding){
      var text = decode(bytes, encoding, false);

      if(text === null){
        return;
      }

      var item = {
        ok: true,
        text: text,
        encoding: encoding,
        binaryType: "",
        isBinary: looksBinary(bytes),
        isHtml: looksHtml(text),
        isCsvLike: looksCsvLike(text),
        replacements: countReplacement(text),
        mojibake: countMojibake(text),
        confidence: "normal",
        metaCharset: readMetaCharset(text),
        score: scoreText(text, encoding)
      };

      if(!best || item.score > best.score){
        best = item;
      }
    });

    if(!best){
      best = {
        ok: false,
        text: "",
        encoding: "",
        binaryType: "",
        isBinary: false,
        isHtml: false,
        isCsvLike: false,
        replacements: 0,
        mojibake: 0,
        confidence: "low",
        metaCharset: "",
        score: 0
      };
    }

    if(best.replacements > 0 || best.mojibake > 0){
      best.confidence = "revisar";
    }

    delete best.score;

    return best;
  }

  function readTextSmart(file){
    return readArrayBuffer(file).then(function(buffer){
      var bytes = toUint8Array(buffer);
      var decoded = detectBestText(bytes);

      decoded.buffer = buffer;
      decoded.bytes = bytes;
      decoded.fileName = file && file.name ? file.name : "";

      return decoded;
    });
  }

  window.CargaReaderEncoding = {
    readArrayBuffer: readArrayBuffer,
    readTextSmart: readTextSmart,
    detectBestText: detectBestText,
    detectBinaryType: detectBinaryType,
    looksBinary: looksBinary,
    looksHtml: looksHtml,
    looksCsvLike: looksCsvLike,
    countReplacement: countReplacement,
    countMojibake: countMojibake,
    normalizeEncodingName: normalizeEncodingName
  };
})(window);