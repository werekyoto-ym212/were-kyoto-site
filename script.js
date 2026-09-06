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

const contactForm = document.querySelector("[data-contact-form]");
if (contactForm) {
  const status = contactForm.querySelector("[data-form-status]");
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const turnstileContainer = contactForm.querySelector("[data-turnstile-container]");
  let turnstileWidgetId;

  const setStatus = (message) => {
    if (!status) return;
    status.textContent = message;
    if (message) status.focus();
  };
  const setReady = (ready) => {
    if (submitButton) submitButton.disabled = !ready;
  };

  const loadTurnstile = async () => {
    try {
      const response = await fetch("/api/contact/config", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("configuration unavailable");
      const { sitekey } = await response.json();
      if (!sitekey || !turnstileContainer) throw new Error("configuration incomplete");
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        turnstileContainer.replaceChildren();
        turnstileWidgetId = window.turnstile.render(turnstileContainer, {
          sitekey,
          action: "contact",
          theme: "light",
          callback: () => setReady(true),
          "expired-callback": () => setReady(false),
          "error-callback": () => {
            setReady(false);
            setStatus("安全確認を完了できませんでした。時間をおいて再度お試しください。");
          },
        });
      };
      script.onerror = () => setStatus("安全確認を読み込めませんでした。時間をおいて再度お試しください。");
      document.head.append(script);
    } catch {
      if (turnstileContainer) turnstileContainer.textContent = "現在フォームを利用できません。下記メールをご利用ください。";
      setStatus("送信設定を確認できませんでした。恐れ入りますが、下記メールをご利用ください。");
    }
  };

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    setReady(false);
    setStatus("送信しています。");
    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: new FormData(contactForm),
        headers: { Accept: "application/json" },
      });
      if (response.redirected && new URL(response.url).pathname === "/thanks/") {
        window.location.assign(response.url);
        return;
      }
      const body = await response.json().catch(() => ({}));
      setStatus(body.message || "送信できませんでした。入力内容を確認して、もう一度お試しください。");
    } catch {
      setStatus("通信に失敗しました。入力内容は残っています。時間をおいて再度お試しください。");
    } finally {
      if (window.turnstile && turnstileWidgetId !== undefined) window.turnstile.reset(turnstileWidgetId);
    }
  });

  loadTurnstile();
}
