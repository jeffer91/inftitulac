(function(window){
  "use strict";

  var cfg = window.BDLConfig;
  var schema = window.BDLSchema;
  var db = null;
  var opening = null;

  if(!cfg || !schema){ throw new Error("BDLConfig y BDLSchema deben cargarse antes de BDLDB."); }

  function req(request){
    return new Promise(function(resolve, reject){
      request.onsuccess = function(){ resolve(request.result); };
      request.onerror = function(){ reject(request.error || new Error("IndexedDB error")); };
    });
  }

  function open(){
    if(db){ return Promise.resolve(db); }
    if(opening){ return opening; }
    opening = new Promise(function(resolve, reject){
      var request = window.indexedDB.open(cfg.dbName, cfg.dbVersion);
      request.onupgradeneeded = function(event){
        var current = event.target.result;
        schema.list().forEach(function(def){
          var store = current.objectStoreNames.contains(def.name) ? event.target.transaction.objectStore(def.name) : current.createObjectStore(def.name, { keyPath: def.keyPath });
          (def.indexes || []).forEach(function(index){
            if(!store.indexNames.contains(index.name)){ store.createIndex(index.name, index.keyPath, { unique: index.unique }); }
          });
        });
      };
      request.onsuccess = function(event){ db = event.target.result; opening = null; resolve(db); };
      request.onerror = function(){ opening = null; reject(request.error || new Error("No se pudo abrir BDLocal")); };
    });
    return opening;
  }

  function store(name, mode){ return open().then(function(current){ return current.transaction(name, mode || "readonly").objectStore(name); }); }
  function get(name, key){ return store(name).then(function(s){ return req(s.get(key)); }); }
  function put(name, value){ return store(name, "readwrite").then(function(s){ return req(s.put(value)); }); }
  function remove(name, key){ return store(name, "readwrite").then(function(s){ return req(s.delete(key)); }); }
  function list(name, options){
    options = options || {};
    return open().then(function(current){
      return new Promise(function(resolve, reject){
        var tx = current.transaction(name, "readonly");
        var s = tx.objectStore(name);
        var source = options.index ? s.index(options.index) : s;
        var range = options.value == null ? null : window.IDBKeyRange.only(options.value);
        var rows = [];
        var skipped = 0;
        var limit = Number(options.limit || 0);
        var offset = Number(options.offset || 0);
        var request = source.openCursor(range);
        request.onsuccess = function(event){
          var cursor = event.target.result;
          if(!cursor){ resolve(rows); return; }
          if(skipped < offset){ skipped += 1; cursor.continue(); return; }
          if(!limit || rows.length < limit){ rows.push(cursor.value); cursor.continue(); return; }
          resolve(rows);
        };
        request.onerror = function(){ reject(request.error); };
      });
    });
  }
  function clear(name){ return store(name, "readwrite").then(function(s){ return req(s.clear()); }); }

  window.BDLDB = { open:open, get:get, put:put, remove:remove, list:list, clear:clear };
})(window);
