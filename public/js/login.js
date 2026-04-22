document.getElementById("form_login").addEventListener("submit", async (e) => {
	e.preventDefault();

	const username = document.getElementById("username").value.trim();
	const password = document.getElementById("password").value;

	const res = await fetch("/api/login", {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ username, password })
	});

	if (res.ok) {
		const returnTo = sessionStorage.getItem("returnTo");

		if (returnTo) {
			sessionStorage.removeItem("returnTo");
			window.location.href = returnTo;
		} else {
			window.location.href = "index.html";
		}
	} else {
		document.getElementById("error").textContent = "Invalid username or password";
	}
});
