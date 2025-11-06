const header = document.querySelector<HTMLElement>('#site-header');
const toggle = document.querySelector<HTMLButtonElement>('#menu-toggle');
const panel = document.querySelector<HTMLElement>('#site-navigation');
const menus = [
  ...document.querySelectorAll<HTMLDetailsElement>('[data-navigation-menu]'),
];
function closeDropdowns(except?: HTMLDetailsElement) {
  for (const menu of menus) if (menu !== except) menu.open = false;
}
for (const menu of menus) {
  menu.addEventListener('toggle', () => {
    if (menu.open) closeDropdowns(menu);
  });
}
function compactHeader() {
  header?.classList.toggle('is-compact', window.scrollY > 48);
}
compactHeader();
window.addEventListener('scroll', compactHeader, { passive: true });
function closeMenu(returnFocus = false) {
  header?.classList.remove('menu-open');
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.setAttribute('aria-label', 'Open navigation');
  document.body.classList.remove('navigation-open');
  closeDropdowns();
  if (returnFocus) toggle?.focus();
}
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute(
    'aria-label',
    open ? 'Close navigation' : 'Open navigation'
  );
  header?.classList.toggle('menu-open', open);
  document.body.classList.toggle('navigation-open', open);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const opened = menus.find((menu) => menu.open);
    if (opened) {
      opened.open = false;
      opened.querySelector('summary')?.focus();
      return;
    }
    if (toggle?.getAttribute('aria-expanded') === 'true') closeMenu(true);
  }
  if (
    event.key === 'Tab' &&
    toggle?.getAttribute('aria-expanded') === 'true' &&
    panel
  ) {
    const targets = [
      toggle,
      ...panel.querySelectorAll<HTMLElement>('a, summary'),
    ].filter((el) => el.getClientRects().length);
    const first = targets[0],
      last = targets[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
});
document.addEventListener('click', (event) => {
  for (const menu of menus) {
    if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
  }
  const link = (event.target as Element).closest('a');
  if (link && panel?.contains(link)) closeMenu();
});
window.matchMedia('(min-width: 1361px)').addEventListener('change', (e) => {
  if (e.matches) closeMenu();
});
