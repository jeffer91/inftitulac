/* =========================================================
Nombre completo: carga.divisiones.ui.js
Ruta: /Carga/divisiones/carga.divisiones.ui.js
Función:
- Popup de gestión de divisiones dentro de Carga.
- Crear, editar, borrar divisiones.
- Seleccionar división activa.
- Arrastrar o tocar carreras para asignarlas.
- Mover automáticamente una carrera si ya estaba en otra división.
========================================================= */
(function(window, document){
  "use strict";

  var state = {
    periodoId: "",
    periodoLabel: "",
    selected: "",
    config: {
      periodoId: "",
      divisiones: []
    },
    carreras: [],
    loading: false
  };

  var els = {};

  function $(id){
    return document.getElementById(id);
  }

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function esc(value){
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function service(){
    if(!window.CargaDivisionesService){
      throw new Error("CargaDivisionesService no está disponible.");
    }

    return window.CargaDivisionesService;
  }

  function initEls(){
    els.btnOpen = $("cargaBtnDivisiones");
    els.modal = $("cargaDivisionesModal");
    els.btnClose = $("cargaDivBtnCerrar");
    els.btnOk = $("cargaDivBtnOk");
    els.periodo = $("cargaDivPeriodo");
    els.status = $("cargaDivStatus");
    els.nameInput = $("cargaDivNombre");
    els.btnCrear = $("cargaDivBtnCrear");
    els.list = $("cargaDivLista");
    els.activeName = $("cargaDivActivaNombre");
    els.drop = $("cargaDivDrop");
    els.careers = $("cargaDivCarreras");
    els.btnRenombrar = $("cargaDivBtnRenombrar");
    els.btnBorrar = $("cargaDivBtnBorrar");
    els.countDivisiones = $("cargaDivCountDivisiones");
    els.countCarreras = $("cargaDivCountCarreras");
    els.countAsignadas = $("cargaDivCountAsignadas");
    els.countSinAsignar = $("cargaDivCountSinAsignar");
  }

  function setStatus(message, type){
    if(!els.status){ return; }

    els.status.className = "carga-div-status " + (type || "");
    els.status.textContent = message || "Listo.";
  }

  function setLoading(value){
    state.loading = !!value;

    [
      els.btnOpen,
      els.btnCrear,
      els.btnRenombrar,
      els.btnBorrar,
      els.btnOk
    ].forEach(function(btn){
      if(btn){ btn.disabled = state.loading; }
    });
  }

  function selectedPeriod(){
    var select = $("cargaPeriodoSelect");
    var id = select ? text(select.value) : "";
    var label = "";

    if(select && select.selectedOptions && select.selectedOptions[0]){
      label = text(select.selectedOptions[0].textContent);
    }

    return {
      periodoId: id,
      periodoLabel: label || id
    };
  }

  function open(){
    var period = selectedPeriod();

    if(!period.periodoId){
      setCargaStatus("Selecciona un período antes de gestionar divisiones.", "warn");
      return;
    }

    state.periodoId = period.periodoId;
    state.periodoLabel = period.periodoLabel;
    state.selected = "";

    if(els.modal){
      els.modal.hidden = false;
    }

    if(els.periodo){
      els.periodo.textContent = state.periodoLabel;
    }

    load();
  }

  function close(){
    if(els.modal){
      els.modal.hidden = true;
    }
  }

  function setCargaStatus(message, type){
    var box = $("cargaStatus");

    if(box){
      box.classList.remove("ok", "warn", "error");
      if(type){ box.classList.add(type); }
      box.textContent = message;
    }
  }

  function selectedDiv(){
    return (state.config.divisiones || []).filter(function(div){
      return div.nombre === state.selected;
    })[0] || null;
  }

  function assignedCount(){
    var total = 0;

    (state.config.divisiones || []).forEach(function(div){
      total += Array.isArray(div.carreras) ? div.carreras.length : 0;
    });

    return total;
  }

  function careerByKey(key){
    return (state.carreras || []).filter(function(carrera){
      return carrera.key === key;
    })[0] || null;
  }

  function assignedMap(){
    var map = {};

    (state.config.divisiones || []).forEach(function(div){
      (div.carreras || []).forEach(function(carreraKey){
        map[carreraKey] = div.nombre;
      });
    });

    return map;
  }

  function renderCounts(){
    var divisiones = state.config.divisiones || [];
    var totalCarreras = state.carreras.length;
    var asignadas = assignedCount();
    var sinAsignar = Math.max(0, totalCarreras - asignadas);

    if(els.countDivisiones){ els.countDivisiones.textContent = divisiones.length; }
    if(els.countCarreras){ els.countCarreras.textContent = totalCarreras; }
    if(els.countAsignadas){ els.countAsignadas.textContent = asignadas; }
    if(els.countSinAsignar){ els.countSinAsignar.textContent = sinAsignar; }
  }

  function renderDivisiones(){
    if(!els.list){ return; }

    var divisiones = state.config.divisiones || [];

    if(!divisiones.length){
      els.list.innerHTML = '<div class="carga-div-empty">No hay divisiones creadas para este período.</div>';
      return;
    }

    els.list.innerHTML = divisiones.map(function(div){
      var count = Array.isArray(div.carreras) ? div.carreras.length : 0;
      var active = div.nombre === state.selected ? " is-active" : "";

      return '<button class="carga-div-card' + active + '" type="button" data-div="' + esc(div.nombre) + '">' +
        '<strong>' + esc(div.nombre) + '</strong>' +
        '<span>' + count + ' carrera(s)</span>' +
      '</button>';
    }).join("");
  }

  function renderActive(){
    var div = selectedDiv();

    if(els.activeName){
      els.activeName.textContent = div ? div.nombre : "Sin división seleccionada";
    }

    if(!els.drop){ return; }

    if(!div){
      els.drop.innerHTML = '<div class="carga-div-empty">Selecciona o crea una división para asignar carreras.</div>';
      return;
    }

    var carreras = Array.isArray(div.carreras) ? div.carreras : [];

    if(!carreras.length){
      els.drop.innerHTML = '<div class="carga-div-empty">Arrastra carreras aquí o toca una carrera de la lista inferior.</div>';
      return;
    }

    els.drop.innerHTML = carreras.map(function(carreraKey){
      var carrera = careerByKey(carreraKey);

      return '<span class="carga-career-chip assigned" draggable="true" data-career="' + esc(carreraKey) + '">' +
        esc(carrera ? carrera.nombre : carreraKey) +
        '<button type="button" data-unassign="' + esc(carreraKey) + '" title="Quitar de esta división">×</button>' +
      '</span>';
    }).join("");
  }

  function renderCareers(){
    if(!els.careers){ return; }

    var map = assignedMap();

    if(!state.carreras.length){
      els.careers.innerHTML = '<div class="carga-div-empty">Este período todavía no tiene carreras cargadas.</div>';
      return;
    }

    els.careers.innerHTML = state.carreras.map(function(carrera){
      var division = map[carrera.key] || "";
      var assigned = division ? " is-assigned" : "";
      var active = division && division === state.selected ? " is-current" : "";

      return '<button class="carga-career-row' + assigned + active + '" type="button" draggable="true" data-career="' + esc(carrera.key) + '">' +
        '<strong>' + esc(carrera.nombre) + '</strong>' +
        '<span>' + esc(division || "Sin división") + '</span>' +
      '</button>';
    }).join("");
  }

  function render(){
    renderCounts();
    renderDivisiones();
    renderActive();
    renderCareers();
  }

  function load(){
    setLoading(true);
    setStatus("Cargando divisiones y carreras del período...", "");

    return service().load(state.periodoId).then(function(data){
      state.config = data.config || {
        periodoId: state.periodoId,
        divisiones: []
      };
      state.carreras = data.carreras || [];

      if(!state.selected && state.config.divisiones && state.config.divisiones[0]){
        state.selected = state.config.divisiones[0].nombre;
      }

      render();
      setStatus("Listo. Puedes crear divisiones y asignar carreras.", "ok");
    }).catch(function(error){
      console.error("[CargaDivisionesUI]", error);
      setStatus(error && error.message ? error.message : String(error), "error");
    }).finally(function(){
      setLoading(false);
    });
  }

  function createDivision(){
    var name = text(els.nameInput && els.nameInput.value);

    if(!name){
      setStatus("Escribe el nombre de la división.", "warn");
      return;
    }

    setLoading(true);
    setStatus("Creando división...", "");

    service().createDivision(state.periodoId, name).then(function(result){
      state.selected = result.selected || name;

      if(els.nameInput){
        els.nameInput.value = "";
      }

      return load();
    }).then(function(){
      setStatus("División creada correctamente.", "ok");
      setCargaStatus("Divisiones actualizadas para el período.", "ok");
    }).catch(function(error){
      setStatus(error && error.message ? error.message : String(error), "error");
    }).finally(function(){
      setLoading(false);
    });
  }

  function renameSelected(){
    var current = selectedDiv();

    if(!current){
      setStatus("Selecciona una división para editar.", "warn");
      return;
    }

    var next = window.prompt("Nuevo nombre de la división:", current.nombre);

    if(next === null){
      return;
    }

    next = text(next);

    if(!next){
      setStatus("El nombre no puede quedar vacío.", "warn");
      return;
    }

    setLoading(true);
    setStatus("Editando nombre de división...", "");

    service().renameDivision(state.periodoId, current.nombre, next).then(function(result){
      state.selected = result.selected || next;
      return load();
    }).then(function(){
      setStatus("División renombrada correctamente.", "ok");
      setCargaStatus("Nombre de división actualizado.", "ok");
    }).catch(function(error){
      setStatus(error && error.message ? error.message : String(error), "error");
    }).finally(function(){
      setLoading(false);
    });
  }

  function deleteSelected(){
    var current = selectedDiv();

    if(!current){
      setStatus("Selecciona una división para borrar.", "warn");
      return;
    }

    var ok = window.confirm(
      "¿Borrar la división \"" + current.nombre + "\"?\n\n" +
      "Las carreras y estudiantes quedarán como Sin división."
    );

    if(!ok){
      return;
    }

    setLoading(true);
    setStatus("Borrando división y limpiando estudiantes...", "");

    service().deleteDivision(state.periodoId, current.nombre).then(function(){
      state.selected = "";
      return load();
    }).then(function(){
      setStatus("División borrada. Las carreras quedaron sin división.", "ok");
      setCargaStatus("División borrada y estudiantes actualizados.", "ok");
    }).catch(function(error){
      setStatus(error && error.message ? error.message : String(error), "error");
    }).finally(function(){
      setLoading(false);
    });
  }

  function selectDivision(name){
    state.selected = text(name);
    render();
  }

  function assignCareer(carreraKey){
    if(!state.selected){
      setStatus("Selecciona una división antes de asignar carreras.", "warn");
      return;
    }

    carreraKey = text(carreraKey);

    if(!carreraKey){
      return;
    }

    setLoading(true);
    setStatus("Moviendo carrera a " + state.selected + "...", "");

    service().assignCareer(state.periodoId, carreraKey, state.selected).then(function(result){
      state.selected = result.selected || state.selected;
      return load();
    }).then(function(){
      setStatus("Carrera asignada y estudiantes actualizados.", "ok");
      setCargaStatus("Divisiones aplicadas a estudiantes del período.", "ok");
    }).catch(function(error){
      setStatus(error && error.message ? error.message : String(error), "error");
    }).finally(function(){
      setLoading(false);
    });
  }

  function unassignCareer(carreraKey){
    carreraKey = text(carreraKey);

    if(!carreraKey){
      return;
    }

    setLoading(true);
    setStatus("Quitando carrera de la división...", "");

    service().unassignCareer(state.periodoId, carreraKey).then(function(){
      return load();
    }).then(function(){
      setStatus("Carrera quedó sin división.", "ok");
      setCargaStatus("Carrera y estudiantes quedaron sin división.", "ok");
    }).catch(function(error){
      setStatus(error && error.message ? error.message : String(error), "error");
    }).finally(function(){
      setLoading(false);
    });
  }

  function bindClicks(){
    if(els.btnOpen){
      els.btnOpen.addEventListener("click", open);
    }

    if(els.btnClose){
      els.btnClose.addEventListener("click", close);
    }

    if(els.btnOk){
      els.btnOk.addEventListener("click", close);
    }

    if(els.modal){
      els.modal.addEventListener("click", function(event){
        if(event.target && event.target.getAttribute("data-carga-div-close") === "1"){
          close();
        }
      });
    }

    if(els.btnCrear){
      els.btnCrear.addEventListener("click", createDivision);
    }

    if(els.nameInput){
      els.nameInput.addEventListener("keydown", function(event){
        if(event.key === "Enter"){
          event.preventDefault();
          createDivision();
        }
      });
    }

    if(els.btnRenombrar){
      els.btnRenombrar.addEventListener("click", renameSelected);
    }

    if(els.btnBorrar){
      els.btnBorrar.addEventListener("click", deleteSelected);
    }

    if(els.list){
      els.list.addEventListener("click", function(event){
        var btn = event.target.closest ? event.target.closest("[data-div]") : null;
        if(btn){
          selectDivision(btn.getAttribute("data-div"));
        }
      });
    }

    if(els.careers){
      els.careers.addEventListener("click", function(event){
        var btn = event.target.closest ? event.target.closest("[data-career]") : null;
        if(btn){
          assignCareer(btn.getAttribute("data-career"));
        }
      });
    }

    if(els.drop){
      els.drop.addEventListener("click", function(event){
        var btn = event.target.closest ? event.target.closest("[data-unassign]") : null;
        if(btn){
          event.preventDefault();
          event.stopPropagation();
          unassignCareer(btn.getAttribute("data-unassign"));
        }
      });
    }
  }

  function bindDrag(){
    document.addEventListener("dragstart", function(event){
      var item = event.target && event.target.closest ? event.target.closest("[data-career]") : null;

      if(!item){
        return;
      }

      event.dataTransfer.setData("text/plain", item.getAttribute("data-career"));
      event.dataTransfer.effectAllowed = "move";
    });

    if(els.drop){
      els.drop.addEventListener("dragover", function(event){
        event.preventDefault();
        els.drop.classList.add("is-dragover");
      });

      els.drop.addEventListener("dragleave", function(){
        els.drop.classList.remove("is-dragover");
      });

      els.drop.addEventListener("drop", function(event){
        event.preventDefault();
        els.drop.classList.remove("is-dragover");

        var carreraKey = event.dataTransfer.getData("text/plain");

        if(carreraKey){
          assignCareer(carreraKey);
        }
      });
    }
  }

  function boot(){
    initEls();

    if(!els.btnOpen){
      return;
    }

    bindClicks();
    bindDrag();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }

  window.CargaDivisionesUI = {
    open: open,
    close: close,
    load: load,
    getState: function(){
      return {
        periodoId: state.periodoId,
        periodoLabel: state.periodoLabel,
        selected: state.selected,
        config: state.config,
        carreras: state.carreras
      };
    }
  };
})(window, document);