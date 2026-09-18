const WBDS_THEME_KEY = 'wbds-theme';
const WBDS_LOCALE_KEY = 'wbds-locale';
const wbdsThemeMedia = window.matchMedia?.('(prefers-color-scheme: dark)');
const readStorage = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const writeStorage = (key, value) => { try { localStorage.setItem(key, value); } catch { /* optional */ } };
const resolveSystemTheme = () => wbdsThemeMedia ? (wbdsThemeMedia.matches ? 'dark' : 'light') : 'dark';

const themeIcons = {
  light: '<svg class="wbds-theme-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></svg>',
  system: '<svg class="wbds-theme-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" stroke="none"/></svg>',
  dark: '<svg class="wbds-theme-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.2 8.2 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7Z"/></svg>'
};
const runIcon = '<svg class="wbds-button__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14"/><path d="m12.5 5.5 6.5 6.5-6.5 6.5"/></svg>';

const decorateSegmented = (group) => {
  const buttons = [...group.querySelectorAll('button')];
  if (!buttons.length) return;
  group.style.setProperty('--wb-segment-count', String(buttons.length));
  group.style.setProperty('--wb-segment-index', String(Math.max(0, buttons.findIndex((button) => button.getAttribute('aria-pressed') === 'true'))));
};

const updateTokenReadouts = () => {
  const styles = getComputedStyle(document.documentElement);
  document.querySelectorAll('[data-wb-token-value]').forEach((node) => {
    const token = node.dataset.wbTokenValue;
    const value = token ? styles.getPropertyValue(token).trim() : '';
    if (value) node.textContent = value;
  });
};

const copyText = async (value) => {
  if (!value) return false;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const fallback = document.createElement('textarea');
    fallback.value = value;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.append(fallback);
    fallback.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }

    fallback.remove();
    return copied;
  }
};

const updateCopyFeedback = (trigger, copied) => {
  const initialLabel = trigger.dataset.copyInitialLabel || trigger.getAttribute('aria-label') || 'Copy';
  if (!trigger.dataset.copyInitialLabel) trigger.dataset.copyInitialLabel = initialLabel;

  trigger.dataset.copyState = copied ? 'copied' : 'failed';
  trigger.setAttribute('aria-label', copied ? 'Copied' : 'Copy failed');
  trigger.setAttribute('title', copied ? 'Copied' : 'Copy failed');

  window.setTimeout(() => {
    trigger.dataset.copyState = 'idle';
    trigger.setAttribute('aria-label', initialLabel);
    trigger.setAttribute('title', initialLabel);
  }, 1400);
};

document.addEventListener('click', async (event) => {
  const trigger = event.target.closest('[data-copy-value]');
  if (!trigger) return;
  event.preventDefault();
  const copied = await copyText(trigger.dataset.copyValue || '');
  updateCopyFeedback(trigger, copied);
});

const docsShell = document.querySelector('[data-docs-shell]');

const updateDocsThemeControl = () => {
  const button = document.querySelector('[data-docs-theme-toggle]');
  if (!button) return;
  const current = document.documentElement.dataset.wbTheme === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  button.dataset.currentTheme = current;
  button.setAttribute('aria-label', `Switch to ${next} theme`);
  button.setAttribute('title', `Switch to ${next} theme`);
  updateTokenReadouts();
};

const setDocsTheme = (theme, persist = true) => {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.wbTheme = next;
  document.documentElement.dataset.wbThemeSource = persist ? 'user' : (document.documentElement.dataset.wbThemeSource || 'system');
  if (persist) writeStorage(WBDS_THEME_KEY, next);
  updateDocsThemeControl();
};

const initDocsTheme = () => {
  const stored = readStorage(WBDS_THEME_KEY);
  const explicit = stored === 'light' || stored === 'dark';
  setDocsTheme(explicit ? stored : resolveSystemTheme(), explicit);
  if (!explicit) document.documentElement.dataset.wbThemeSource = 'system';

  document.querySelector('[data-docs-theme-toggle]')?.addEventListener('click', () => {
    setDocsTheme(document.documentElement.dataset.wbTheme === 'dark' ? 'light' : 'dark', true);
  });

  wbdsThemeMedia?.addEventListener?.('change', () => {
    if (document.documentElement.dataset.wbThemeSource === 'system') {
      setDocsTheme(resolveSystemTheme(), false);
    }
  });
};

