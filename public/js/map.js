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

var markerClusters = L.markerClusterGroup();
if (typeof markerLayer !== 'undefined' && markerLayer && typeof markerLayer.eachLayer === 'function') {
	markerLayer.eachLayer(function(layer) {
	markerClusters.addLayer(layer);
	});
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
	    'Assets': markerClusters,
	    'Scotland DNO': scotlandDNO,
	    'England DNO': englandSouth,
	    'Map Labels': mapNames
};

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);
document.querySelector('.leaflet-control-layers').classList.add('leaflet-control-layers-expanded');

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
