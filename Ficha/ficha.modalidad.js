/* =========================================================
Nombre completo: ficha.modalidad.js
Ruta o ubicación: /Requisitos/Ficha/ficha.modalidad.js
Función o funciones:
- Calcular y mostrar la modalidad de titulación del estudiante.
- Detectar como REGULARES los períodos Abril-Septiembre y Octubre-Marzo.
- Para períodos regulares usar Examen Complexivo por defecto.
- Para períodos regulares permitir cambiar a Trabajo de Titulación.
- Para cualquier otro período fijar Artículo Académico.
- Guardar modalidadTitulacion en BaseLocal cuando sea posible.
- Registrar evento manual de continuidad al cambiar modalidad.
Con qué se conecta:
- ficha.core.js
- ficha.periodo.js
- ficha.app.js
- ../Gestion/Excel/excel-local.repo.js
- ../BDLocal/continuity/events/cont.event.manual.js
========================================================= */
(function(window){
  "use strict";

  var VERSION = "2.1.0-ficha-modalidad-regular";

  function text(value){ return String(value == null ? "" : value).trim(); }
  function norm(value){ return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase(); }

  var VALUES = {
    complexivo:"EXAMEN_COMPLEXIVO",
    trabajo:"TRABAJO_TITULACION",
    articulo:"ARTICULO_ACADEMICO"
  };

  var MONTH_ALIASES = {
    enero:1, ene:1,
    febrero:2, feb:2,
    marzo:3, mar:3,
    abril:4, abr:4,
    mayo:5, may:5,
    junio:6, jun:6,
    julio:7, jul:7,
    agosto:8, ago:8,
    septiembre:9, setiembre:9, sept:9, sep:9, set:9,
    octubre:10, oct:10,
    noviembre:11, nov:11,
    diciembre:12, dic:12
  };

  function monthName(month){
    return {1:"Enero",2:"Febrero",3:"Marzo",4:"Abril",5:"Mayo",6:"Junio",7:"Julio",8:"Agosto",9:"Septiembre",10:"Octubre",11:"Noviembre",12:"Diciembre"}[Number(month)] || "";
  }

  function isRegularRange(startMonth, endMonth){
    startMonth = Number(startMonth);
    endMonth = Number(endMonth);
    return (startMonth === 4 && endMonth === 9) || (startMonth === 10 && endMonth === 3);
  }

  function parseNumericRange(raw){
    raw = text(raw);
    var match = raw.match(/((?:20|19)\d{2})\D{0,4}(0?[1-9]|1[0-2])\D+((?:20|19)\d{2})\D{0,4}(0?[1-9]|1[0-2])/);
    if(match){ return {startYear:Number(match[1]), startMonth:Number(match[2]), endYear:Number(match[3]), endMonth:Number(match[4])}; }
    match = raw.match(/(0?[1-9]|1[0-2])\D{0,4}((?:20|19)\d{2})\D+(0?[1-9]|1[0-2])\D{0,4}((?:20|19)\d{2})/);
    if(match){ return {startYear:Number(match[2]), startMonth:Number(match[1]), endYear:Number(match[4]), endMonth:Number(match[3])}; }
    return null;
  }

  function parseTextualRange(raw){
    var cleaned = norm(raw);
    if(!cleaned){ return null; }
    var monthWords = Object.keys(MONTH_ALIASES).sort(function(a,b){ return b.length - a.length; }).join("|");
    var pairs = [];
    var match;
    var reMonthYear = new RegExp("(" + monthWords + ")\\s*(?:de\\s*)?((?:20|19)\\d{2})", "g");
    while((match = reMonthYear.exec(cleaned)) !== null){
      pairs.push({month:MONTH_ALIASES[match[1]], year:Number(match[2])});
    }
    if(pairs.length >= 2){ return {startYear:pairs[0].year, startMonth:pairs[0].month, endYear:pairs[1].year, endMonth:pairs[1].month}; }

    pairs = [];
    var reYearMonth = new RegExp("((?:20|19)\\d{2})\\s*(?:de\\s*)?(" + monthWords + ")", "g");
    while((match = reYearMonth.exec(cleaned)) !== null){
      pairs.push({month:MONTH_ALIASES[match[2]], year:Number(match[1])});
    }
    if(pairs.length >= 2){ return {startYear:pairs[0].year, startMonth:pairs[0].month, endYear:pairs[1].year, endMonth:pairs[1].month}; }
    return null;
  }

  function periodCandidates(value){
    if(!value || typeof value !== "object"){ return [value]; }
    return [
      value._periodoNormalizado,
      value._periodo,
      value.periodoLabel,
      value.periodo,
      value.Periodo,
      value._periodoId,
      value.periodoId,
      value.ultimoPeriodoId,
      value.periodId,
      value._bl2PeriodoId,
      value._bl2Periodo,
      value.label,
      value.periodoLabel,
      value.id,
      value.value
    ];
  }

  function parseRange(value){
    var list = periodCandidates(value);
    for(var i = 0; i < list.length; i += 1){
      var raw = text(list[i]);
      if(!raw){ continue; }
      var parsed = parseNumericRange(raw) || parseTextualRange(raw);
      if(parsed){ return parsed; }
    }
    return null;
  }

  function periodLabel(value){
    try{
      if(window.FichaPeriodo && typeof window.FichaPeriodo.display === "function"){
        return window.FichaPeriodo.display(value);
      }
    }catch(error){}
    var range = parseRange(value);
    if(range){ return monthName(range.startMonth) + " " + range.startYear + " - " + monthName(range.endMonth) + " " + range.endYear; }
    return text(value) || "Sin período";
  }

  function classifyPeriod(value){
    var range = parseRange(value);
    var label = periodLabel(value);
    var regular = range ? isRegularRange(range.startMonth, range.endMonth) : false;
    return {
      id:regular ? "REGULAR" : "ARTICULO",
      label:regular ? "Regular" : "Artículo académico",
      isRegular:regular,
      isPVC:!regular,
      raw:text(value),
      normalizedLabel:label,
      range:range,
      reason:regular ? "Período regular Abril-Septiembre u Octubre-Marzo." : "Período no regular: modalidad automática Artículo Académico."
    };
  }

  function periodOf(row){
    row = row || {};
    return {
      _periodoNormalizado:row._periodoNormalizado,
      _periodo:row._periodo,
      periodoLabel:row.periodoLabel,
      periodo:row.periodo,
      Periodo:row.Periodo,
      _periodoId:row._periodoId,
      periodoId:row.periodoId,
      ultimoPeriodoId:row.ultimoPeriodoId,
      periodId:row.periodId,
      _bl2PeriodoId:row._bl2PeriodoId,
      _bl2Periodo:row._bl2Periodo
    };
  }

  function label(value){
    value = text(value).toUpperCase();
    if(value === VALUES.complexivo){ return "Examen Complexivo"; }
    if(value === VALUES.trabajo){ return "Trabajo de Titulación"; }
    if(value === VALUES.articulo){ return "Artículo Académico"; }
    return "Sin modalidad";
  }

  function normalize(value, periodInfo){
    periodInfo = periodInfo || {id:"ARTICULO", isRegular:false};
    var n = norm(value);

    if(!periodInfo.isRegular){ return VALUES.articulo; }
    if(n.indexOf("trabajo") >= 0 || n.indexOf("tesis") >= 0 || n.indexOf("proyecto") >= 0 || n.indexOf("titulacion") >= 0){ return VALUES.trabajo; }
    if(n.indexOf("complexivo") >= 0 || n.indexOf("comprensivo") >= 0 || n.indexOf("examen") >= 0){ return VALUES.complexivo; }

    return VALUES.complexivo;
  }

  function rawModalidad(row){
    row = row || {};
    return text(row.modalidadTitulacion || row.ModalidadTitulacion || row.modalidad || row.Modalidad || "");
  }

  function current(row){
    row = row || {};
    var periodInfo = classifyPeriod(periodOf(row));
    var raw = rawModalidad(row);
    var value = normalize(raw, periodInfo);
    return {
      value:value,
      label:label(value),
      periodType:periodInfo,
      editable:periodInfo.isRegular === true,
      locked:periodInfo.isRegular !== true,
      source:raw ? "guardado" : "automatico",
      defaultValue:periodInfo.isRegular ? VALUES.complexivo : VALUES.articulo
    };
  }

  function options(row){
    var info = current(row);
    if(!info.periodType.isRegular){
      return [{value:VALUES.articulo, label:"Artículo Académico", selected:true, disabled:false}];
    }
    return [
      {value:VALUES.complexivo, label:"Examen Complexivo", selected:info.value === VALUES.complexivo, disabled:false},
      {value:VALUES.trabajo, label:"Trabajo de Titulación", selected:info.value === VALUES.trabajo, disabled:false}
    ];
  }

  function studentId(row){
    row = row || {};
    return text(row._id || row._cedula || row._bl2Id || row._docId || row.docId || row.cedula || row.numeroIdentificacion);
  }

  function patchPayload(value){
    var updatedAt = new Date().toISOString();
    return {
      modalidadTitulacion:value,
      ModalidadTitulacion:value,
      modalidad:value,
      modalidadTitulacionActualizadaEn:updatedAt,
      modalidadTitulacionOrigen:"Ficha"
    };
  }

  function save(row, value){
    row = row || {};
    var id = studentId(row);
    var info = current(row);
    var oldValue = info.value || "";
    var finalValue = normalize(value, info.periodType);

    if(!id){ throw new Error("No se puede guardar modalidad: estudiante sin identificador."); }
    if(!finalValue){ throw new Error("Modalidad inválida."); }

    if(window.ExcelLocalRepo && typeof window.ExcelLocalRepo.patchStudentById === "function"){
      window.ExcelLocalRepo.patchStudentById(id, patchPayload(finalValue));
      if(window.BDLManualEvents && oldValue !== finalValue){
        window.BDLManualEvents.recordModalidad(row, oldValue, finalValue, { source:"FichaModalidad.save" });
      }
      if(window.FichaCore && typeof window.FichaCore.invalidate === "function"){ window.FichaCore.invalidate(); }
      return {ok:true, value:finalValue, label:label(finalValue), source:"ExcelLocalRepo", periodType:info.periodType};
    }
    throw new Error("ExcelLocalRepo.patchStudentById no está disponible.");
  }

  function selfTest(){
    var samples = [
      {period:"2026-04__2026-09", expected:VALUES.complexivo, regular:true},
      {period:"Abril 2026 - Septiembre 2026", expected:VALUES.complexivo, regular:true},
      {period:"2026-10__2027-03", expected:VALUES.complexivo, regular:true},
      {period:"Octubre 2026 - Marzo 2027", expected:VALUES.complexivo, regular:true},
      {period:"2025-11__2026-05", expected:VALUES.articulo, regular:false},
      {period:"Febrero 2025 - Agosto 2025", expected:VALUES.articulo, regular:false}
    ];
    return {
      version:VERSION,
      ok:samples.every(function(sample){ var info = current({_periodo:sample.period}); return info.value === sample.expected && info.periodType.isRegular === sample.regular; }),
      samples:samples.map(function(sample){ var info = current({_periodo:sample.period}); return {period:sample.period, value:info.value, label:info.label, regular:info.periodType.isRegular, expected:sample.expected}; })
    };
  }

  window.FichaModalidad = {
    VERSION:VERSION,
    VALUES:VALUES,
    classifyPeriod:classifyPeriod,
    current:current,
    options:options,
    save:save,
    label:label,
    normalize:normalize,
    selfTest:selfTest
  };
})(window);
