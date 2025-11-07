import { storageKeys } from './browser-storage';
const root = document.documentElement;
const themeButton = document.querySelector<HTMLButtonElement>('#reading-theme');
function updateThemeButton() {
  const dark = root.dataset.readerTheme === 'dark';
  themeButton?.setAttribute('aria-pressed', String(dark));
  themeButton?.setAttribute(
    'aria-label',
    dark ? 'Switch to light reading theme' : 'Switch to dark reading theme'
  );
  const label = themeButton?.querySelector('[data-theme-label]');
  if (label) label.textContent = dark ? 'Light reading' : 'Dark reading';
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]'
  );
  if (meta) meta.content = dark ? '#111c18' : '#faf9f5';
}
updateThemeButton();
themeButton?.addEventListener('click', () => {
  root.dataset.readerTheme =
    root.dataset.readerTheme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(storageKeys.readingTheme, root.dataset.readerTheme);
  } catch {
    /* The theme also works without storage. */
  }
  updateThemeButton();
});
