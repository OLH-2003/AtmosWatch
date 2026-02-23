

var MainForm = L.Control.extend({
  options: {
    position: "topright",
  },

  onAdd: function (map) {
    var container = L.DomUtil.create("div", "leaflet-bar leaflet-control custom-form");

    L.DomEvent.disableClickPropagation(container);

    container.innerHTML = `
      <form id="UIForm">
        <h2 style="text-align:center">Find a FEP</h2>
        <input id="searchFunc" type="text" oninput="runSearch(this);" placeholder="Search here..." />
        <br>
        <table id="resultsTable">
        </table>
        <br>
        <div id="paginationControls" style="margin-top: 10px; text-align: center;"></div>
      </form>
    `;

    return container;
  },
});

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