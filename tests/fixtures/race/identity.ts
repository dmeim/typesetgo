// Fixture identity must exist before application modules initialize their stable identity.
localStorage.setItem("typesetgo_session_id", "self");
localStorage.setItem(
  "typesetgo-theme-mode",
  new URLSearchParams(window.location.search).get("theme") || "dark",
);
