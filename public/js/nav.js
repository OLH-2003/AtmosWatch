async function updateNavbarAccount() {
	const userLabel = document.getElementById("current-user");
	const loginLogout = document.getElementById("login-logout");
	const changePassword = document.getElementById("change-password");
	const admin = document.getElementById("administration");

	if (!userLabel || !loginLogout || !changePassword || !admin) {
		return;
	}

	try {
		const validate = await fetch("/api/validate", {
			credentials: "include"
		});
		
		if (!validate.ok) {
			userLabel.textContent = "Guest";
		    	changePassword.style.display = "none";
			admin.style.display = "none";
		        loginLogout.textContent = "Login";
		        loginLogout.href = "login.html";
		        return;
		}
		
		const me = await fetch("/api/me", {
			credentials: "include"
		});
		
		const user = await me.json();
		
		userLabel.textContent ="- " + user.username + " -";
		changePassword.style.display = "block";
		admin.style.display = "block";
		loginLogout.textContent = "Logout";
		loginLogout.href = "#";

		changePassword.onclick = async (e) => {
			e.preventDefault();
			loadPasswordChange();
		};
		
		loginLogout.onclick = async (e) => {
		      	e.preventDefault();
		       
			await fetch("/api/logout", {
		       		method: "POST",
		       		credentials: "include"
		       	}); 
		window.location.href = "index.html";
		};

	} catch (err) {
	        console.error("Navbar update error:", err);
	}
}

document.addEventListener("DOMContentLoaded", () => {
	updateNavbarAccount();
	//loadPasswordChange();
});

function initPasswordChange() {
	const modal = document.getElementById("passwordModal");
	const form = document.getElementById("passwordForm");
	
	const currentPass = document.getElementById("currentPassword");
	const newPass = document.getElementById("newPassword");
	const confirmPass = document.getElementById("confirmPassword");
	
	const alertBox = document.getElementById("passwordAlert");
	const strengthBar = document.getElementById("strengthBar");

	const cancelBtn = document.getElementById("cancelPassBtn");

	cancelBtn.onclick = () => {
		modal.style.display = "none";
		clearForm();
		strengthBar.style.width = "0%";
	};

	function calculateStrength(pw) {
		let score = 0;
		if (pw.length >= 8) score ++;
		if (/[A-Z]/.test(pw)) score++;
		if (/[0-9]/.test(pw)) score++;
		if (/[^A-Za-z0-9]/.test(pw)) score++;
		return score;
	}

	newPass.oninput = () => {
		const score = calculateStrength(newPassword.value);

		const widths = ["0%", "25%", "50%", "75%", "100%"];
		const colors = ["red", "orange", "yellow", "lightgreen", "green"];

		strengthBar.style.width = widths[score];
		strengthBar.style.background = colors[score];
	};

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

	form.onsubmit = async (e) => {
		e.preventDefault();

		if (newPass.value !== confirmPass.value) {
			showAlert("New password and confirmation do not match!");
			return;
		}

		if (!currentPass.value || !newPass.value) {
			showAlert("Please complete all fields");
			return;
		}

		const strength = calculateStrength(newPassword.value);
		if (strength < 3) {
			showAlert("Password is too weak. Use at least 8 chars, uppercase, number, and symbol.");
			return;
		}

		const res = await fetch("/api/users/pass", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ 
				old_password: currentPass.value, 
				new_password: newPass.value 
			})
		});

		const data = await res.json();

		if (data.success) {
			alert("Password updated successfully");
			modal.style.display = "none";
			clearForm();
		} else {
			showAlert(data.error || "Error updating password");
			return;
		}
	};
}

async function loadPasswordChange() {
	if (!document.getElementById("passwordModal")) {
		const container = document.createElement("div");
		document.body.appendChild(container);

		const response = await fetch("/popups/password-change.html");
		container.innerHTML = await response.text();
	}

	const modal = document.getElementById("passwordModal");
	modal.style.display = "flex";

	initPasswordChange();
}
