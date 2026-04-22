// -------------------------------------------------------
// VISUAL LAYERS
// -------------------------------------------------------
var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var street = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png', { // was voyager_labels_under
	attribution: '©OpenStreetMap, ©CartoDB'
});

var mapNames = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png', {
	attribution: '©OpenStreetMap, ©CartoDB'
});



// -------------------------------------------------------
// CREATES MAP
// -------------------------------------------------------

var map = L.map('map', {
	    minZoom: 6, // Zoom out
	    maxZoom: 18, // Zoom in
	    maxBounds: [ // Restrict to UK view
		            [47.0, -20.0],
		            [64.0, 14.0]
		        ],
	    maxBoundsViscosity: 1.0, // Prevents panning
	    layers: [street] // Default view setting (Street vs Satellite)
}).setView([55.3781, -3.4360], 8); // Default view somewhere in middle of UK (on refresh)

// topcenter support is provided by UILayer.js during map initialization
map.createPane('labels');
map.getPane('labels').style.zIndex = 650;
map.getPane('labels').style.pointerEvents = 'none';



// -------------------------------------------------------
// GLOBAL VALUES
// -------------------------------------------------------

var slider = document.getElementById('forecastSlider');
var markerClusters = L.markerClusterGroup();

window.layerGroups = {}; //Storing dM_dz layers for filtering
window.activeSquareLayers = []; //Tracks current displayed time series tropo layer

const gradientCache = {};
const CACHE_TTL_MS = 10 * 60 * 1000; //Flush cache after 5 minutes

setInterval(() => {
	for (const key in gradientCache) delete gradientCache[key];
	console.log("Gradient cache cleared.");
}, CACHE_TTL_MS);

//For rendering weather points/ rectangles
const CELL_SIZE_LAT = 0.0625;
const CELL_SIZE_LON = 0.0625;

var scotlandLayers = [];
if (typeof scotlandNorth !== 'undefined') scotlandLayers.push(scotlandNorth);
if (typeof outerHebrides !== 'undefined') scotlandLayers.push(outerHebrides);
if (typeof shetland !== 'undefined') scotlandLayers.push(shetland);
var scotlandDNO = L.layerGroup(scotlandLayers); // Scotland DNO made up of available DNO geoJSON "boxes"

if (scotlandLayers.length > 0) map.addLayer(scotlandDNO);
if (typeof englandSouth !== 'undefined') map.addLayer(englandSouth);
map.addLayer(markerClusters);

var baseMaps = {
	            "Street": street,
	            "Satellite": satellite
};

var overlayMaps  = { // Layers added can be toggled on or off
	            'Site Markers': markerClusters,
	            'SSEN Scotland': scotlandDNO,
	            'SSEN England': englandSouth,
	            'Map Labels': mapNames
};



// -------------------------------------------------------
// SET COLOUR VALUES FOR TROPOSPHERICS
// -------------------------------------------------------

function getColour(d) {
	return d < -157 ? "#ff0d00" :
	       d < -100 ? "#efff35" :
	       d < -50  ? "#00ff36" :
	       d < -15  ? "#00f0ff" :
	       d < 0    ? "#001afb" :
	       d < 20   ? "#98B092" :
	                  "#ffffff" ;
}



// -------------------------------------------------------
// RENDER GRADIENT LAYERS
// -------------------------------------------------------

async function loadGradientLayer(timestamp) {
	const now = Date.now();

	if (gradientCache[timestamp] && gradientCache[timestamp].expiry > now) {
		renderGradientLayer(gradientCache[timestamp].data);
		return;
	}

	const response = await fetch(`/api/gradients?forecast_time=${timestamp}`);
	const geojson = await response.json();

	gradientCache[timestamp] = {
		data: geojson,
		expiry: now + CACHE_TTL_MS
	};

	renderGradientLayer(geojson);
}

function renderGradientLayer(geojson) {
	
	// Remove old layers before render
	if (window.activeSquareLayers.length > 0) {
		window.activeSquareLayers.forEach(layer => map.removeLayer(layer));
		window.activeSquareLayers = [];
	}
						
	// Null handling for when no tropospherics exist for a time stamp
	if (!geojson || geojson.features.length === 0) {
		console.log("No data for", timestamp);
		return;
	}

	// Group points to layer
	const layers = {};

	// Creating vertical layers based off DB layer_bottom and layer_top combination
	geojson.features.forEach(f => {
		const key = `${f.properties.layer_bottom}_${f.properties.layer_top}`;

		if (!layers[key]) layers[key] = [];
		layers[key].push(f);
	});

	// Build layer
	Object.entries(layers).forEach(([key, features]) => {
		const layerGroup = L.layerGroup();

		features.forEach(f => {
			const lat = f.geometry.coordinates[1];
			const lon = f.geometry.coordinates[0];

			const bounds = [
				[lat - CELL_SIZE_LAT / 2, lon - CELL_SIZE_LON / 2],
				[lat + CELL_SIZE_LAT / 2, lon + CELL_SIZE_LON / 2]
			];

			const rect = L.rectangle(bounds, {
				stroke: false,
				fillOpacity: 0.5,
				// Set value based on gradient value
				fillColor: getColour(f.properties.dm_dz)
			});

			rect.feature = f; // Slider filter for what gradient value is on show 
			rect.addTo(layerGroup);
		});

		window.layerGroups[key] = layerGroup;
		layerGroup.addTo(map);
		window.activeSquareLayers.push(layerGroup);
	});
}



