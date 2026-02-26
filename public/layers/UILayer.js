document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('UIForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
        });
    }
});

var Key = L.Control.extend({
  options: {
    position: "topright",
  },

  onAdd: function (map) {
    var container = L.DomUtil.create("div", "leaflet-bar leaflet-control custom-form");

    L.DomEvent.disableClickPropagation(container);

    container.innerHTML = `
      <form id="keyForm">
        <!-- Empty for now -->
      </form>
    `;

    return container;
  },
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

// Add an init hook to Leaflet maps so that every map automatically
// supports a "topcenter" control position. This runs before the map's
// _initControlPos method is executed during construction, so the new
// corner exists by the time controls are added.
L.Map.addInitHook(function () {
  console.log('UILayer: init hook running for map', this);
  const originalInitControlPos = this._initControlPos;
  this._initControlPos = function () {
    originalInitControlPos.call(this);

    // Create top center container if it doesn't exist already
    // (use non‑minified property names; control corners may be renamed in some bundles)
    const corners = this._controlCorners || this._c || {};
    const container = this._controlContainer || this._controlContainer || this._m;
    if (corners && container) {
      if (!corners.topcenter) {
        corners.topcenter = L.DomUtil.create('div', 'leaflet-top leaflet-center', container);
        console.log('UILayer: added topcenter corner', corners.topcenter);
      } else {
        console.log('UILayer: topcenter corner already exists', corners.topcenter);
      }
    } else {
      console.warn('UILayer: unable to extend control corners; properties missing', {
        corners: this._controlCorners,
        container: this._controlContainer
      });
    }
  };
});

var Header = L.Control.extend({
	options: {
		position: "topcenter",
	},

	onAdd: function(map) {
		console.log('UILayer: Header.onAdd called', map);
		console.log('UILayer: existing corners', map._controlCorners);
		var container = L.DomUtil.create("div", "leaflet-topcenter-header");
		L.DomEvent.disableClickPropagation(container);

		container.innerHTML = ` 
		<div class="header-box"> 
		<img src="images/logo.png" class="header-logo" /> 
		<h1 class="header-title">AtmosWatch</h1> 
		</div> `
		; 

		return container;
		
	},
});
