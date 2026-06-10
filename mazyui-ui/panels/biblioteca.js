// Onda 2.1 — Painel "Biblioteca" (v2, primeiro a portar pra lit-html)
// Fonte: MazyUI-ui.js:1547 (renderBibliotecaInner) + :1594 (closeLibMenu)
// + :1600 (openLibMenu) + :1634 (deleteLibItem) + :1649 (renderBiblioteca).
// Depende de ui/lightbox.js pra abrir os itens.

import { Sabec } from '../core/panels-registry.js';
import { html, render } from '../vendor/lit-html.js';
import { state, update } from '../core/state.js';
import { apiCall, fileUrl } from '../core/api.js';
import { toast } from '../core/dom.js';
import { openLightbox, openSlideFullscreen } from '../ui/lightbox.js';

// ---------------------------------------------------------------------------
// Constantes (portadas de MazyUI-ui.js:413-435)
// ---------------------------------------------------------------------------

const FORMAT_ASPECT = {
  instagram:   '4/5',
  quadrado:    '1/1',
  stories:     '9/16',
  horizontal:  '16/9',
  vertical:    '3/4',
  pinterest:   '2/3',
  'link-card': '1.91/1',
  classico:    '4/3',
};

const FORMAT_DIMS = {
  instagram:   { w: 1080, h: 1350 },
  quadrado:    { w: 1080, h: 1080 },
  stories:     { w: 1080, h: 1920 },
  horizontal:  { w: 1920, h: 1080 },
  vertical:    { w: 1080, h: 1440 },
  pinterest:   { w: 1000, h: 1500 },
  'link-card': { w: 1200, h: 628  },
  classico:    { w: 1200, h: 900  },
};

// ---------------------------------------------------------------------------
// Helpers (portados de MazyUI-ui.js:437-465)
// ---------------------------------------------------------------------------

function isHtmlPath(p) {
  return typeof p === 'string' && /\.html?$/i.test(p);
}

function getPrimaryFormat(item) {
  if (!item.formats) return null;
  if (item.formats.instagram) return 'instagram';
  return Object.keys(item.formats)[0] || null;
}

function itemAspect(item) {
  return FORMAT_ASPECT[getPrimaryFormat(item)] || '4/5';
}

// ---------------------------------------------------------------------------
// Agenda helpers
// ---------------------------------------------------------------------------

function getAgendaInfo(itemName) {
  const items = state._agenda?.items || [];
  const matches = items.filter(i => i.carrosselName === itemName);
  if (!matches.length) return null;
  const pending = matches.find(i => i.status === 'pendente');
  if (pending) return pending;
  const erro = matches.find(i => i.status === 'erro');
  if (erro) return erro;
  return matches[matches.length - 1];
}

function getCarrosselPath(item) {
  if (!item.slides || !item.slides.length) return 'marketing/conteudo/' + item.name;
  const slide = String(item.slides[0]).replace(/\\/g, '/');
  const parts = slide.split('/');
  const idx = parts.indexOf('conteudo');
  if (idx >= 0 && idx + 1 < parts.length) return parts.slice(0, idx + 2).join('/');
  return 'marketing/conteudo/' + item.name;
}

function formatShortDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch { return '?'; }
}

