// Example to cache core site assets
// Installed in install event listener below
let coreAssets = [
    '/offline.html',
    '/img/fallback.jpg'
];

self.addEventListener('install', function (event) {
	self.skipWaiting();

	event.waitUntil(caches.open('app').then(function (cache) {
		cache.add(new Request('offline.html'));
        
        for (let asset of coreAssets) {
			cache.add(new Request(asset));
		}
        
		return cache;
	}));

});

self.addEventListener('fetch', event => {
	let request = event.request;

	// Bug fix:  https://stackoverflow.com/a/49719964
	if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;

	if (request.headers.get('Accept').includes('text/html')) {
		event.respondWith(
			fetch(request).then(response => {
                // Create a copy of the response and save it to the cache
                let copy = response.clone();
                event.waitUntil(caches.open('app').then(cache => {
                    return cache.put(request, copy);
                }));

				return response;
			}).catch(error => {
				// If there's no item in cache, respond with a fallback
                return caches.match(request).then(response => {
                    return response || caches.match('/offline.html');
                });
			})
		);
	}

    // Images & Fonts - Offline-first
    if (request.headers.get('Accept').includes('image') || request.url.includes('pt-serif')) {
        event.respondWith(
            caches.match(request).then(response => {
                return response || 
                fetch(request).then(response => {
                    if (!response.ok) throw 'failed request';

                    // If the request is for an image, save a copy of it in cache
                    if (request.headers.get('Accept').includes('image')) {
                        let copy = response.clone();
                        event.waitUntil(caches.open('app').then(cache => {
                            return cache.put(request, copy);
                        }));
                    }
                    return response;
                }).catch(() => {
                    if (request.headers.get('Accept').includes('image')) {
                        return caches.match('/img/fallback.jpg');
                    }
                });
            })
        );
    }
});
