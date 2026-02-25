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
