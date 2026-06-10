// Onda 2.3 — Painel "Hoje" (dashboard de boas-vindas, home)
// Fonte: MazyUI-ui.js:1159 (renderHoje) + :1227 (qaButton) + :1233 (memoryHealth).
//
// Portado pra v2 (lit-html reactivo via ctx.html / ctx.render).
// Suporta dois estados: filled (memória preenchida) e empty (setup ainda não rodou).

import { registerInternal } from '../core/panels-registry.js';
import { extractBusiness, extractFocus, extractTone } from '../core/markdown.js';
import { update } from '../core/state.js';
import { apiCall } from '../core/api.js';
import { openSkillModal } from './skills.js';
import { openGuideModal } from '../ui/modal.js';

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Retorna quantas das 4 fontes de memória estão preenchidas.
 * Portado de MazyUI-ui.js:1233 (memoryHealth).
 *
 * @param {object} s — state snapshot
 * @returns {number} 0–4
 */
function memoryHealth(s) {
  let n = 0;
  if (s.memory?.empresa)      n++;
  if (s.memory?.preferencias) n++;
  if (s.memory?.estrategia)   n++;
  if (s.identidade)           n++;
  return n;
}


// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------

export function register() {
  registerInternal({
    id:      'hoje',
    label:   'Hoje',
    glyph:   'H',
    crumb:   'Hoje',
    sidebar: true,
    v2:      true,

    /**
     * view(ctx) — chamado a cada re-render reativo pelo registry.
     * Retorna um TemplateResult lit-html.
     *
     * @param {import('../core/panels-registry.js').CtxV2} ctx
     */
    view(ctx) {
      const { html, state } = ctx;
      const filled = memoryHealth(state) > 0;

      if (!filled) {
        return html`
          <div class="section-head">
            <h2>Bem-vindo ao MazyUI</h2>
            <p>O sistema ainda não conhece seu negócio.
              Clique em <strong>Primeiros passos</strong> no topo
              pra ver o roteiro de setup.</p>
          </div>
        `;
      }

      // Derived data
      const igCfg = state._conexoes?.cfg || {};
      const agendaItems = state._agenda?.items || [];
      const pendingItems = agendaItems
        .filter(i => i.status === 'pendente')
        .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
      const nextPost = pendingItems[0] || null;
      const queueCount = pendingItems.length;

      const now = Date.now();
      const sevenDays = now + 7 * 24 * 60 * 60 * 1000;
      const upcoming = pendingItems
        .filter(i => { const t = new Date(i.dataHora).getTime(); return t >= now && t <= sevenDays; })
        .slice(0, 5);

      const fmtDate = (iso) => {
        try {
          const d = new Date(iso);
          return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
            + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch { return iso; }
      };

      const memChips = [
        { label: 'Empresa',      ok: !!state.memory?.empresa },
        { label: 'Preferências', ok: !!state.memory?.preferencias },
        { label: 'Estratégia',   ok: !!state.memory?.estrategia },
        { label: 'Identidade',   ok: !!state.identidade },
      ];

      return html`
        <!-- Status row -->
        <div class="hoje-status-grid">

          <div class="hoje-status-card ${igCfg.connected ? 'is-active' : ''}">
            <div class="hoje-status-label">Instagram</div>
            <div class="hoje-status-value">
              <span class="hoje-status-dot ${igCfg.connected ? 'is-on' : ''}"></span>
              ${igCfg.connected ? 'Conectado' : 'Desconectado'}
            </div>
            ${igCfg.connected
              ? html`<div class="hoje-status-note">Configurado</div>`
              : html`<button class="btn btn-secondary hoje-status-btn"
                    @click=${() => ctx.setActive('conexoes')}>Configurar →</button>`
            }
          </div>

          <div class="hoje-status-card ${nextPost ? 'is-active' : ''}">
            <div class="hoje-status-label">Próximo post</div>
            ${nextPost ? html`
              <div class="hoje-status-value hoje-status-value--truncate">
                ${nextPost.carrosselName.replace(/^(carrossel|post)-/, '').replace(/-/g, ' ')}
              </div>
              <div class="hoje-status-note">${fmtDate(nextPost.dataHora)}</div>
            ` : html`
              <div class="hoje-status-value hoje-status-value--muted">Nenhum agendado</div>
              <button class="btn btn-secondary hoje-status-btn"
                @click=${() => ctx.setActive('biblioteca')}>Agendar →</button>
            `}
          </div>

          <div class="hoje-status-card">
            <div class="hoje-status-label">Na fila</div>
            <div class="hoje-status-num">${queueCount}</div>
            <div class="hoje-status-note">posts agendados</div>
          </div>
        </div>

        <!-- Ações rápidas -->
        <div class="hoje-section">
          <div class="hoje-section-title">Ações rápidas</div>
          <div class="hoje-actions">
            <button class="btn btn-primary"
              @click=${() => openSkillModal('carrossel')}>Gerar carrossel</button>
            <button class="btn btn-secondary"
              @click=${() => ctx.setActive('agenda')}>Agenda</button>
            <button class="btn btn-secondary"
              @click=${() => ctx.setActive('biblioteca')}>Biblioteca</button>
            <button class="btn btn-secondary"
              @click=${() => ctx.setActive('chat')}>Chat</button>
          </div>
        </div>

        <!-- Próximos 7 dias -->
        ${upcoming.length > 0 ? html`
          <div class="hoje-section">
            <div class="hoje-section-title">Próximos 7 dias</div>
            <div class="hoje-upcoming">
              ${upcoming.map(it => html`
                <div class="hoje-upcoming-item">
                  <div class="hoje-upcoming-thumb">
                    <img src="/api/file?path=${encodeURIComponent(it.carrosselPath + '/imagens')}"
                      width="32" height="32"
                      onerror="this.style.display='none'" />
                  </div>
                  <div class="hoje-upcoming-info">
                    <div class="hoje-upcoming-name">
                      ${it.carrosselName.replace(/^(carrossel|post)-/, '').replace(/-/g, ' ')}
                    </div>
                    <div class="hoje-upcoming-date">${fmtDate(it.dataHora)}</div>
                  </div>
                  <span class="hoje-upcoming-badge">Aguardando</span>
                </div>
              `)}
            </div>
          </div>
        ` : ''}

        <!-- Saúde do sistema -->
        <div class="hoje-section">
          <div class="hoje-section-title">Saúde do sistema</div>
          <div class="hoje-health-chips">
            ${memChips.map(c => html`
              <span class="hoje-health-chip ${c.ok ? 'is-ok' : 'is-warn'}">${c.label}</span>
            `)}
          </div>
        </div>
      `;
    },

    /**
     * onMount — define topbar e anexa handlers dos botões de ação.
     * O conteúdo principal é gerenciado de forma reativa por view().
     *
     * @param {HTMLElement} _container
     * @param {import('../core/panels-registry.js').CtxV2} ctx
     */
    async onMount(_container, ctx) {
      const bizName = ctx.state.business?.name || 'Bem-vindo';
      ctx.setTopbar('Hoje', bizName,
        `<button class="btn btn-secondary" id="btn-guide">Primeiros passos</button>
         <button class="btn btn-secondary" id="btn-refresh">Atualizar</button>`
      );

      // Carrega agenda e conexões se ainda não carregados
      if (!ctx.state._agenda?.items) {
        try {
          const items = await apiCall('GET', '/api/agenda');
          update({ _agenda: { items } });
        } catch (_) { /* sem agenda, ok */ }
      }
      if (!ctx.state._conexoes?.cfg) {
        try {
          const cfg = await apiCall('GET', '/api/instagram/config');
          update({ _conexoes: { cfg } });
        } catch (_) { /* sem conexoes, ok */ }
      }

      // Os botões ficam na topbar (fora do container gerenciado por lit-html).
      // Usamos event delegation no document pra evitar re-bind a cada re-render.
      const handleTopbar = async (e) => {
        const t = /** @type {HTMLElement} */ (e.target);
        if (!t) return;
        if (t.id === 'btn-guide') {
          openGuideModal();
        }
        if (t.id === 'btn-refresh') {
          if (typeof window !== 'undefined' && typeof window.reload === 'function') {
            await window.reload();
            ctx.toast('Memória recarregada.');
          }
        }
      };

      document.addEventListener('click', handleTopbar);
      // Guarda referência pra cleanup no onUnmount.
      this._topbarHandler = handleTopbar;
    },

    onUnmount() {
      if (typeof this._topbarHandler === 'function') {
        document.removeEventListener('click', this._topbarHandler);
        this._topbarHandler = null;
      }
    },
  });
}
