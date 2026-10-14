document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = document.querySelector("#login-button");
  const error = document.querySelector("#login-error");
  button.disabled = true;
  button.textContent = "Verificando…";
  error.hidden = true;
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.username.value, password: form.password.value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
    window.location.assign("/admin");
  } catch (loginError) {
    error.textContent = loginError.message || "Falha de conexão.";
    error.hidden = false;
    button.disabled = false;
    button.textContent = "Entrar no painel";
  }
});