const localeOrder = ['ko', 'ja', 'en'];
const localeMeta = {
  ko: { short: 'KO', label: '한국어' },
  ja: { short: 'JA', label: '日本語' },
  en: { short: 'EN', label: 'English' }
};

const resolveDocsLocale = (requested, available, fallback) => {
  if (available.includes(requested)) return { resolved: requested, fallbackUsed: false };
  if (available.includes(fallback)) return { resolved: fallback, fallbackUsed: true };
  return { resolved: available[0] || fallback || 'en', fallbackUsed: true };
};

const updateDocsLocale = (requested, persist = true) => {
  if (!docsShell) return;
  const supported = localeOrder.includes(requested) ? requested : (docsShell.dataset.docsDefaultLocale || 'ko');
  const fallback = docsShell.dataset.docsFallbackLocale || 'en';
  const available = (docsShell.dataset.docsPageLocales || 'ko').split(',').map((item) => item.trim()).filter(Boolean);
  const { resolved, fallbackUsed } = resolveDocsLocale(supported, available, fallback);
  const meta = localeMeta[supported];
  const button = document.querySelector('[data-docs-locale-toggle]');
  const status = document.querySelector('[data-docs-locale-status]');

  document.documentElement.dataset.docsLocaleRequested = supported;
  document.documentElement.dataset.docsLocaleResolved = resolved;
  document.documentElement.lang = resolved;

  if (button) {
    button.dataset.docsLocale = supported;
    button.querySelector('[aria-hidden="true"]').textContent = meta.short;
    button.setAttribute('aria-label', `Language: ${meta.label}. Change language`);
    button.setAttribute('title', `Language · ${meta.label}`);
  }

  if (status) {
    if (!fallbackUsed) status.textContent = `Language set to ${localeMeta[resolved]?.label || resolved}.`;
    else if (resolved === fallback) status.textContent = `${meta.label} is unavailable on this page. Showing English fallback.`;
    else status.textContent = `${meta.label} and English fallback are unavailable on this page. Showing ${localeMeta[resolved]?.label || resolved}.`;
  }

  if (persist) writeStorage(WBDS_LOCALE_KEY, supported);
};

const initDocsLocale = () => {
  if (!docsShell) return;
  const stored = readStorage(WBDS_LOCALE_KEY);
  const initial = localeOrder.includes(stored) ? stored : (docsShell.dataset.docsDefaultLocale || 'ko');
  updateDocsLocale(initial, false);

  document.querySelector('[data-docs-locale-toggle]')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.docsLocaleRequested || initial;
    const index = localeOrder.indexOf(current);
    updateDocsLocale(localeOrder[(index + 1) % localeOrder.length], true);
  });
};

const docsMenu = document.querySelector('[data-docs-menu]');
const docsMenuTrigger = document.querySelector('[data-docs-menu-trigger]');
const docsMenuClose = document.querySelector('[data-docs-menu-close]');
const docsMenuNav = document.querySelector('[data-docs-menu-nav]');
const docsMenuStatus = document.querySelector('[data-docs-menu-status]');

const docsSearch = document.querySelector('[data-docs-search]');
const docsSearchTrigger = document.querySelector('[data-docs-search-trigger]');
const docsSearchClose = document.querySelector('[data-docs-search-close]');
const docsSearchInput = document.querySelector('[data-docs-search-input]');
const docsSearchResults = document.querySelector('[data-docs-search-results]');
const docsSearchStatus = document.querySelector('[data-docs-search-status]');

let docsNavigationPromise = null;
let docsSearchItems = [];
let docsSearchActiveIndex = -1;

const loadDocsNavigation = async () => {
  if (!docsShell) return null;
  if (!docsNavigationPromise) {
    docsNavigationPromise = fetch(docsShell.dataset.docsNavigation || '/docs-navigation.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Navigation request failed: ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        docsNavigationPromise = null;
        throw error;
      });
  }
  return docsNavigationPromise;
};

const flattenDocsNavigation = (domains) => {
  const nodes = [];
  const walk = (node, trail = []) => {
    if (!node) return;
    const hierarchy = [...trail, node.title].filter(Boolean);
    nodes.push({ ...node, hierarchy });
    (node.children || []).forEach((child) => walk(child, hierarchy));
  };

  domains.forEach((domain) => {
    const domainTrail = [domain.title].filter(Boolean);
    if (domain.overview) {
      nodes.push({ ...domain.overview, hierarchy: domainTrail });
    }
    (domain.children || []).forEach((child) => walk(child, domainTrail));
  });
  return nodes;
};