// -------------------------------------------------------
// TIME SERIES UI SLIDER 
// -------------------------------------------------------

function initSlider(times) {	
	noUiSlider.create(slider, {
		start: [0],
		range: {
		'min': 0,
		'max': times.length - 1
		},
		step: 1,
		connect: [true, false],
		behaviour: 'tap-drag',
		tooltips: true,

		pips: {
			mode: 'steps',
			density: 2,
			format: {
				to: (index) => {
					const i = Math.round(index);
					const t = new Date(times[index]);

					if (isNaN(t.getTime())) return '';

					const isNoon = t.getUTCHours() === 12;
					const isFinalStep = i === (times.length - 1);

					if (isNoon && !isFinalStep) {
						return t.toLocaleDateString("en-GB", {
							weekday: 'short',
							day: '2-digit',
							month: 'short',
							timeZone: "UTC"
						});
					}
					return '';
				},
				from: Number
			}
		},

		tooltips: {
			to: (index) => {
				const i = Math.round(index);
				const t = new Date(times[i]);
				return t.toLocaleString("en-GB", {
					weekday: 'short',
					hour: '2-digit',
					minute: '2-digit',
					timeZone: "UTC"
				});
			}
		}
	})
	
	let sliderTimeout = null;

	slider.noUiSlider.on("update", function (values) {
		clearTimeout(sliderTimeout);
		sliderTimeout = setTimeout(() => {
			const index = Math.round(values[0]);
			loadGradientLayer(sliderTimes[index]);
		}, 40);
	});
}

// Slider times
const sliderTimes = [];
const startDateUTC = new Date();
startDateUTC.setUTCHours(0, 0, 0, 0); // Daylight saving means we are no longer GMT +0, need to account for that
for (let i = 0; i < 40; i++) {
	sliderTimes.push(new Date(startDateUTC.getTime() + i * 3 * 3600 * 1000).toISOString());
}

async function preloadAllGradients() {
	const now = Date.now();

	const fetches = sliderTimes.map(async (timestamp) => {
		const response = await fetch(`/api/gradients?forecast_time=${timestamp}`);
		const geojson = await response.json();
		
		gradientCache[timestamp] = {
			data: geojson,
			expiry: now + CACHE_TTL_MS
		};
	});

	await Promise.all(fetches);
	console.log("All gradient timestamps preloaded.");

	const overlay = document.getElementById("loadingOverlay");
	overlay.classList.add("hidden");

	setTimeout(() => overlay.remove(), 500);
}

preloadAllGradients();
initSlider(sliderTimes);



// -------------------------------------------------------
// INJECTION OF REFRACTION CONTROLS TO EXISTING FILTER BOX
// -------------------------------------------------------

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);
document.querySelector('.leaflet-control-layers').classList.add('leaflet-control-layers-expanded');

map.whenReady(() => {
	const overlaysContainer = document.querySelector('.leaflet-control-layers-overlays');

	const customUI = document.createElement('div');
	customUI.id = "customRefractionControls";
	customUI.innerHTML = `
		<h4>Refraction Layers</h4>
		<label style="margin-bottom:4px;"><input type="checkbox" id="toggle_1000_950" checked> 1000–950 Pa</label>
		<label><input type="checkbox" id="toggle_950_925" checked> 950–925 Pa</label>

		<!--<h4>dM/dz Filter</h4>
		<div id="dmSlider"></div>
		<div id="dmValue" style="font-size:11px;margin-top:4px;">
			Showing: −157 to 20 M/km
		</div>-->
	`;

	overlaysContainer.appendChild(customUI);
	initRefractionControls();
});



// -----------------------------------------------------
// REFRACTION CONTROL LOGIC
// -----------------------------------------------------

function initRefractionControls() {

	document.getElementById("toggle_1000_950").addEventListener("change", e => {
		const layer = window.layerGroups["1000_950"];
		if (layer) e.target.checked ? map.addLayer(layer) : map.removeLayer(layer);
	});

	document.getElementById("toggle_950_925").addEventListener("change", e => {
     		const layer = window.layerGroups["950_925"];
		if (layer) e.target.checked ? map.addLayer(layer) : map.removeLayer(layer);
	});

	// Gradient slider
//	const sliderEl = document.getElementById('dmSlider');
//
//	noUiSlider.create(sliderEl, {
//		start: [-157, 20],
//		connect: true,
//		range: { min: -157, max: 20 },
//		step: 1,
//		tooltips: false
//	});
//
//	sliderEl.noUiSlider.on('update', function(values){
//		const min = parseFloat(values[0]);
//		const max = parseFloat(values[1]);
//
//		document.getElementById("dmValue").innerText =
//			`Showing: ${min.toFixed(0)} to ${max.toFixed(0)} M/km`;
//		
//		filterDisplayedSquares(min, max);
//	});
}



