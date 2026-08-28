const menuToggle = document.querySelector(".menu-toggle");
const headerNav = document.querySelector(".header-nav");
const header = document.querySelector("[data-header]");

if (menuToggle && headerNav) {
  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "メニューを開く");
    headerNav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  };
  menuToggle.addEventListener("click", () => {
    const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(willOpen));
    menuToggle.setAttribute("aria-label", willOpen ? "メニューを閉じる" : "メニューを開く");
    headerNav.classList.toggle("is-open", willOpen);
    document.body.classList.toggle("menu-open", willOpen);
  });
  headerNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
}

document.querySelectorAll(".price-trigger").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const willOpen = trigger.getAttribute("aria-expanded") !== "true";
    document.querySelectorAll(".price-trigger").forEach((item) => item.setAttribute("aria-expanded", "false"));
    trigger.setAttribute("aria-expanded", String(willOpen));
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
