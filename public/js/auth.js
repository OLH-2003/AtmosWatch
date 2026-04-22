const AUTH = (() => {
	
	async function requireAuth() {
		const res = await fetch("/api/validate", {
			method: "GET",
			credentials: "include"
		});
		
		if (!res.ok) {
			sessionStorage.setItem("returnTo", window.location.pathname);
			window.location.href = "login.html";
		}
	}

	async function logout() {
		await fetch("/api/logout", {
			method: "POST",
			credentials: "include"
		});

		const toast = document.getElementById("logout-toast");
		toast.classList.remove("hidden");
		toast.classList.add("show");
		
		setTimeout(() => {
			window.location.href = "index.html";
		}, 1500);
	}

	return {
		requireAuth,
		logout
	};
})();