function sortedLibIndices(lib) {
  const dateRe = /-(\d{4}-\d{2}-\d{2})(?:-\d+)?$/;
  return lib
    .map((item, i) => {
      const m = dateRe.exec(item.name || '');
      return { i, date: m ? m[1] : '0000-00-00' };
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(x => x.i);
}

function openScheduleModal(item) {
  const existing = document.getElementById('schedule-modal');
  if (existing) existing.remove();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);
  const displayName = (item.name || '').replace(/^(carrossel|post)-/, '').replace(/-/g, ' ');
  const coverPath = item.slides && item.slides[0] ? fileUrl(item.slides[0]) : '';
  const slideCount = item.slides?.length || 0;
  const carrosselPath = getCarrosselPath(item);

  const backdrop = document.createElement('div');
  backdrop.id = 'schedule-modal';
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
  backdrop.innerHTML = `
    <div style="background:var(--paper,#fff);border-radius:10px;padding:20px;width:320px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,.2);">
      <div style="font-weight:700;font-size:15px;margin-bottom:14px;">📅 Agendar no Instagram</div>
      <div style="background:var(--paper-2,#f9fafb);border:1px solid var(--border,#e5e7eb);border-radius:6px;padding:8px 10px;margin-bottom:14px;display:flex;gap:8px;align-items:center;">
        ${coverPath ? `<img src="${coverPath}" width="32" height="32" style="object-fit:cover;border-radius:3px;flex-shrink:0;" onerror="this.style.display='none'">` : '<div style="width:32px;height:32px;background:var(--paper-2,#e5e5e5);border-radius:3px;flex-shrink:0;"></div>'}
        <div>
          <div style="font-size:13px;font-weight:600;">${displayName}</div>
          <div style="font-size:11px;color:var(--ink-muted,#666);">${slideCount} slide${slideCount === 1 ? '' : 's'}</div>
        </div>
      </div>
      <div style="margin-bottom:10px;">
        <div style="font-size:12px;color:var(--ink-muted,#6b7280);margin-bottom:4px;">Data</div>
        <input id="sched-date" type="date" class="input" value="${defaultDate}" style="width:100%;box-sizing:border-box;" />
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;color:var(--ink-muted,#6b7280);margin-bottom:4px;">Hora</div>
        <input id="sched-time" type="time" class="input" value="10:00" style="width:100%;box-sizing:border-box;" />
      </div>
      <div style="display:flex;gap:8px;">
        <button id="sched-confirm" class="btn btn-primary" style="flex:1;">Confirmar</button>
        <button id="sched-cancel" class="btn btn-secondary">Cancelar</button>
      </div>
      <div id="sched-error" style="display:none;margin-top:10px;font-size:12px;color:#ef4444;"></div>
    </div>
  `;
  document.body.appendChild(backdrop);

  backdrop.querySelector('#sched-confirm').onclick = async () => {
    const dateVal = backdrop.querySelector('#sched-date').value;
    const timeVal = backdrop.querySelector('#sched-time').value;
    const errEl = backdrop.querySelector('#sched-error');
    if (!dateVal || !timeVal) {
      errEl.textContent = 'Preencha data e hora.';
      errEl.style.display = '';
      return;
    }
    const dataHora = new Date(`${dateVal}T${timeVal}:00`).toISOString();
    const btn = backdrop.querySelector('#sched-confirm');
    btn.disabled = true;
    btn.textContent = 'Agendando…';
    try {
      await apiCall('POST', '/api/agenda/add', { carrosselName: item.name, carrosselPath, dataHora });
      const currentItems = state._agenda?.items || [];
      update({ _agenda: { ...(state._agenda || {}), items: [...currentItems, { id: Date.now().toString(), carrosselName: item.name, carrosselPath, dataHora, status: 'pendente' }] } });
      toast('Agendado para ' + new Date(dataHora).toLocaleDateString('pt-BR'));
      backdrop.remove();
    } catch (e) {
      errEl.textContent = 'Erro: ' + (e.message || 'falha ao agendar');
      errEl.style.display = '';
      btn.disabled = false;
      btn.textContent = 'Confirmar';
    }
  };
  backdrop.querySelector('#sched-cancel').onclick = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
}

// ---------------------------------------------------------------------------
// Menu flutuante (portado de MazyUI-ui.js:1594-1632)
// ---------------------------------------------------------------------------

function closeLibMenu() {
  const m = document.getElementById('lib-menu');
  if (m) m.remove();
  document.removeEventListener('click', closeLibMenu);
}

function openLibMenu(idx, anchor) {
  closeLibMenu();
  const item = state.library[idx];
  if (!item) return;

  const menu = document.createElement('div');
  menu.id = 'lib-menu';
  menu.className = 'lib-menu';
  menu.innerHTML = `
    <button type="button" data-act="fullscreen">Tela cheia</button>
    <button type="button" data-act="delete" class="danger">Apagar</button>
  `;

  const r = anchor.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = (r.bottom + 6) + 'px';
  menu.style.right = (window.innerWidth - r.right) + 'px';
  document.body.appendChild(menu);

  menu.querySelector('[data-act="fullscreen"]').onclick = (e) => {
    e.stopPropagation();
    closeLibMenu();
    // Seta state pra que openSlideFullscreen saiba qual item abrir
    update({ lightboxIdx: idx, lightboxSlide: 0, lightboxFormat: null });
    openSlideFullscreen();
  };

  menu.querySelector('[data-act="delete"]').onclick = async (e) => {
    e.stopPropagation();
    closeLibMenu();
    await deleteLibItem(item.name);
  };

  // Fecha em qualquer clique fora (timeout p/ não capturar o clique que abriu)
  setTimeout(() => document.addEventListener('click', closeLibMenu), 0);
}

// ---------------------------------------------------------------------------
// Delete (portado de MazyUI-ui.js:1634-1648)
// ---------------------------------------------------------------------------

async function deleteLibItem(name) {
  try {
    const data = await apiCall('POST', '/api/delete-item', { name });
    toast('Apagado: ' + name);
    // Remove o item do state local imediatamente — reloadQuiet seria ideal mas
    // não está importado aqui (fica em core/boot.js, Onda 1.D). Filtramos
    // localmente; o próximo reload trará o estado correto do servidor.
    update({ library: state.library.filter(it => it.name !== name) });
  } catch (e) {
    toast('Erro ao apagar: ' + (e.message || e));
  }
}

// ---------------------------------------------------------------------------
// View lit-html (portado de MazyUI-ui.js:1547-1591)
// ---------------------------------------------------------------------------

function scaleSlideFrame(f) {
  if (!f) return;
  const canvasW = parseInt(f.dataset.canvasW || '1080', 10);
  const parentW = (f.parentElement && f.parentElement.clientWidth) || 0;
  if (parentW <= 0 || canvasW <= 0) return;
  const scale = parentW / canvasW;
  if ('zoom' in document.body.style) {
    f.style.zoom = scale;
  } else {
    f.style.transform = `scale(${scale})`;
    f.style.transformOrigin = '0 0';
  }
}

function coverContent(item) {
  const cover = item.slides[0] || null;
  const fmt = getPrimaryFormat(item);
  const isHtml = isHtmlPath(cover);

  if (!cover) return html`<span>sem imagem</span>`;
  if (isHtml) {
    const d = FORMAT_DIMS[fmt] || FORMAT_DIMS.instagram;
    return html`<iframe
      class="slide-frame"
      data-canvas-w="${d.w}"
      src="${fileUrl(cover)}"
      style="width:${d.w}px;height:${d.h}px;border:none;display:block;"
      scrolling="no"
      @load=${(e) => scaleSlideFrame(e.target)}
    ></iframe>`;
  }
  return html``;  // imagem de fundo via CSS inline no .cover
}

function libCard(item, i) {
  const cover = item.slides[0] || null;
  const fmt = getPrimaryFormat(item);
  const isHtml = isHtmlPath(cover);
  const aspect = itemAspect(item);
  const bgStyle = cover && !isHtml
    ? `aspect-ratio:${aspect};background-image:url('${fileUrl(cover)}')`
    : `aspect-ratio:${aspect}`;

  const fmtCount = item.formats ? Object.keys(item.formats).length : 0;
  const subtitle = `${item.slides.length} slide${item.slides.length === 1 ? '' : 's'}${fmtCount > 1 ? ` · ${fmtCount} formatos` : ''}`;
  const displayName = (item.name || '').replace(/^(carrossel|post)-/, '').replace(/-/g, ' ');

  const agInfo = getAgendaInfo(item.name);

  const agBadge = agInfo
    ? agInfo.status === 'pendente'
      ? html`<span style="position:absolute;top:6px;right:6px;padding:2px 7px;border-radius:10px;font-size:10px;background:#f0fdf4;color:#166534;pointer-events:none;">✓ Agendado</span>`
      : agInfo.status === 'erro'
      ? html`<span style="position:absolute;top:6px;right:6px;padding:2px 7px;border-radius:10px;font-size:10px;background:#fef2f2;color:#991b1b;pointer-events:none;">⚠ Erro</span>`
      : html``
    : html``;

  const schedBtn = agInfo
    ? agInfo.status === 'pendente'
      ? html`<button class="btn" style="font-size:11px;padding:3px 8px;background:#22c55e;color:white;border:none;border-radius:4px;cursor:pointer;"
            @click=${(e) => { e.stopPropagation(); openScheduleModal(item); }}>📅 ${formatShortDate(agInfo.dataHora)}</button>`
      : agInfo.status === 'erro'
      ? html`<button class="btn" style="font-size:11px;padding:3px 8px;background:#fef2f2;color:#ef4444;border:1px solid #fca5a5;border-radius:4px;cursor:pointer;"
            @click=${(e) => { e.stopPropagation(); openScheduleModal(item); }}>⚠ Reagendar</button>`
      : html`<span style="font-size:11px;padding:3px 8px;color:#166534;background:#f0fdf4;border-radius:4px;">✓ Publicado</span>`
    : html`<button class="btn btn-primary" style="font-size:11px;padding:3px 8px;"
          @click=${(e) => { e.stopPropagation(); openScheduleModal(item); }}>📅 Agendar</button>`;

  return html`
    <div
      class="lib-card"
      data-lib="${i}"
      @click=${(e) => {
        if (e.target.closest('.lib-menu-trigger') || e.target.closest('.lib-menu')) return;
        openLightbox(i);
      }}
    >
      <button
        class="lib-menu-trigger"
        type="button"
        data-lib="${i}"
        aria-label="Mais opções"
        @click=${(e) => { e.stopPropagation(); openLibMenu(i, e.currentTarget); }}
      >···</button>
      <div
        class="cover ${item.slides.length ? '' : 'empty'} ${isHtml ? 'cover-html' : ''}"
        style="${bgStyle};position:relative;"
      >
        ${coverContent(item)}
        ${agBadge}
      </div>
      <div class="body">
        <div class="title">${displayName}</div>
        <div class="sub">${subtitle}</div>
        <div style="display:flex;gap:4px;margin-top:6px;" @click=${(e) => e.stopPropagation()}>
          <button class="btn btn-secondary" style="font-size:11px;padding:3px 8px;"
            @click=${() => openLightbox(i)}>Ver</button>
          ${schedBtn}
        </div>
      </div>
    </div>
  `;
}

function bibliotecaView(ctx) {
  const lib = ctx.state.library;

  if (lib.length === 0) {
    return html`
      <div class="section-head">
        <h2>Biblioteca</h2>
        <p>Tudo que o sistema gerou em <code>marketing/conteudo/</code>.</p>
      </div>
      <div class="card">
        <p style="color:var(--ink-muted); margin:0;">
          Nada produzido ainda. Use a skill <strong>Criar carrossel</strong>
          ou <strong>Publicar tema</strong> pra começar.
        </p>
      </div>
    `;
  }

  const sortedIdx = sortedLibIndices(lib);

  return html`
    <div class="section-head">
      <h2>Biblioteca</h2>
      <p>Tudo que o sistema gerou em <code>marketing/conteudo/</code>.</p>
    </div>
    <div class="lib-grid">
      ${sortedIdx.map(i => libCard(lib[i], i))}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------

export function register() {
  Sabec.v2.registerPanel({
    id:      'biblioteca',
    label:   'Biblioteca',
    glyph:   'B',
    crumb:   'Biblioteca',
    sidebar: true,
    v2:      true,
    view:    (ctx) => bibliotecaView(ctx),
    onMount: (container, ctx) => {
      ctx.setTopbar('Biblioteca', 'Conteúdo produzido');
    },
  });
}
