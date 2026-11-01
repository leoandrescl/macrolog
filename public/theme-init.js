(() => {
  var stored = "dark";
  var prefersLight = false;
  var useLight = false;
  var meta = null;

  try {
    stored = localStorage.getItem("macrolog-theme") || "dark";
    prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    useLight = stored === "light" || (stored === "system" && prefersLight);
    document.documentElement.classList.toggle("light", useLight);
    document.documentElement.style.colorScheme = useLight ? "light" : "dark";
    meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", useLight ? "#f5f7fa" : "#080b0f");
  } catch {
    /* Sin preferencias guardadas, MacroLog usa el tema oscuro. */
  }
})();
