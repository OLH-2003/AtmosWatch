var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	    id: 'MapID',
	    tileSize: 512,
	    zoomOffset: -1,
	    attribution: '@ArcGIS'
});

var street = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png', { // was voyager_labels_under
	    attribution: '©OpenStreetMap, ©CartoDB'
});

var mapNames = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png', {
	   attribution: '©OpenStreetMap, ©CartoDB'
});

var map = L.map('map', {
	    minZoom: 7, // Zoom out
	    maxZoom: 18, // Zoom in
	    maxBounds: [ // Restrict to UK view
		            [48.0, -15.0],
		            [63.0, 10.0]
		        ],
	    maxBoundsViscosity: 1.0, // Prevents panning
	    layers: [street] // Default view setting (Street vs Satellite)
}).setView([55.3781, -3.4360], 8); // Default view somewhere in middle of UK (on refresh)

// topcenter support is provided by UILayer.js during map initialization
map.createPane('labels');
map.getPane('labels').style.zIndex = 650;
map.getPane('labels').style.pointerEvents = 'none';

var slider = document.getElementById('forecastSlider');
var markerClusters = L.markerClusterGroup();

function getColour(d) {
	return d < -157 ? "#ff0000" :
	       d < 0    ? "#ffa500" :
			  "#00ff00";
}

function loadGradientLayer(timestamp) {
	fetch(`/api/gradients?forecast_time=${timestamp}`)
		.then(r => r.json())
		.then(geojson => {
			if (window.gradLayer) map.removeLayer(window.gradLayer);
			
			if (!geojson || geojson.features.length === 0) {
				console.log("No data for", timestamp);
				return;
			}

			window.gradLayer = L.geoJSON(geojson, {
				pointToLayer: (feature, latlng) => {
					return L.circleMarker(latlng, {
						radius: 4,
						color: getColour(feature.properties.dm_dz)
					});
				}
			}).addTo(map);
		});
}


// Prepare variables for time slider
const sliderTimes = [];
const startDateUTC = new Date();
startDateUTC.setUTCHours(0, 0, 0, 0); //Daylight saving causing mayhem
for (let i = 0; i < 40; i++) {
	sliderTimes.push(new Date(startDateUTC.getTime() + i * 3 * 3600 * 1000).toISOString());
}

initSlider(sliderTimes);

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

	slider.noUiSlider.on("update", function (values, handle) {
		const index = Math.round(values[0]);
		const timestamp = times[index];
		loadGradientLayer(timestamp);
	});
}

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
				var hasProps = feature && feature.properties;
				var t    = hasProps ? feature.properties.location_type : null;
				var name = hasProps ? feature.properties.location_name : '';
				var addr = hasProps ? (feature.properties.location_address || '') : '';
				
				return L.marker(latlng, { icon: iconForType(t)
					}).bindPopup(
						'<b>' + name + '</b><br><br>' +
						(addr ? ('Address <br>' + addr) : '')
					);
			}
		}).eachLayer(function (layer) {
			markerClusters.addLayer(layer);
		});

	} catch (e) {
		console.error("Error loading asset markers: ", e);
	}
}

var scotlandLayers = [];
if (typeof scotlandNorth !== 'undefined') scotlandLayers.push(scotlandNorth);
if (typeof outerHebrides !== 'undefined') scotlandLayers.push(outerHebrides);
if (typeof shetland !== 'undefined') scotlandLayers.push(shetland);
var scotlandDNO = L.layerGroup(scotlandLayers); // Scotland DNO made up of available DNO geoJSON "boxes"

if (scotlandLayers.length > 0) map.addLayer(scotlandDNO);
if (typeof englandSouth !== 'undefined') map.addLayer(englandSouth);
map.addLayer(markerClusters);

var baseMaps = {
	    "Streets": street,
	    "Satellite": satellite
};

var overlayMaps  = { // Layers added can be toggled on or off
	    'Site Markers': markerClusters,
	    'SSEN Scotland': scotlandDNO,
	    'SSEN England': englandSouth,
	    'Map Labels': mapNames
};

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);
document.querySelector('.leaflet-control-layers').classList.add('leaflet-control-layers-expanded');

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
