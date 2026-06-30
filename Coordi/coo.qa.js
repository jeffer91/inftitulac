/* =========================================================
Nombre completo: coo.qa.js
Ruta o ubicación: /Requisitos/Coordi/coo.qa.js
Función o funciones:
- Ejecutar pruebas rápidas de integración para Coordi.
- Verificar módulos cargados, responsables, reportes, correos y WhatsApp.
- Entregar diagnóstico legible para detectar errores sin romper la pantalla.
Con qué se conecta:
- coo.config.js
- coo.data.js
- coo.report.js
- coo.render.js
- coo.mail.js
- coo.whatsapp.js
- coordi.app.js
========================================================= */
(function(window){
  "use strict";

  var VERSION = "1.0.0-coo-qa.1";

  function text(value){return String(value == null ? "" : value).trim();}
  function arr(value){return Array.isArray(value) ? value : [];} 
  function emailOk(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(value));}
  function phoneOk(value){return /^593[0-9]{8,10}$/.test(text(value).replace(/[^0-9]/g, ""));}

  function push(list, level, code, message, extra){
    list.push({level:level, code:code, message:message, extra:extra || null});
  }

  function checkModules(out){
    var modules = {
      COOConfig:!!window.COOConfig,
      COOData:!!window.COOData,
      COOReport:!!window.COOReport,
      COORender:!!window.COORender,
      COOMail:!!window.COOMail,
      COOWhatsApp:!!window.COOWhatsApp,
      CoordiExport:!!window.CoordiExport
    };
    Object.keys(modules).forEach(function(name){
      if(modules[name]){push(out.checks, "ok", "module_" + name, name + " cargado.");}
      else{push(out.errors, "error", "module_" + name, name + " no está cargado.");}
    });
    return modules;
  }

  function checkConfig(out){
    var cfg = window.COOConfig || {};
    var global = cfg.global || {};
    var areas = arr(cfg.areas);
    if(!global.correo || !emailOk(global.correo)){push(out.errors, "error", "global_email", "Correo global inválido o vacío.", global);}
    if(!global.whatsapp || !phoneOk(global.whatsapp)){push(out.warnings, "warn", "global_phone", "WhatsApp global inválido o vacío.", global);}
    if(areas.length < 8){push(out.warnings, "warn", "areas_count", "Hay menos áreas configuradas de lo esperado.", {total:areas.length});}
    areas.forEach(function(area){
      if(!text(area.id)){push(out.errors, "error", "area_id", "Un área no tiene id.", area);}
      if(!text(area.area)){push(out.errors, "error", "area_name", "Un área no tiene nombre.", area);}
      if(!text(area.responsable)){push(out.errors, "error", "area_responsable", "Un área no tiene responsable.", area);}
      if(!emailOk(area.correo)){push(out.errors, "error", "area_email", "Correo de área inválido: " + text(area.area), area);}
      if(!phoneOk(area.whatsapp)){push(out.warnings, "warn", "area_phone", "WhatsApp de área inválido: " + text(area.area), area);}
      if(!arr(area.requisitoKeys).length){push(out.warnings, "warn", "area_keys", "Área sin requisitos asociados: " + text(area.area), area);}
    });
  }

  function checkReport(out, report){
    report = report || {};
    var global = report.global || {};
    var areas = arr(report.areas);
    if(!report.version){push(out.warnings, "warn", "report_version", "El reporte no tiene versión.");}
    if(!areas.length){push(out.warnings, "warn", "report_areas", "El reporte no contiene áreas.");}
    if(Number(global.totalEstudiantesRevisados || 0) < Number(global.totalEstudiantesPendientes || 0)){
      push(out.errors, "error", "report_totals", "Los estudiantes pendientes superan a los revisados.", global);
    }
    areas.forEach(function(area){
      if(Number(area.totalEstudiantes || 0) === 0 && arr(area.estudiantes).length > 0){
        push(out.errors, "error", "area_total", "El área tiene estudiantes pero totalEstudiantes es 0: " + text(area.area), area);
      }
      if(Number(area.totalEstudiantes || 0) !== arr(area.estudiantes).length){
        push(out.warnings, "warn", "area_students_count", "Conteo de estudiantes no coincide en: " + text(area.area), {total:area.totalEstudiantes, rows:arr(area.estudiantes).length});
      }
    });
  }

  function checkActions(out, report){
    report = report || {};
    try{
      if(window.COOMail && report.global && Number(report.global.totalEstudiantesPendientes || 0) > 0){
        var mail = window.COOMail.build(report, {kind:"global"});
        if(!mail.to || !mail.subject || !mail.html){push(out.errors, "error", "mail_global", "No se pudo construir correctamente el correo global.", mail);}
        else{push(out.checks, "ok", "mail_global", "Correo global construido correctamente.");}
      }
    }catch(error){push(out.errors, "error", "mail_global_exception", error.message || String(error));}

    try{
      var firstArea = arr(report.areasConPendientes || report.areas).filter(function(area){return Number(area.totalEstudiantes || 0) > 0;})[0];
      if(firstArea && window.COOMail){
        var detail = window.COOMail.build(report, {kind:"area-detail", areaId:firstArea.id});
        if(!detail.to || !detail.html){push(out.errors, "error", "mail_area", "No se pudo construir el correo detallado del área.", firstArea);}
        else{push(out.checks, "ok", "mail_area", "Correo detallado de área construido correctamente.");}
      }
      if(firstArea && window.COOWhatsApp){
        var wa = window.COOWhatsApp.build(report, {kind:"area", areaId:firstArea.id});
        var link = window.COOWhatsApp.link(wa);
        if(link.indexOf("https://wa.me/") !== 0){push(out.errors, "error", "whatsapp_link", "El enlace de WhatsApp no es válido.", link);}
        else{push(out.checks, "ok", "whatsapp_link", "WhatsApp por área construido correctamente.");}
      }
    }catch(error2){push(out.errors, "error", "action_exception", error2.message || String(error2));}
  }

  function run(report){
    var out = {
      version:VERSION,
      ok:true,
      checkedAt:new Date().toISOString(),
      checks:[],
      warnings:[],
      errors:[]
    };
    checkModules(out);
    checkConfig(out);
    if(report){
      checkReport(out, report);
      checkActions(out, report);
    }else{
      push(out.warnings, "warn", "report_missing", "No se recibió reporte para validar datos.");
    }
    out.ok = out.errors.length === 0;
    out.summary = {
      ok:out.ok,
      checks:out.checks.length,
      warnings:out.warnings.length,
      errors:out.errors.length
    };
    return out;
  }

  window.COOQA = {
    version:VERSION,
    run:run
  };
})(window);
