const menuToggle = document.querySelector(".menu-toggle");
const headerNav = document.querySelector(".header-nav");
const header = document.querySelector("[data-header]");

if (menuToggle && headerNav) {
  const closeMenu = (restoreFocus = false) => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "メニューを開く");
    headerNav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    if (restoreFocus) menuToggle.focus();
  };
  menuToggle.addEventListener("click", () => {
    const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(willOpen));
    menuToggle.setAttribute("aria-label", willOpen ? "メニューを閉じる" : "メニューを開く");
    headerNav.classList.toggle("is-open", willOpen);
    document.body.classList.toggle("menu-open", willOpen);
  });
  headerNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu()));
  document.addEventListener("keydown", (event) => {
    if (menuToggle.getAttribute("aria-expanded") !== "true") return;
    if (event.key === "Escape") closeMenu(true);
    if (event.key === "Tab") {
      const links = [...headerNav.querySelectorAll("a")];
      const focusable = [...links, menuToggle];
      const current = focusable.indexOf(document.activeElement);
      event.preventDefault();
      focusable[(current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
    }
  });
  window.matchMedia("(max-width: 800px)").addEventListener("change", () => closeMenu());
}

const priceTriggers = [...document.querySelectorAll(".price-trigger")];
const setPriceExpanded = (trigger, expanded) => {
  trigger.setAttribute("aria-expanded", String(expanded));
  const panel = document.getElementById(trigger.getAttribute("aria-controls"));
  if (panel) {
    panel.inert = !expanded;
    panel.setAttribute("aria-hidden", String(!expanded));
  }
};
priceTriggers.forEach((trigger) => {
  setPriceExpanded(trigger, false);
  trigger.addEventListener("click", () => {
    const willOpen = trigger.getAttribute("aria-expanded") !== "true";
    priceTriggers.forEach((item) => setPriceExpanded(item, item === trigger && willOpen));
  });
});

if (header && "IntersectionObserver" in window) {
  const sections = document.querySelectorAll("[data-header-theme]");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) header.dataset.theme = entry.target.dataset.headerTheme;
    });
  }, { rootMargin: "-2px 0px -92% 0px", threshold: 0 });
  sections.forEach((section) => observer.observe(section));
}

const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();
