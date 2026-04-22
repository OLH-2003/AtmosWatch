function OpenManage(evt, tabName) {
	const contents = document.getElementsByClassName("admin-content");
	for (let c of contents) c.style.display = "none";

	const tabs = document.getElementsByClassName("admin-tab");
	for (let t of tabs) t.classList.remove("active");

	document.getElementById("admin-" + tabName).style.display = "block";

	evt.currentTarget.classList.add("active");
}

let users = [];
let usersPage = 1;
const usersPerPage = 10;

function getAssetType(T) {
	let type;

	switch (T) {
		case "WF":
			type = "Windfarm";
			break;
		case "PS":
			type = "Power Station";
			break;
		case "HS":
			type = "Hydro Station";
			break;
		case "SS":
			type = "Substation";
			break;
		case "RS":
			type = "Radio Site";
			break;
		default:
			type = "Substation";
	}
	return type;
}

function beautifyCoords(lat, lon) {
	return lat + (lat >= 0 ? "°N" : "°S") + ", " + lon + (lon >= 0 ? "°E" : "°W");

}

async function loadUsers() {
	const res = await fetch("/api/users", { credentials: "include" });
	users = await res.json();
	renderUsers();
}

function renderUsers() {
	const start = (usersPage - 1) * usersPerPage;
	const pageItems = users.slice(start, start + usersPerPage);

	const tbody = document.getElementById("users-table-body");
	tbody.innerHTML = "";

	for (let u of pageItems) {
		tbody.innerHTML += `
			<tr>
				<td style="text-align:center;">${u.username}</td>
				<td>${u.password_changed_at
					? new Date(u.password_changed_at).toLocaleString()
					: "Never"}</td>
				<td>${u.last_logon
					? new Date(u.last_logon).toLocaleString()
					: "Never"}</td>
				<td>
					<button class="admin-action-btn admin-edit" onclick="editUser('${u.id}')">Edit</button>
					<button class="admin-action-btn admin-delete" onclick="deleteUser('${u.id}')">Delete</button>
				</td>
			</tr>
		`;
	}

	renderUsersPagination();
}

function renderUsersPagination() {
	const pages = Math.ceil(users.length / usersPerPage);
	const container = document.getElementById("users-pagination");
	container.innerHTML = "";

	for (let i = 1; i <= pages; i++) {
		container.innerHTML += `
			<button class="admin-page-btn ${i === usersPage ? 'active' : ''}"
				onclick="usersPage=${i}; renderUsers();">${i}</button>
		`;
	}
}

function filterUsers() {
	const q = document.querySelector(".admin-search").value.toLowerCase();
	users = users.filter(u => u.username.toLowerCase().includes(q));
	usersPage = 1;
	renderUsers();
}

let assets = [];
let assetsPage = 1;
const assetsPerPage = 15;

async function loadAssets() {
	const res = await fetch("/api/assets/list", { credentials: "include" });
	assets = await res.json();
	renderAssets();
}

function renderAssets() {
	const start = (assetsPage - 1) * assetsPerPage;
	const pageItems = assets.slice(start, start + assetsPerPage);

	const tbody = document.getElementById("assets-table-body");
	tbody.innerHTML = "";

	for (let a of pageItems) {
		tbody.innerHTML += `
			<tr>
				<td><b>${a.name}</b></td>
				<td>${getAssetType(a.type)}</td>
				<td>${beautifyCoords(a.lat.toFixed(4), a.lon.toFixed(4))}</td>
				<td>
					<button class="admin-action-btn admin-edit" onclick="editAsset('${a.id}')">Edit</button>
					<button class="admin-action-btn admin-delete" onclick="deleteAsset('${a.id}')">Delete</button>
				</td>
			</tr>
		`;
	}

	renderAssetsPagination();
}

function renderAssetsPagination() {
	const pages = Math.ceil(assets.length / assetsPerPage);
	const container = document.getElementById("assets-pagination");
	container.innerHTML = "";

	for (let i = 1; i <= pages; i++) {
		container.innerHTML += `
			<button class="admin-page-btn ${i === assetsPage ? 'active' : ''}"
				onclick="assetsPage=${i}; renderAssets();">${i}</button>
		`;
	}
}

function filterAssets() {
	const q = document.querySelector("#admin-assets .admin-search").value.toLowerCase();
	assets = assets.filter(a => a.name.toLowerCase().includes(q));
	assetsPage = 1;
	renderAssets();
}

document.addEventListener("DOMContentLoaded", () => {
	document.querySelector(".admin-tab").click();
	loadUsers();
	loadAssets();
});

