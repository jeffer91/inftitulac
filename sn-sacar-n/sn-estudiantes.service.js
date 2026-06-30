/* =========================================================
Nombre completo: sn-estudiantes.service.js
Ruta o ubicacion: /Requisitos/sn-sacar-n/sn-estudiantes.service.js
Modulo: Sacar N
Funcion o funciones:
- Conectar Sacar N con BDLocal.
- Cargar periodos, carreras y estudiantes desde Requisitos.
- Validar cedulas vacias, cedulas repetidas y datos basicos incompletos.
Con que se conecta:
- BDLocal/adapters/bdl.screen-deps.js
- sn-config.js
- sn-models.js
- sn-state.service.js
- sn-store.service.js
- sn-queue.service.js
========================================================= */
(function(window){
  "use strict";

  var cfg = window.SNConfig || {};
  var models = window.SNModels || {};
  var state = window.SNState || {};
  var queue = window.SNQueue || {};
  var store = window.SNStore || {};

  function texto(valor){
    return models.texto ? models.texto(valor) : String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  function cedula(valor){
    return models.limpiarCedula ? models.limpiarCedula(valor) : texto(valor).replace(/[^0-9]/g, "");
  }

  function norm(valor){
    return texto(valor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function api(){
    return window.BDLocal || null;
  }

  function repoEstudiantes(){
    return window.BDLRepoEstudiantes || null;
  }

  function setMensaje(mensaje, estado){
    if(state.setModulo && cfg.estadosModulo){
      state.setModulo(estado || (state.get ? state.get().modulo : cfg.estadosModulo.listo), mensaje);
    }
  }

  function bootBDLocal(){
    var bd = api();
    if(!bd || typeof bd.boot !== "function"){
      return Promise.reject(new Error("BDLocal no esta disponible. Revise que bdl.screen-deps.js cargue correctamente."));
    }
    return bd.boot();
  }

  function listarPeriodos(){
    var bd = api();
    if(!bd || !bd.periodos || typeof bd.periodos.listar !== "function"){
      return Promise.resolve([]);
    }
    return bd.periodos.listar({ force:true }).then(function(rows){
      return (rows || []).map(function(p){
        return {
          id: texto(p.periodoId || p.id || p.value || p.label),
          label: texto(p.periodoLabel || p.label || p.periodoId || p.id)
        };
      }).filter(function(p){ return p.id || p.label; });
    });
  }

  function listarEstudiantes(periodoId){
    var repo = repoEstudiantes();
    if(repo && typeof repo.listarResumen === "function"){
      return repo.listarResumen(periodoId || "", { limit:0 }).then(function(rows){
        return rows || [];
      });
    }

    var bd = api();
    if(!bd || !bd.estudiantes || typeof bd.estudiantes.resumen !== "function"){
      return Promise.resolve([]);
    }

    var acumulado = [];
    var limit = 500;
    function cargarPagina(page){
      return bd.estudiantes.resumen({ periodoId: periodoId || "", page: page, limit: limit, force:true }).then(function(res){
        var rows = (res && res.rows) || [];
        acumulado = acumulado.concat(rows);
        if(rows.length >= limit){ return cargarPagina(page + 1); }
        return acumulado;
      });
    }
    return cargarPagina(1);
  }

  function obtenerCampo(row, nombres){
    for(var i=0;i<nombres.length;i++){
      var k = nombres[i];
      if(row && row[k] != null && texto(row[k]) !== "") return row[k];
    }
    return "";
  }

  function normalizarEstudiante(row, index){
    row = row || {};
    var base = {
      id: obtenerCampo(row, ["id", "idEstudiantePeriodo", "idLocal"]),
      cedula: obtenerCampo(row, ["cedula", "Cedula", "numeroIdentificacion", "identificacion", "Identificacion"]),
      nombres: obtenerCampo(row, ["nombres", "Nombres", "nombreCompleto", "estudiante", "Estudiante"]),
      carrera: obtenerCampo(row, ["carrera", "Carrera", "nombreCarrera", "NombreCarrera"]),
      periodo: obtenerCampo(row, ["periodo", "Periodo", "periodoLabel", "periodoId"]),
      modalidad: obtenerCampo(row, ["modalidad", "Modalidad", "division", "Division", "divisionPrincipal"]),
      codigoCarrera: obtenerCampo(row, ["codigoCarrera", "CodigoCarrera"]),
      sede: obtenerCampo(row, ["sede", "Sede"])
    };
    var estudiante = models.crearEstudiante ? models.crearEstudiante(base, index) : base;
    estudiante.codigoCarrera = texto(base.codigoCarrera);
    estudiante.sede = texto(base.sede);
    return estudiante;
  }

  function filtrarPorCarreraYModalidad(estudiantes, filtros){
    filtros = filtros || {};
    var carrera = norm(filtros.carrera);
    var modalidad = norm(filtros.modalidad);
    var busqueda = norm(filtros.busqueda);

    return estudiantes.filter(function(e){
      var okCarrera = !carrera || norm(e.carrera) === carrera || norm(e.codigoCarrera) === carrera;
      var okModalidad = !modalidad || norm(e.modalidad) === modalidad;
      var searchText = norm([e.cedula, e.nombres, e.carrera, e.periodo, e.modalidad].join(" "));
      var okBusqueda = !busqueda || searchText.indexOf(busqueda) >= 0;
      return okCarrera && okModalidad && okBusqueda;
    });
  }

  function catalogosDesdeEstudiantes(estudiantes, periodos){
    var carreraMap = Object.create(null);
    var modalidadMap = Object.create(null);
    estudiantes.forEach(function(e){
      var carrera = texto(e.carrera);
      var modalidad = texto(e.modalidad);
      if(carrera) carreraMap[carrera] = true;
      if(modalidad) modalidadMap[modalidad] = true;
    });
    return {
      periodos: periodos || [],
      carreras: Object.keys(carreraMap).sort().map(function(v){ return { id:v, label:v }; }),
      modalidades: Object.keys(modalidadMap).sort().map(function(v){ return { id:v, label:v }; })
    };
  }

  function validar(estudiantes){
    var novedades = [];
    var vistos = Object.create(null);
    estudiantes.forEach(function(e){
      var c = cedula(e.cedula);
      if(!c){
        novedades.push(models.crearNovedad ? models.crearNovedad("Cedula vacia", e, "El estudiante no tiene cedula valida.", "validacion") : { tipo:"Cedula vacia", cedula:"" });
      }else if(vistos[c]){
        novedades.push(models.crearNovedad ? models.crearNovedad("Cedula repetida", e, "La cedula aparece mas de una vez en la lista.", "validacion") : { tipo:"Cedula repetida", cedula:c });
      }
      vistos[c] = true;
      if(!texto(e.carrera)){
        novedades.push(models.crearNovedad ? models.crearNovedad("Carrera vacia", e, "El estudiante no tiene carrera registrada.", "validacion") : { tipo:"Carrera vacia" });
      }
      if(!texto(e.periodo)){
        novedades.push(models.crearNovedad ? models.crearNovedad("Periodo vacio", e, "El estudiante no tiene periodo registrado.", "validacion") : { tipo:"Periodo vacio" });
      }
    });
    return novedades;
  }

  function cargarCatalogos(){
    setMensaje("Cargando catalogos desde BDLocal...", cfg.estadosModulo ? cfg.estadosModulo.cargandoEstudiantes : "cargando_estudiantes");
    return bootBDLocal().then(function(){
      return listarPeriodos();
    }).then(function(periodos){
      return listarEstudiantes("").then(function(rows){
        var estudiantes = rows.map(normalizarEstudiante);
        var catalogos = catalogosDesdeEstudiantes(estudiantes, periodos);
        var periodoInicial = "";
        if(periodos.length === 1){ periodoInicial = periodos[0].id; }
        if(state.patch){
          state.patch({
            catalogos: catalogos,
            estudiantesBase: estudiantes,
            periodoSeleccionado: (state.get && state.get().periodoSeleccionado) || periodoInicial,
            mensaje: "Catalogos cargados. Seleccione periodo/carrera y presione Cargar estudiantes."
          });
        }
        return catalogos;
      });
    }).catch(function(error){
      setMensaje("No se pudieron cargar catalogos desde BDLocal: " + error.message, cfg.estadosModulo ? cfg.estadosModulo.errorCritico : "error_critico");
      throw error;
    });
  }

  function cargarEstudiantes(){
    var snapshot = state.get ? state.get() : {};
    var periodoId = texto(snapshot.periodoSeleccionado);
    var carrera = texto(snapshot.carreraSeleccionada);
    var modalidad = texto(snapshot.modalidadSeleccionada);
    var busqueda = texto(snapshot.busqueda);

    if(!periodoId){
      setMensaje("Seleccione un periodo academico antes de cargar estudiantes.", cfg.estadosModulo ? cfg.estadosModulo.listo : "listo");
      return Promise.resolve([]);
    }

    setMensaje("Cargando estudiantes desde BDLocal...", cfg.estadosModulo ? cfg.estadosModulo.cargandoEstudiantes : "cargando_estudiantes");
    return bootBDLocal().then(function(){
      return listarEstudiantes(periodoId);
    }).then(function(rows){
      var estudiantes = rows.map(normalizarEstudiante);
      estudiantes = filtrarPorCarreraYModalidad(estudiantes, { carrera:carrera, modalidad:modalidad, busqueda:busqueda });
      var novedades = validar(estudiantes);
      var cola = queue.guardarCola ? queue.guardarCola(estudiantes) : estudiantes;

      if(novedades.length && state.agregarNovedad){
        novedades.forEach(function(n){ state.agregarNovedad(n); });
      }
      if(store.registrarUltimaCarga){
        store.registrarUltimaCarga({ total: cola.length, periodoId: periodoId, carrera: carrera, modalidad: modalidad });
      }
      if(state.patch){
        state.patch({
          periodoSeleccionado: periodoId,
          carreraSeleccionada: carrera,
          modalidadSeleccionada: modalidad,
          mensaje: "Estudiantes cargados desde BDLocal: " + cola.length + ". Novedades detectadas: " + novedades.length + "."
        });
      }
      return cola;
    }).catch(function(error){
      setMensaje("No se pudieron cargar estudiantes desde BDLocal: " + error.message, cfg.estadosModulo ? cfg.estadosModulo.errorCritico : "error_critico");
      throw error;
    });
  }

  window.SNEstudiantes = {
    bootBDLocal: bootBDLocal,
    cargarCatalogos: cargarCatalogos,
    cargarEstudiantes: cargarEstudiantes,
    validar: validar,
    catalogosDesdeEstudiantes: catalogosDesdeEstudiantes,
    normalizarEstudiante: normalizarEstudiante
  };
})(window);
