const map = L.map('map');

L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {
        attribution: '&copy; OpenStreetMap & CARTO'
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
            const longitude = Number(row.c[4]?.v);
            const latitude = Number(row.c[5]?.v);

            if (Number.isNaN(longitude) || Number.isNaN(latitude)) {
                return;
            }

            data.features.push({

                type: "Feature",

                properties: {
                    ID: id,
                    SSID: ssid,
                    BSSID: bssid,
                    Password: password
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
    })
    .catch(error => {
        console.error('Error cargando datos desde Google Sheets:', error);
    });

function showToast(message) {

    const toast = document.getElementById('toast');

    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.classList.remove('visible'); }, 2000);
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
                BSSID: ${p.BSSID ?? 'N/D'}<br>
                Contraseña: ${p.Password}<br>
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

    search.addEventListener('input', () => {

        const query = search.value.trim().toLowerCase();

        clearSearch.classList.toggle('visible', query.length > 0);

        markerGroup.clearLayers();

        markers.forEach(marker => {

            const match = marker._features.some(f => f.properties.SSID.toLowerCase().includes(query));

            if (query === '' || match) {
                markerGroup.addLayer(marker);
            }
        });
    });

    clearSearch.addEventListener('click', () => {

        search.value = '';

        clearSearch.classList.remove('visible');

        markerGroup.clearLayers();

        markers.forEach(marker => {
            markerGroup.addLayer(marker);
        });

        search.focus();
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
