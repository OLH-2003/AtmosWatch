L.Map.addInitHook(function () {
	const corners = this._controlCorners;
	const container = this._controlContainer;

	corners.topcenter = L.DomUtil.create('div', 'leaflet-top leaflet-center', container);
	corners.bottomcenter = L.DomUtil.create('div', 'leaflet-bottom leaflet-center', container);
});

var MapGoBack = L.Control.extend({
	options: {
		position: "topleft",
	},

	onAdd: function (map) {
		var container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
    		L.DomEvent.disableClickPropagation(container);


		// Back control: clickable arrow that returns to index.html
    		container.innerHTML = `
      		<a href="index.html" class="map-go-back" title="Back to index">
 	       &#8592;
      		</a>
		`;
		return container;
	},
});

var Header = L.Control.extend({
	options: {
		position: "topcenter",
	},

  onAdd: function(map) {
    var container = L.DomUtil.create("div", "leaflet-topcenter-header");
    L.DomEvent.disableClickPropagation(container);

		container.innerHTML = ` 
		<div class="header-box"> 
		<img src="https://d194u6m477mcvp.cloudfront.net/Assets/logo.png" class="header-logo" /> 
		<h1 class="header-title">Tropospherics Map</h1> 
		</div> `
		; 

		return container;
		
	},
});

var TimeLine = L.Control.extend({
	options: {
		position: "bottomcenter",
	},

  	onAdd: function(map) {
    		var container = L.DomUtil.create("div", "leaflet-bottomcenter-timeline");
    		L.DomEvent.disableClickPropagation(container);

  		container.innerHTML = `
			<div class="timeline-box"></div>
  		`;

		return container;
  	},
});