const normalizeDocsPath = (value = '/') => {
  const path = value.split('?')[0].split('#')[0] || '/';
  if (path === '/') return '/';
  return `/${path.replace(/^\/+|\/+$/g, '')}/`;
};

const resolveCurrentMenuId = (navigation, currentPath) => {
  const nodes = flattenDocsNavigation(navigation.domains || []);
  const current = normalizeDocsPath(currentPath);
  return nodes.find((node) => normalizeDocsPath(node.slug) === current)?.id
    || nodes.find((node) => (node.legacyHrefs || []).some((href) => normalizeDocsPath(href) === current))?.id
    || null;
};

const createMenuTarget = (node, currentId) => {
  const target = node.availableHref ? document.createElement('a') : document.createElement('span');
  target.className = 'docs-global-menu__target';
  target.textContent = node.title;
  target.dataset.docsMenuItem = node.id;
  if (node.availableHref) target.href = node.availableHref;
  else {
    target.dataset.unavailable = 'true';
    target.setAttribute('aria-disabled', 'true');
  }
  if (node.id === currentId) target.setAttribute('aria-current', 'page');
  return target;
};

const createMenuNode = (node, currentId, depth = 0) => {
  const item = document.createElement('li');
  item.className = 'docs-global-menu__item';
  item.dataset.depth = String(depth);

  const row = document.createElement('div');
  row.className = 'docs-global-menu__row';
  row.append(createMenuTarget(node, currentId));

  if (node.status && !['migration-ready'].includes(node.status)) {
    const status = document.createElement('span');
    status.className = 'docs-global-menu__meta';
    status.textContent = node.status === 'deferred' ? 'Deferred' : node.status === 'audit-pending' ? 'Audit pending' : 'Planned';
    row.append(status);
  }

  item.append(row);

  if (node.children?.length) {
    const list = document.createElement('ul');
    list.className = 'docs-global-menu__list';
    node.children.forEach((child) => list.append(createMenuNode(child, currentId, depth + 1)));
    item.append(list);
  }

  return item;
};

const renderDocsMenu = (navigation) => {
  if (!docsMenuNav || !docsShell) return;
  const currentPath = docsShell.dataset.docsPath || window.location.pathname;
  const currentId = resolveCurrentMenuId(navigation, currentPath);
  docsMenuNav.replaceChildren();

  (navigation.domains || []).forEach((domain) => {
    const section = document.createElement('section');
    section.className = 'docs-global-menu__domain';

    const heading = document.createElement('h3');
    heading.className = 'docs-global-menu__domain-title';
    heading.append(createMenuTarget(domain.overview, currentId));
    section.append(heading);

    const list = document.createElement('ul');
    list.className = 'docs-global-menu__list docs-global-menu__list--root';
    (domain.children || []).forEach((child) => list.append(createMenuNode(child, currentId, 0)));
    section.append(list);
    docsMenuNav.append(section);
  });

  if (docsMenuStatus) docsMenuStatus.textContent = 'Navigation is generated from the WBDS Docs manifest.';
};

const closeDocsMenu = () => {
  if (docsMenu?.open) docsMenu.close();
};

const initDocsMenu = () => {
  if (!docsMenu || !docsMenuTrigger) return;

  docsMenuTrigger.addEventListener('click', async () => {
    try {
      renderDocsMenu(await loadDocsNavigation());
      docsMenu.showModal();
      docsMenuTrigger.setAttribute('aria-expanded', 'true');
      const current = docsMenu.querySelector('[aria-current="page"]');
      const first = docsMenu.querySelector('a, button:not([aria-disabled="true"])');
      queueMicrotask(() => (current || first)?.focus());
    } catch {
      if (docsMenuStatus) docsMenuStatus.textContent = 'Navigation could not be loaded. Reload the page to try again.';
    }
  });

  docsMenuClose?.addEventListener('click', closeDocsMenu);
  docsMenu.addEventListener('click', (event) => {
    if (event.target === docsMenu) closeDocsMenu();
  });
  docsMenu.addEventListener('close', () => {
    docsMenuTrigger.setAttribute('aria-expanded', 'false');
    queueMicrotask(() => docsMenuTrigger.focus());
  });
};