function initUserCreate() {
	const modal = document.getElementById("userCreateModal");
	const form = document.getElementById("userCreateForm");

	const username = document.getElementById("newUserUsername");
	const password = document.getElementById("newUserPassword");
	const confirm = document.getElementById("newUserConfirm");

	const alertBox = document.getElementById("userCreateAlert");
	
	const strengthBar = document.getElementById("userCreateStrengthBar");
	const cancelBtn = document.getElementById("cancelUserCreateBtn");

	cancelBtn.onclick = () => {
		modal.style.display = "none";
		clearForm();
		strengthBar.style.width = "0%";
	}

	function showAlert(msg) {
		alertBox.textContent = msg;
		alertBox.style.display = "block";	
	}

	function clearAlert() {
		alertBox.style.display = "none";
	}

	function calculateStrength(pw) {
		let score = 0;
		if (pw.length >= 8) score++;
		if (/[A-Z]/.test(pw)) score++;
		if (/[0-9]/.test(pw)) score++;
		if (/[^A-Za-z0-9]/.test(pw)) score++;
		return score;
	}

	password.oninput = () => {
		const score = calculateStrength(password.value);
		const widths = ["0%", "25%", "50%", "75%", "100%"];
		const colors = ["red", "orange", "yellow", "lightgreen", "green"];

		strengthBar.style.width = widths[score];
		strengthBar.style.background = colors[score];
	};

        form.onsubmit = async (e) => {
		e.preventDefault();
		clearAlert();

		if (!username.value || !password.value) {
			showAlert("Please complete all fields.");
			return;
		}

		if (password.value !== confirm.value) {
		        showAlert("Passwords do not match.");
		        return;
		}

		const strength = calculateStrength(password.value);
		if (strength < 3) {
		        showAlert("Password is too weak. Use at least 8 chars, uppercase, number, and symbol.");
		        return;
		}

		const res = await fetch("/api/users", {
		        method: "POST",
		        headers: { "Content-Type": "application/json" },
		        credentials: "include",
		        body: JSON.stringify({
		        	username: username.value,
		        	password: password.value
			})
		});

		const data = await res.json();

		if (!data || data.error) {
			showAlert(data.error || "Error creating user.");
			return;
		}

		alert("User created successfully.");
		modal.style.display = "none";
		clearForm();
	};

	function clearForm() {
		form.querySelectorAll('input, textarea').forEach(field => {
			if (field.type !== 'reset' && field.type !== 'button' && field.type !== 'submit') {
				field.value = '';
			}
		});
	}
}

function initAssetCreate() {
	const modal = document.getElementById("assetCreateModal");
	const form = document.getElementById("assetCreateForm");

	const name = document.getElementById("newAssetName");
	const type = document.getElementById("newAssetType");
	const address = document.getElementById("newAssetAddress");
	const postcode = document.getElementById("newAssetPostcode");
	const w3w = document.getElementById("newAssetW3W");
	const Latitude = document.getElementById("Latitude");
	const Longitude = document.getElementById("Longitude");

	const alertBox = document.getElementById("assetCreateAlert");
	const cancelBtn = document.getElementById("cancelAssetCreateBtn");

	cancelBtn.onclick = () => {
		modal.style.display = "none";
		clearForm()
	}

	function showAlert(msg) {
		alertBox.textContent = msg;
		alertBox.style.display = "block";
	}

	function clearAlert() {
		alertBox.style.display = "none";
	}

	function clearForm() {
		form.querySelectorAll('input, textarea').forEach(field => {
			if (field.type !== 'reset' && field.type !== 'button' && field.type !== 'submit') {
				field.value = '';
			}
		});
	}
}

async function loadUserCreate() {
	if (!document.getElementById("userCreateModal")) {
		const container = document.createElement("div");
		document.body.appendChild(container);
 
		const response = await fetch("/popups/user-creation.html");
		container.innerHTML = await response.text();
	}

	const modal = document.getElementById("userCreateModal");
	modal.style.display = "flex";

	initUserCreate();
}

async function loadAssetCreate() {
	if (!document.getElementById("assetCreateModal")) {
		const container = document.createElement("div");
		document.body.appendChild(container);

		const response = await fetch("/popups/asset-creation.html");
		container.innerHTML = await response.text();
	}

	const modal = document.getElementById("assetCreateModal");
	modal.style.display = "flex";

	initAssetCreate();
}

async function deleteUser(id) {
	const res = await fetch(`/api/users/${id}`, {
		method: "DELETE",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ user_id: id })
	});

	return res;
}
