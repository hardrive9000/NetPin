# NetPin

NetPin is a lightweight web-based Wi-Fi mapping tool built with Leaflet and OpenStreetMap.

It displays Wi-Fi Access Points (APs) on an interactive map using data stored in a Google Sheets spreadsheet. Multiple networks located at the same physical location are automatically grouped into a single marker.

## Features

- Interactive map powered by Leaflet
- Dark theme using CARTO Dark Matter tiles
- Google Sheets as a live data source
- Automatic GeoJSON generation in memory
- Grouping of APs sharing the same coordinates
- Dynamic marker sizing based on AP count
- Search APs by SSID in real time
- Responsive design for desktop and mobile devices
- Lightweight and fully client-side
- No backend required

## Data Source

NetPin retrieves data directly from a public Google Sheets document.

Expected columns:

| Column | Description |
|----------|-------------|
| ID | Unique identifier |
| SSID | Wi-Fi network name |
| BSSID | Access Point MAC address |
| Password | Wi-Fi password |
| Longitude | Longitude coordinate |
| Latitude | Latitude coordinate |

Example:

| ID | SSID | BSSID | Password | Longitude | Latitude |
|----|------|--------|----------|-----------|----------|
| 1 | MyWiFi | AA:BB:CC:DD:EE:FF | secret123 | -64.867495 | -24.233452 |

## Technologies

- HTML5
- CSS3
- JavaScript (Vanilla)
- Leaflet
- OpenStreetMap
- CARTO Dark Matter
- Google Sheets Visualization API

## Project Structure

```text
netpin/
│
├── index.html
│
├── assets/
│   ├── css/
│   │   └── styles.css
│   │
│   ├── js/
│   │   └── app.js
│   │
│   └── img/
│       └── favicon/
│
└── README.md
```

## How It Works

1. Data is fetched from Google Sheets.
2. Rows are converted into GeoJSON features.
3. APs sharing identical coordinates are grouped.
4. Markers are rendered on the map.
5. Search filters markers in real time by SSID.

## Mobile Friendly

NetPin is designed to work on:

- Desktop browsers
- Android browsers
- iOS browsers
- Tablets

The interface automatically adapts to different screen sizes.

## Roadmap

Planned features:

- QR code generation for Wi-Fi sharing
- Search by BSSID
- Copy SSID and password buttons
- PWA support
- Offline caching
- Full-screen mode
- Additional filtering options

## License

The Unlicense

## Author

Created as a personal Wi-Fi mapping project using open web technologies.