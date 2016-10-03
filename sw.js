var dbs = new Map(); // name --> Promise<IDBDatabase>


console.log("SW startup");
var CACHE_NAME = 'Service';
var urlsToCache = [   	     
  './file/file.pdf' ,    	
      ]; 

//var version = 'v1::';	
self.addEventListener("install", function(event) {
  console.log("WORKER: install event in progress.");
  event.waitUntil(   
    caches 
    //  .open(version + 'fundamentals')   
      .open(CACHE_NAME)   
       .then(function(cache) {
	console.log("allow ?");       
   	//  return cache.put(urlsToCache, new Response("From the cache!"));    
   	 return cache.addAll(urlsToCache);     
      })
      .then(function() {
        console.log("WORKER: install completed");     
      })	
  );
});



 self.addEventListener('activate', function(event) {
console.log("Activating...");
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName !== CACHE_NAME;	    
        })
      //   console.log("Activated");
       .map(function(cacheName) {
        console.log('Deleting '+ cacheName);
     return caches(cacheName);
       }) 
      ); 
    })
  );
});



self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.hostname !== 'indexeddb.test') return;

  var parts = url.pathname.split('/');
  var database = parts[1];
  var store = parts[2];
  var index = parts[3];
  var query = new Map(url.search.substring(1).split('&').map(kv => kv.split('=')));
  var key = query.get('key');
  var path = query.get('path');

  if (!dbs.has(database)) {
    dbs.set(database, new Promise((resolve, reject) => {
      var request = indexedDB.open(database);
      // Abort the open if it was not already populated.
      request.onupgradeneeded = e => request.transaction.abort();
      request.onerror = e => reject(request.error);
      request.onsuccess = e => resolve(request.result);
    }));
  }

  event.respondWith(
    dbs.get(database).then(db => new Promise((resolve, reject) => {
      var tx = db.transaction(store);
      var request = !index
            ? tx.objectStore(store).get(key)
            : tx.objectStore(store).index(index).get(key);

      request.onerror = e => reject(request.error);
      request.onsuccess = e => {
        var result = request.result;
        if (path) path.split('.').forEach(id => { result = result[id]; });
        resolve(new Response(result));
      };
    })));
});