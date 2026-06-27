// Cache de mapas offline
const MAP_CACHE_NAME = 'netpin-map-v1';

const OFFLINE_ZOOM_MIN = 14;
const OFFLINE_ZOOM_MAX = 18;

const CARTO_STYLE = 'dark_all';

const TILE_PADDING = 2;

const CARTO_SUBDOMAINS = [
    'a',
    'b',
    'c',
    'd'
];

const OFFLINE_BOUNDS = {
    west:  -64.90679740905763,
    south: -24.270987807596814,
    east:  -64.80869293212892,
    north: -24.193424120632876
};

const map = L.map('map');

function lon2tile(lon, zoom) {

    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));

}

function lat2tile(lat, zoom) {

    return Math.floor(
        (
            1 -
            Math.log(
                Math.tan(lat * Math.PI / 180) +
                1 / Math.cos(lat * Math.PI / 180)
            ) / Math.PI
        ) / 2 *
        Math.pow(2, zoom)
    );

}

function getOfflineTiles(zoom) {

    const {
        west,
        south,
        east,
        north
    } = OFFLINE_BOUNDS;

    const xMin = lon2tile(west, zoom);
    const xMax = lon2tile(east, zoom);

    const yMin = lat2tile(north, zoom);
    const yMax = lat2tile(south, zoom);

    const tiles = [];

    for (
        let x = xMin - TILE_PADDING;
        x <= xMax + TILE_PADDING;
        x++
    ) {

        for (
            let y = yMin - TILE_PADDING;
            y <= yMax + TILE_PADDING;
            y++
        ) {

            tiles.push({
                x,
                y,
                zoom
            });

        }

    }

    return tiles;

}

function getExpectedTileCount() {

    let total = 0;

    for (
        let zoom = OFFLINE_ZOOM_MIN;
        zoom <= OFFLINE_ZOOM_MAX;
        zoom++
    ) {

        total +=
            getOfflineTiles(zoom).length;

    }

    return total;

}

const EXPECTED_TILE_COUNT = getExpectedTileCount();

async function isOfflineMapDownloaded() {

    const cache =
        await caches.open(
            MAP_CACHE_NAME
        );

    const keys =
        await cache.keys();

    return (
        keys.length >= EXPECTED_TILE_COUNT
    );

}

function showToast(message, persistent = false) {

    const toast = document.getElementById('toast');

    toast.textContent = message;
    toast.classList.add('visible');

    clearTimeout(toast._timer);

    if (!persistent) {

        toast._timer = setTimeout(() => { toast.classList.remove('visible'); }, 2000);

    }
}

function hideToast() {

    const toast = document.getElementById('toast');

    clearTimeout(toast._timer);

    toast.classList.remove('visible');

}

function shouldDownloadOfflineMaps() {

    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
    );

}

function getTileUrl(tile) {

    const subdomain =
        CARTO_SUBDOMAINS[
            (tile.x + tile.y) %
            CARTO_SUBDOMAINS.length
        ];

    return `https://${subdomain}.basemaps.cartocdn.com/${CARTO_STYLE}/${tile.zoom}/${tile.x}/${tile.y}.png`;

}

async function downloadTilesForZoom(zoom) {

    const cache =
        await caches.open(
            MAP_CACHE_NAME
        );

    const tiles =
        getOfflineTiles(zoom);

    let downloaded = 0;

    for (const tile of tiles) {

        const url =
            getTileUrl(tile);

        try {

            await cache.add(url);

            downloaded++;

        }
        catch (error) {

            console.warn('Error descargando:', url);
        }

    }

    console.log(`Zoom ${zoom}: ${downloaded}/${tiles.length} tiles`);

}

async function downloadOfflineMaps() {

    for (
        let zoom = OFFLINE_ZOOM_MIN;
        zoom <= OFFLINE_ZOOM_MAX;
        zoom++
    ) {

        console.log(`Descargando zoom ${zoom}...`);

        await downloadTilesForZoom(zoom);

    }

    hideToast();

    console.log('Pimba! Mapa offline completo');

    showToast('🗺️ Mapa offline listo');

}

