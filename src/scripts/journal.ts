import './reading-theme';
const body = document.querySelector<HTMLElement>('[data-article-body]');
const progress = document.querySelector<HTMLElement>('.reading-progress');
const progressFill = progress?.querySelector<HTMLElement>('span');
if (body && progress && progressFill) {
  progress.hidden = false;
  const headings = [
    ...body.querySelectorAll<HTMLElement>('h2'),
    document.querySelector<HTMLElement>('#references'),
  ].filter((item): item is HTMLElement => !!item);
  const links = [
    ...document.querySelectorAll<HTMLAnchorElement>('[data-contents-link]'),
  ];
  let pending = false;
  const update = () => {
    pending = false;
    const top = body.getBoundingClientRect().top + scrollY;
    const distance = body.offsetHeight - innerHeight * 0.45;
    progressFill.style.transform = `scaleX(${Math.min(1, Math.max(0, (scrollY + 110 - top) / Math.max(1, distance)))})`;
    let active = headings[0]?.id;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top > 145) break;
      active = heading.id;
    }
    links.forEach((link) => {
      if (link.hash === `#${active}`)
        link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  window.addEventListener('resize', update);
  update();
}
const dialog = document.querySelector<HTMLDialogElement>('#figure-dialog');
const enlarged = document.querySelector<HTMLImageElement>(
  '#figure-dialog-image'
);
const dialogCaption = document.querySelector<HTMLElement>(
  '#figure-dialog-caption'
);
let figureTrigger: HTMLAnchorElement | undefined;
if (dialog && enlarged && typeof dialog.showModal === 'function') {
  document
    .querySelectorAll<HTMLAnchorElement>('a[data-figure]')
    .forEach((link) =>
      link.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        const image = link.querySelector('img');
        if (!image) return;
        event.preventDefault();
        figureTrigger = link;
        enlarged.src = link.href;
        enlarged.alt = image.alt;
        if (dialogCaption)
          dialogCaption.textContent =
            link
              .closest('figure')
              ?.querySelector('figcaption')
              ?.textContent?.trim() ?? image.alt;
        dialog.showModal();
        document.body.classList.add('figure-open');
      })
    );
  dialog
    .querySelector('[data-close-figure]')
    ?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('figure-open');
    figureTrigger?.focus({ preventScroll: true });
  });
}