// -----------------------------------------------------
// FILTERING FUNCTION
// -----------------------------------------------------

function filterDisplayedSquares(min, max) {
	Object.values(window.layerGroups).forEach(layerGroup => {
		if (!layerGroup) return;

		layerGroup.eachLayer(rect => {
			const dm = rect.feature.properties.dm_dz;
			rect.setStyle({
				fillOpacity: (dm >= min && dm <= max) ? 0.5 : 0
			});
		});
	});
}

// -----------------------------------------------------
// ASSET MARKER LOGIC
// -----------------------------------------------------

const iconBase = 'https://d194u6m477mcvp.cloudfront.net/Assets/MapIcons'; //CloudFront icon location
var IconSize = [40,40];
var IconAnchor = [24,48];
var PopupAnchor = [0,-32];

const icons = {
	SS: L.icon({
		iconUrl: `${iconBase}/SubStationAlt.png`,
		iconSize: IconSize,
		iconAnchor: IconAnchor,
		popupAnchor: PopupAnchor
	}),
	PS: L.icon({
		iconUrl: `${iconBase}/PowerStationAlt.png`,
		iconSize: IconSize,
		iconAnchor: IconAnchor,
		popupAnchor: PopupAnchor
	}),
	RS: L.icon({
	        iconUrl: `${iconBase}/RadioSiteAlt.png`,
	        iconSize: IconSize,
	        iconAnchor: IconAnchor,
	        popupAnchor: PopupAnchor
	}),
	HS: L.icon({
	        iconUrl: `${iconBase}/HydroPowerStationAlt.png`,
	        iconSize: IconSize,
	        iconAnchor: IconAnchor,
	        popupAnchor: PopupAnchor
	}),
	WF: L.icon({
	        iconUrl: `${iconBase}/WindFarmAlt.png`,
	        iconSize: IconSize,
	        iconAnchor: IconAnchor,
	        popupAnchor: PopupAnchor
	}),
};

const defaultIcon = L.icon({
	iconUrl: `${iconBase}/SubStationAlt.png`,
	iconSize: IconSize,
	iconAnchor: IconAnchor,
	popupAnchor: PopupAnchor
});

function iconForType(t) {
	return icons[t] || defaultIcon;
}

async function loadAssetMarkers() {
	const bounds = map.getBounds();
	const bbox = [
		bounds.getWest(),
		bounds.getSouth(),
		bounds.getEast(),
		bounds.getNorth()
	].join(',');

	try {
		const response = await fetch(`/api/assets?bbox=${bbox}`);
		const data = await response.json();

		markerClusters.clearLayers();

		L.geoJSON(data, {
			pointToLayer: function (feature, latlng) {
				const p = feature.properties || {};

				const name = p.location_name || "Unnamed asset";
				const addr = p.location_address || null;
				const pc   = p.location_postcode || null;
				const w3w  = p.w3w || null;
				
				const lat = latlng.lat.toFixed(4);
				const lon = latlng.lng.toFixed(4);
				const lonDir = lon >= 0 ? "E" : "W"; // All coords will be in the Northern Hemisphere

				let html = `<b>${name}</b><br>`;

				if (addr) html += `<br>${addr}`;
				if (pc)   html += `  ${pc}`;
				if (w3w)  html += `<br>What3Words: ${w3w}`;

				html += `<br><br><i>(${lat}° N, ${lon}° ${lonDir})</i>`;

				return L.marker(latlng, { icon: iconForType(p.location_type) })
					.bindPopup(html);
			}
		}).eachLayer(function (layer) {
			markerClusters.addLayer(layer);
		});

	} catch (e) {
		console.error("Error loading asset markers: ", e);
	}
}

map.on('moveend', loadAssetMarkers);
loadAssetMarkers();

// Add MapGoBack control (top-left back arrow) if defined
if (typeof MapGoBack !== 'undefined') {
	map.addControl(new MapGoBack());
}

// Ensure topcenter corner exists (robust fallback)
if (map._controlCorners && !map._controlCorners.topcenter) {
	map._controlCorners.topcenter = L.DomUtil.create('div', 'leaflet-top leaflet-center', map._controlContainer);
}

if (typeof Header !== 'undefined') {
	// Add header when map is ready to be safe
	map.whenReady(function() {
		map.addControl(new Header());
	});
}

document.querySelectorAll('.leaflet-control-layers-base label').forEach(label => {
	  const input = label.querySelector('input[type="radio"]');

	  const wrapper = document.createElement('div');
	  wrapper.classList.add('radio-wrapper-6');

	  label.parentNode.insertBefore(wrapper, label);
	  wrapper.appendChild(label);
});

document.querySelectorAll('.layer-checkbox').forEach(function(checkbox) {
	checkbox.addEventListener('change', function() {
		if (this.checked) {
			map.addLayer(overlayMaps[this.value]);
		} else {
			map.removeLayer(overlayMaps[this.value]);
		}
	
	});
});