const searchableTextFor = (node) => [
  node.title,
  node.id,
  node.slug,
  node.sourceId,
  ...(node.aliases || []),
  ...(node.hierarchy || [])
].filter(Boolean).join(' ').toLocaleLowerCase();

const setSearchActiveIndex = (index) => {
  if (!docsSearchResults) return;
  const options = [...docsSearchResults.querySelectorAll('[role="option"]:not([aria-disabled="true"])')];
  if (!options.length) {
    docsSearchActiveIndex = -1;
    docsSearchInput?.removeAttribute('aria-activedescendant');
    return;
  }

  docsSearchActiveIndex = ((index % options.length) + options.length) % options.length;
  options.forEach((option, optionIndex) => {
    const active = optionIndex === docsSearchActiveIndex;
    option.dataset.active = String(active);
    option.setAttribute('aria-selected', String(active));
    if (active) {
      docsSearchInput?.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    }
  });
};

const renderDocsSearch = (query = '') => {
  if (!docsSearchResults) return;
  const normalized = query.trim().toLocaleLowerCase();
  const matches = docsSearchItems
    .filter((node) => !normalized || node.searchText.includes(normalized))
    .slice(0, 24);

  docsSearchResults.replaceChildren();
  docsSearchActiveIndex = -1;

  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'docs-global-search-dialog__empty';
    empty.textContent = 'No matching documentation.';
    docsSearchResults.append(empty);
    if (docsSearchStatus) docsSearchStatus.textContent = 'No matching documentation.';
    docsSearchInput?.removeAttribute('aria-activedescendant');
    return;
  }

  matches.forEach((node, index) => {
    const option = document.createElement(node.availableHref ? 'a' : 'div');
    option.className = 'docs-global-search-result';
    option.id = `docs-search-result-${index}`;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.dataset.searchId = node.id;

    if (node.availableHref) option.href = node.availableHref;
    else {
      option.setAttribute('aria-disabled', 'true');
      option.dataset.unavailable = 'true';
    }

    const title = document.createElement('strong');
    title.textContent = node.title;
    const path = document.createElement('span');
    path.textContent = node.hierarchy.join(' › ');
    option.append(title, path);

    if (!node.availableHref) {
      const status = document.createElement('em');
      status.textContent = node.status === 'deferred' ? 'Deferred' : 'Planned';
      option.append(status);
    }

    option.addEventListener('pointermove', () => {
      if (!node.availableHref) return;
      const enabled = [...docsSearchResults.querySelectorAll('[role="option"]:not([aria-disabled="true"])')];
      setSearchActiveIndex(enabled.indexOf(option));
    });

    docsSearchResults.append(option);
  });

  const enabledCount = matches.filter((node) => node.availableHref).length;
  if (docsSearchStatus) docsSearchStatus.textContent = `${matches.length} results, ${enabledCount} available now.`;
};

const prepareDocsSearch = async () => {
  const navigation = await loadDocsNavigation();
  docsSearchItems = flattenDocsNavigation(navigation.domains || []).map((node) => ({
    ...node,
    searchText: searchableTextFor(node)
  }));
  renderDocsSearch('');
};

const openDocsSearch = async () => {
  if (!docsSearch || !docsSearchInput) return;
  try {
    await prepareDocsSearch();
    docsSearch.showModal();
    docsSearchInput.value = '';
    renderDocsSearch('');
    queueMicrotask(() => docsSearchInput.focus());
  } catch {
    if (docsSearchStatus) docsSearchStatus.textContent = 'Search index could not be loaded. Reload the page to try again.';
  }
};

const closeDocsSearch = () => {
  if (docsSearch?.open) docsSearch.close();
};

