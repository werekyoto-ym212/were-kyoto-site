const menu = document.querySelector('.nav-toggle');
const nav = document.querySelector('#studio-nav');
function closeMenu(restoreFocus = false) {
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'メニューを開く');
  nav.classList.remove('is-open');
  if (restoreFocus) menu.focus();
}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  nav.classList.toggle('is-open', open);
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
window.matchMedia('(max-width:700px)').addEventListener('change', () => closeMenu());

const switches = [...document.querySelectorAll('[data-view]')];
const panels = [...document.querySelectorAll('[data-panel]')];
const status = document.querySelector('#demo-status');
const labels = { collection: '商品一覧', product: '商品詳細', cart: 'カート' };
function showView(view, moveFocus = false) {
  panels.forEach(panel => { panel.hidden = panel.dataset.panel !== view; });
  switches.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
  status.textContent = `${labels[view]}のデザインを表示しました。`;
  if (moveFocus) switches.find(button => button.dataset.view === view).focus({ preventScroll: true });
}
switches.forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => showView(button.dataset.go, true)));
function updateCart(hasItem) {
  document.querySelectorAll('[data-cart-count]').forEach(node => { node.textContent = hasItem ? '(1)' : '(0)'; });
  document.querySelector('#cart-item').hidden = !hasItem;
  document.querySelector('#cart-empty').hidden = hasItem;
  document.querySelector('#cart-total').textContent = hasItem ? '¥24,200' : '¥0';
}
document.querySelector('#demo-add').addEventListener('click', () => {
  document.querySelector('#cart-size').textContent = document.querySelector('#demo-size').value;
  updateCart(true);
  showView('cart', true);
  status.textContent = 'デモのカートに商品を追加しました。注文や決済は行われません。';
});
document.querySelector('#demo-remove').addEventListener('click', () => {
  updateCart(false);
  switches.find(button => button.dataset.view === 'cart').focus({ preventScroll: true });
  status.textContent = 'デモのカートから商品を削除しました。';
});

// Progressive enhancement: content remains visible without JavaScript or motion.
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('is-waiting');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(element => {
    if (element.getBoundingClientRect().top > window.innerHeight) {
      element.classList.add('is-waiting');
      observer.observe(element);
    }
  });
}
