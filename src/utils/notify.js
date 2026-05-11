export function notify(message, type = "info", duration = 4000) {
  try {
    const containerId = "app-notify-container";
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      container.style.position = "fixed";
      container.style.right = "16px";
      container.style.top = "16px";
      container.style.zIndex = 9999;
      document.body.appendChild(container);
    }

    const el = document.createElement("div");
    el.textContent = message;
    el.style.background =
      type === "error" ? "#ffefef" : type === "success" ? "#ecfdf5" : "#f1f5f9";
    el.style.color =
      type === "error" ? "#b91c1c" : type === "success" ? "#065f46" : "#0f172a";
    el.style.padding = "10px 14px";
    el.style.marginTop = "8px";
    el.style.borderRadius = "8px";
    el.style.boxShadow = "0 4px 12px rgba(2,6,23,0.08)";
    el.style.fontSize = "14px";
    el.style.maxWidth = "320px";
    el.style.opacity = "0";
    el.style.transition = "opacity 200ms ease, transform 200ms ease";
    el.style.transform = "translateY(-6px)";

    container.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(-6px)";
      setTimeout(() => el.remove(), 200);
    }, duration);
  } catch (e) {
    // fallback
    try {
      alert(message);
    } catch (e) {
      console.log(message);
    }
  }
}