function printOfflineStats() {

    let total = 0;

    for (
        let zoom = OFFLINE_ZOOM_MIN;
        zoom <= OFFLINE_ZOOM_MAX;
        zoom++
    ) {

        const count =
            getOfflineTiles(zoom).length;

        total += count;

        console.log(`Zoom ${zoom}: ${count} tiles`);

    }

    console.log(`Total: ${total} tiles`);

}

async function printCacheStats() {

    const cache =
        await caches.open(
            MAP_CACHE_NAME
        );

    const keys =
        await cache.keys();

    let totalBytes = 0;

    for (const request of keys) {

        const response =
            await cache.match(request);

        if (!response) {
            continue;
        }

        const blob =
            await response.blob();

        totalBytes += blob.size;

    }

    const totalMB =
        (totalBytes / 1024 / 1024)
            .toFixed(2);

    console.log(
        `Cache: ${keys.length} tiles | ${totalMB} MB`
    );

}

function initMap(data) {

    const groups = {};

    data.features.forEach(feature => {

        const coords = feature.geometry.coordinates;

        const key = `${coords[0]},${coords[1]}`;

        if (!groups[key]) {
            groups[key] = [];
        }

        groups[key].push(feature);
    });

    const totalAPs = data.features.length;

    const totalLocations = Object.keys(groups).length;

    document.getElementById('stats').textContent = `${totalAPs} APs | ${totalLocations} ubicaciones`;

    const markerGroup = L.featureGroup();
    const markers = [];

    Object.values(groups).forEach(features => {

        const coords = features[0].geometry.coordinates;

        const latlng = [
            coords[1],
            coords[0]
        ];

        const marker = L.circleMarker(latlng, {

            radius: Math.min(10 + (features.length - 1) * 2, 16),

            color: '#000000',
            weight: 2,

            fillColor: '#FF00FF',
            fillOpacity: 0.9
        });

        let popupHtml = `<b>📶 ${features.length} red(es) Wi-Fi</b><hr>`;

        features.forEach(feature => {

            const p = feature.properties;

            popupHtml += `
                <b>${p.SSID}</b><br>
                ID: ${p.ID}<br>
                Contraseña: ${p.Password}<br>
                ${p.BSSID ? `BSSID: ${p.BSSID}<br>` : ''}
                ${p.Signal ? `Señal: ${p.Signal} dB<br>` : ''}
                ${p.Notes ? `Notas: ${p.Notes}<br>` : ''}
                <button class="copy-ssid" data-value="${p.SSID}">📋 Copiar SSID</button>
                <button class="copy-password" data-value="${p.Password}">🔑 Copiar Contraseña</button>
                <button class="show-qr" data-ssid="${p.SSID}" data-password="${p.Password}">📱 Ver QR</button><br>
                <br>
            `;
        });

        marker.bindPopup(popupHtml);
        marker._features = features;
        markers.push(marker);

        markerGroup.addLayer(marker);
    });

    markerGroup.addTo(map);

    map.on('popupopen', () => {
        document.querySelectorAll('.copy-ssid').forEach(button => {
            button.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(button.dataset.value);
                    showToast('📋 SSID copiado');
                } catch (err) {
                    console.error(err);
                }
            };
        });

        document.querySelectorAll('.copy-password').forEach(button => {
            button.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(button.dataset.value);
                    showToast('🔑 Contraseña copiada');
                } catch (err) {
                    console.error(err);
                }
            };
        });

        document.querySelectorAll('.show-qr').forEach(button => {
            button.onclick = () => {
                const ssid = button.dataset.ssid;
                const password = button.dataset.password;
                const wifiString = `WIFI:T:WPA;S:${ssid};P:${password};;`;
                document.getElementById('qr-title').textContent = ssid;
                const qrContainer = document.getElementById('qr-code');
                qrContainer.innerHTML = '';

                new QRCode(
                    qrContainer,
                    {
                        text: wifiString,
                        width: 220,
                        height: 220
                    }
                );

                document.getElementById('qr-modal').classList.add('visible');
            };
        });
    });

    document.getElementById('qr-close').addEventListener('click', () => {
        document.getElementById('qr-modal').classList.remove('visible');
    });

    const search = document.getElementById('search');
    const clearSearch = document.getElementById('clear-search');
    const stats = document.getElementById('stats');

    search.addEventListener('input', () => {

        let filteredAPs = 0;
        let filteredLocations = 0;

        const query = search.value.trim().toLowerCase();

        clearSearch.classList.toggle('visible', query.length > 0);

        markerGroup.clearLayers();

        markers.forEach(marker => {

            const match = marker._features.some(f => {

                const ssid = (f.properties.SSID || '').toLowerCase();

                const bssid = (f.properties.BSSID || '').toLowerCase();

                const normalizedBssid = bssid.replaceAll(':', '');

                const normalizedQuery = query.replaceAll(':', '');

                return (ssid.includes(query) || bssid.includes(query) || normalizedBssid.includes(normalizedQuery));
            });

            if (query === '' || match) {
                markerGroup.addLayer(marker);
                filteredLocations++;
                filteredAPs += marker._features.length;
            }
        });

        if (query === '') {
            stats.textContent = `${totalAPs} APs | ${totalLocations} ubicaciones`;
        }
        else {
            stats.textContent = `${filteredAPs} de ${totalAPs} APs | ${filteredLocations} de ${totalLocations} ubicaciones`;
        }
    });

    clearSearch.addEventListener('click', () => {

        search.value = '';

        clearSearch.classList.remove('visible');

        markerGroup.clearLayers();

        markers.forEach(marker => {
            markerGroup.addLayer(marker);
        });

        search.focus();

        stats.textContent = `${totalAPs} APs | ${totalLocations} ubicaciones`;
    });

    if (markerGroup.getLayers().length > 0) {
        map.fitBounds(
            markerGroup.getBounds(),
            {
                padding: [30, 30]
            }
        );
    }
}