const initDocsSearch = () => {
  if (!docsSearch || !docsSearchTrigger || !docsSearchInput) return;

  docsSearchTrigger.addEventListener('click', openDocsSearch);
  docsSearchClose?.addEventListener('click', closeDocsSearch);
  docsSearch.addEventListener('click', (event) => {
    if (event.target === docsSearch) closeDocsSearch();
  });
  docsSearch.addEventListener('close', () => {
    docsSearchInput.removeAttribute('aria-activedescendant');
    docsSearchActiveIndex = -1;
    queueMicrotask(() => docsSearchTrigger.focus());
  });

  docsSearchInput.addEventListener('input', () => renderDocsSearch(docsSearchInput.value));
  docsSearchInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSearchActiveIndex(docsSearchActiveIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSearchActiveIndex(docsSearchActiveIndex - 1);
    } else if (event.key === 'Enter' && docsSearchActiveIndex >= 0) {
      const options = [...docsSearchResults.querySelectorAll('[role="option"]:not([aria-disabled="true"])')];
      const active = options[docsSearchActiveIndex];
      if (active?.href) {
        event.preventDefault();
        window.location.href = active.href;
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k';
    if (!shortcut) return;
    event.preventDefault();
    if (docsSearch.open) closeDocsSearch();
    else openDocsSearch();
  });
};

if (docsShell) {
  initDocsMenu();
  initDocsSearch();
}

const ensureLabThemeControl = () => {
  const header = document.querySelector('.lab-header');
  if (!header || header.querySelector('[data-wb-theme-control]')) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'lab-theme';
  wrapper.innerHTML = `<div class="wbds-segmented wbds-theme-segmented" role="group" aria-label="Theme mode" data-wb-theme-control><button type="button" data-wb-theme-choice="light" aria-label="Light" title="Light theme" aria-pressed="true">${themeIcons.light}<span class="wbds-sr-only">Light</span></button><button type="button" data-wb-theme-choice="system" aria-label="System" title="System theme" aria-pressed="false">${themeIcons.system}<span class="wbds-sr-only">System</span></button><button type="button" data-wb-theme-choice="dark" aria-label="Dark" title="Dark theme" aria-pressed="false">${themeIcons.dark}<span class="wbds-sr-only">Dark</span></button></div><span class="lab-theme-status" data-wb-theme-status aria-live="polite">Light</span>`;
  header.append(wrapper);
};

const updateLegacyThemeControls = () => {
  const mode = document.documentElement.dataset.wbTheme || 'light';
  document.querySelectorAll('[data-wb-theme-control]').forEach((root) => {
    const buttons = [...root.querySelectorAll('[data-wb-theme-choice]')];
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.wbThemeChoice === mode)));
    root.style.setProperty('--wb-segment-index', String(Math.max(0, buttons.findIndex((button) => button.dataset.wbThemeChoice === mode))));
  });
  document.querySelectorAll('[data-wb-theme-status]').forEach((status) => {
    status.textContent = mode === 'system' ? `System · ${resolveSystemTheme()}` : `${mode[0].toUpperCase()}${mode.slice(1)}`;
  });
  updateTokenReadouts();
};

const initLegacyTheme = () => {
  ensureLabThemeControl();
  document.querySelectorAll('[data-wb-theme-control]').forEach((root) => {
    root.classList.add('wbds-theme-segmented');
    root.querySelectorAll('[data-wb-theme-choice]').forEach((button) => {
      const mode = button.dataset.wbThemeChoice;
      button.setAttribute('aria-label', mode[0].toUpperCase() + mode.slice(1));
      button.setAttribute('title', `${mode[0].toUpperCase()}${mode.slice(1)} theme`);
      if (!button.querySelector('svg')) button.innerHTML = `${themeIcons[mode]}<span class="wbds-sr-only">${mode}</span>`;
    });
    decorateSegmented(root);
  });

  const stored = readStorage(WBDS_THEME_KEY);
  const initial = ['light', 'system', 'dark'].includes(stored) ? stored : (document.documentElement.dataset.wbTheme || 'light');
  document.documentElement.dataset.wbTheme = initial;
  updateLegacyThemeControls();

  document.querySelectorAll('[data-wb-theme-control]').forEach((root) => root.querySelectorAll('[data-wb-theme-choice]').forEach((button) => button.addEventListener('click', () => {
    document.documentElement.dataset.wbTheme = button.dataset.wbThemeChoice;
    writeStorage(WBDS_THEME_KEY, button.dataset.wbThemeChoice);
    updateLegacyThemeControls();
  })));
};

if (docsShell) {
  initDocsTheme();
  initDocsLocale();
} else {
  initLegacyTheme();
}

document.querySelectorAll('.wbds-button[data-command="true"]').forEach((button) => {
  if (/^Run\b/i.test(button.textContent.trim()) && !button.querySelector('svg')) {
    button.dataset.commandKind = 'run';
    button.insertAdjacentHTML('afterbegin', runIcon);
  }
});

