const flowSteps = document.querySelectorAll(".flow-step");
const flowBrowser = document.querySelector(".flow-browser");

if (flowSteps.length && flowBrowser && "IntersectionObserver" in window) {
  document.documentElement.classList.add("flow-enhanced");

  const setFlowStage = (step) => {
    flowSteps.forEach((item) => {
      item.classList.toggle("is-active", item === step);
    });

    flowBrowser.dataset.stage = step.dataset.step;
  };

  const flowObserver = new IntersectionObserver(
    (entries) => {
      const activeEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) =>
          Math.abs(a.boundingClientRect.top + a.boundingClientRect.height / 2 - window.innerHeight / 2)
          - Math.abs(b.boundingClientRect.top + b.boundingClientRect.height / 2 - window.innerHeight / 2)
        )[0];

      if (activeEntry) {
        setFlowStage(activeEntry.target);
      }
    },
    {
      rootMargin: "-38% 0px -38% 0px",
      threshold: 0,
    }
  );

  flowSteps.forEach((step) => flowObserver.observe(step));
  setFlowStage(flowSteps[0]);
}

const menuToggle = document.querySelector(".menu-toggle");
const headerNav = document.querySelector(".header-nav");

if (menuToggle && headerNav) {
  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "メニューを開く");
    headerNav.classList.remove("is-open");
  };

  menuToggle.addEventListener("click", () => {
    const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(willOpen));
    menuToggle.setAttribute("aria-label", willOpen ? "メニューを閉じる" : "メニューを開く");
    headerNav.classList.toggle("is-open", willOpen);
  });

  headerNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

const planTriggers = document.querySelectorAll(".plan-trigger");

if (planTriggers.length) {
  const panelDuration = 400;
  let pendingPlan = null;

  const setPlanState = (trigger, isOpen) => {
    trigger.setAttribute("aria-expanded", String(isOpen));
  };

  planTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const willOpen = trigger.getAttribute("aria-expanded") !== "true";
      const openTrigger = document.querySelector('.plan-trigger[aria-expanded="true"]');

      window.clearTimeout(pendingPlan);

      planTriggers.forEach((item) => setPlanState(item, false));

      if (!willOpen) return;

      if (openTrigger && openTrigger !== trigger) {
        pendingPlan = window.setTimeout(() => setPlanState(trigger, true), panelDuration);
      } else {
        setPlanState(trigger, true);
      }
    });
  });
}

const profileTrigger = document.querySelector(".profile-trigger");
const profilePanel = document.querySelector(".profile-panel");

if (profileTrigger && profilePanel) {
  profileTrigger.addEventListener("click", () => {
    const willOpen = profileTrigger.getAttribute("aria-expanded") !== "true";

    profileTrigger.setAttribute("aria-expanded", String(willOpen));
    profilePanel.setAttribute("aria-hidden", String(!willOpen));
    profilePanel.classList.toggle("is-open", willOpen);
  });
}