L.tileLayer(
    `https://{s}.basemaps.cartocdn.com/${CARTO_STYLE}/{z}/{x}/{y}.png`,
    {
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap & CARTO',
        detectRetina: false
    }
).addTo(map);

fetch(`https://docs.google.com/spreadsheets/d/1qjqCdRiGl4L53UhWzyDBe5Qs8mlEf9BnRDJ2udW1rH8/gviz/tq?tqx=out:json`)
    .then(response => response.text())
    .then(text => {

        const json = JSON.parse(text.substring(47).slice(0, -2));

        const rows = json.table.rows;

        const data = {
            type: "FeatureCollection",
            features: []
        };

        rows.forEach(row => {

            const id = row.c[0]?.v ?? null;
            const ssid = row.c[1]?.v ?? "";
            const bssid = row.c[2]?.v ?? null;
            const password = row.c[3]?.v ?? "";
            const signal = row.c[4]?.v ?? null;
            const notes = row.c[5]?.v ?? "";
            const longitude = Number(row.c[6]?.v);
            const latitude = Number(row.c[7]?.v);

            if (Number.isNaN(longitude) || Number.isNaN(latitude)) {
                return;
            }

            data.features.push({

                type: "Feature",

                properties: {
                    ID: id,
                    SSID: ssid,
                    BSSID: bssid,
                    Password: password,
                    Signal: signal,
                    Notes: notes
                },

                geometry: {
                    type: "Point",
                    coordinates: [
                        longitude,
                        latitude
                    ]
                }
            });
        });

        initMap(data);

        localStorage.setItem('netpin-data', JSON.stringify(data));
    })
    .catch(error => {
        const cached = localStorage.getItem('netpin-data');
        if (cached) {
            initMap(JSON.parse(cached));
            showToast('📡 Datos offline');
        }
        else {
            console.error('Error cargando datos desde Google Sheets:', error);
        }
    });

if ('serviceWorker' in navigator) {

    window.addEventListener('load', () => {

        navigator.serviceWorker
            .register('sw.js')
            .then(async () => {

                console.log('Service Worker registrado');

                if (!shouldDownloadOfflineMaps()) {

                    console.log('Mapa offline disponible solo para la PWA instalada');

                    return;

                }

                if (!(await isOfflineMapDownloaded())) {

                    showToast('🗺️ Descargando mapa offline. Por favor espere...', true);

                    await downloadOfflineMaps();

                }
                else {

                    console.log('Mapa offline ya disponible');

                }
            })
            .catch(console.error);
    });
}
