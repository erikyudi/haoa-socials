// Onda 1.F — Sidebar de navegação
// Implementação portada de MazyUI-ui.js:1007-1027 (renderNav + navItemHTML)
// + NAV array em MazyUI-ui.js:4-13.

import { html, render } from '../vendor/lit-html.js';
import { state } from '../core/state.js';
import { listSidebarPanels } from '../core/panels-registry.js';

const GROUP_LS_PREFIX = 'sabec:nav-group:';

function isGroupOpen(id) {
  const stored = localStorage.getItem(GROUP_LS_PREFIX + id);
  return stored === null ? true : stored === '1';
}

function setGroupOpen(id, open) {
  localStorage.setItem(GROUP_LS_PREFIX + id, open ? '1' : '0');
}

export const NAV = [
  { id: 'hoje',       label: 'Hoje',        glyph: 'H' },
  { id: 'chat',       label: 'Chat',        glyph: '/' },
  { id: 'skills',     label: 'Skills',      glyph: 'S' },
  {
    type: 'group',
    id: 'setup',
    label: 'Setup',
    children: [
      { id: 'negocio',    label: 'Negócio',     glyph: 'N' },
      { id: 'tom',        label: 'Tom de voz',  glyph: 'T' },
      { id: 'estrategia', label: 'Estratégia',  glyph: 'E' },
      { id: 'identidade', label: 'Identidade',  glyph: 'I' },
    ],
  },
  { id: 'biblioteca', label: 'Biblioteca',  glyph: 'B' },
  { id: 'agenda',     label: 'Agenda',      glyph: 'A' },
  { id: 'conexoes',   label: 'Conexões',    glyph: '⬡' },
];

function navHasId(id) {
  return NAV.some(item =>
    item.type === 'group'
      ? item.children.some(c => c.id === id)
      : item.id === id
  );
}

function navItem(item, active) {
  return html`
    <button
      class="nav-item ${active ? 'active' : ''}"
      data-id="${item.id}"
      @click="${() => window.Sabec && window.Sabec.setActive(item.id)}"
    >
      <span class="ico">${item.glyph || '·'}</span>
      <span>${item.label}</span>
    </button>
  `;
}

function navGroup(group, activeId) {
  const open     = isGroupOpen(group.id);
  const hasActive = group.children.some(c => c.id === activeId);

  function toggle() {
    setGroupOpen(group.id, !isGroupOpen(group.id));
    window.dispatchEvent(new CustomEvent('sabec:nav'));
  }

  return html`
    <div class="nav-group ${open ? 'open' : ''} ${hasActive ? 'has-active' : ''}">
      <button class="nav-group-header" @click="${toggle}">
        <span class="nav-group-label">${group.label}</span>
        <span class="nav-group-arrow">${open ? '▾' : '›'}</span>
      </button>
      ${open ? html`
        <div class="nav-group-children">
          ${group.children.map(item => navItem(item, item.id === activeId))}
        </div>
      ` : ''}
    </div>
  `;
}

export function renderNav() {
  const sidebar = document.querySelector('.nav') || document.getElementById('nav');
  if (!sidebar) return;

  const internal = NAV;
  let custom = [];
  try {
    custom = listSidebarPanels().filter(p => p.sidebar !== false && !navHasId(p.id));
  } catch (_) {
    // panels-registry ainda não implementado (Onda 1.D) — ignora silenciosamente
  }

  render(html`
    ${internal.map(item =>
      item.type === 'group'
        ? navGroup(item, state.active)
        : navItem(item, state.active === item.id)
    )}
    ${custom.length ? html`<div class="nav-sep" aria-hidden="true"></div>` : ''}
    ${custom.map(item => navItem({
      id:    item.id,
      label: item.label || item.id,
      glyph: (item.glyph || (item.label || item.id).slice(0, 1)).toString().toUpperCase(),
    }, state.active === item.id))}
  `, sidebar);
}
