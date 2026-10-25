// Fixture identity must exist before application modules read their stable identity.
export const SELF_SESSION = "fixture-session-self";

localStorage.setItem("typesetgo_session_id", SELF_SESSION);
localStorage.setItem("typesetgo_multiplayer_credential", "a".repeat(64));
localStorage.setItem(
  "typesetgo-theme-mode",
  new URLSearchParams(window.location.search).get("theme") || "dark",
);