document.querySelectorAll('.wbds-code-block').forEach((block) => { if (!block.hasAttribute('tabindex')) block.tabIndex = 0; });

document.querySelectorAll('[data-tabs]').forEach((root) => {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = [...root.querySelectorAll('[role="tabpanel"]')];
  const activate = (tab, focus = true) => {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab, false));
    tab.addEventListener('keydown', (event) => {
      let next = null;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === 'Home') next = tabs[0];
      if (event.key === 'End') next = tabs[tabs.length - 1];
      if (next) { event.preventDefault(); activate(next); }
    });
  });
});

document.querySelectorAll('.wbds-switch').forEach((button) => button.addEventListener('click', () => button.setAttribute('aria-checked', String(button.getAttribute('aria-checked') !== 'true'))));
document.querySelectorAll('.wbds-segmented:not([data-wb-theme-control])').forEach((group) => {
  decorateSegmented(group);
  group.querySelectorAll('button').forEach((button, index) => button.addEventListener('click', () => {
    group.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    group.style.setProperty('--wb-segment-index', String(index));
  }));
});

/* Presence anatomy is authored in markup. Runtime only resolves size/motion metadata. */
document.querySelectorAll('.wbds-presence-mark').forEach((mark) => {
  const isLarge = mark.classList.contains('review-presence-large');
  if (!mark.dataset.size) mark.dataset.size = isLarge ? 'large' : 'compact';
  if (mark.dataset.state === 'operating' && !mark.dataset.motion) mark.dataset.motion = isLarge ? 'full' : 'compact';
  if (mark.hasAttribute('aria-label')) mark.setAttribute('role', 'img');
});

const dialog = document.querySelector('#review-dialog');
let dialogInvoker = null;
document.querySelector('[data-open-dialog]')?.addEventListener('click', (event) => { dialogInvoker = event.currentTarget; dialog?.showModal(); });
const closeReviewDialog = (returnValue = '') => {
  if (!dialog?.open) return;
  dialog.close(returnValue);
  queueMicrotask(() => dialogInvoker?.focus());
};
document.querySelector('[data-close-dialog]')?.addEventListener('click', () => closeReviewDialog('cancelled'));
document.querySelector('[data-confirm-dialog]')?.addEventListener('click', () => closeReviewDialog('confirmed'));
dialog?.addEventListener('close', () => queueMicrotask(() => dialogInvoker?.focus()));

document.querySelector('[data-recover-field]')?.addEventListener('click', () => {
  const field = document.querySelector('[data-recovery-field]');
  const input = field?.querySelector('input');
  const hint = field?.querySelector('.wbds-field__hint');
  const status = document.querySelector('[data-recovery-status]');
  if (!field || !input || !hint) return;
  input.value = 'https://example.com/callback';
  input.setAttribute('aria-invalid', 'false');
  field.setAttribute('data-state', 'success');
  hint.textContent = '유효한 예시를 적용했습니다. 저장 전 값을 다시 확인하세요.';
  if (status) status.textContent = '오류가 수정되었습니다. 입력 필드로 포커스를 이동합니다.';
  input.focus();
});

const streamStart = document.querySelector('[data-stream-start]');
const streamComplete = document.querySelector('[data-stream-complete]');
const streamResponse = document.querySelector('[data-stream-response]');
const streamRuntime = document.querySelector('[data-stream-runtime]');
const streamStatus = document.querySelector('[data-stream-status]');
const setStreamRuntime = (runtime, label, busy) => {
  streamResponse?.setAttribute('data-runtime', runtime);
  streamResponse?.setAttribute('aria-busy', String(busy));
  streamRuntime?.setAttribute('data-runtime', runtime);
  if (streamRuntime) streamRuntime.textContent = label;
};
streamStart?.addEventListener('click', () => {
  setStreamRuntime('streaming', 'Streaming', true);
  if (streamStatus) streamStatus.textContent = 'AI 응답 생성이 시작되었습니다.';
  if (streamComplete) streamComplete.disabled = false;
});
streamComplete?.addEventListener('click', () => {
  setStreamRuntime('completed', 'Completed', false);
  if (streamStatus) streamStatus.textContent = 'AI 응답 생성이 완료되었습니다.';
  streamComplete.disabled = true;
  streamStart?.focus();
});
