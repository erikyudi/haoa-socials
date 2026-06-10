// Painel Agenda — fila de posts agendados para o Instagram
import { registerInternal } from '../core/panels-registry.js';
import { update } from '../core/state.js';
import { apiCall } from '../core/api.js';

export function register() {
  registerInternal({
    id:      'agenda',
    label:   'Agenda',
    glyph:   'A',
    crumb:   'Agenda',
    sidebar: true,
    v2:      true,

    view(ctx) {
      const { html, state } = ctx;
      const s = state._agenda || {};
      const items = s.items || [];
      const filter = s.filter || 'todos';

      const setFilter = (f) => update({ _agenda: { ...(state._agenda || {}), filter: f } });

      const remove = async (id) => {
        try {
          await ctx.api.call('POST', '/api/agenda/remove', { id });
          update({ _agenda: { ...(state._agenda || {}), items: items.filter(i => i.id !== id) } });
          ctx.toast('Removido da fila.');
        } catch (e) {
          ctx.toast('Erro: ' + e.message);
        }
      };

      const filtered = items.filter(i => {
        if (filter === 'todos') return true;
        if (filter === 'aguardando') return i.status === 'pendente';
        if (filter === 'publicados') return i.status === 'publicado';
        if (filter === 'erros') return i.status === 'erro';
        return true;
      });

      const statusBadge = (item) => {
        if (item.status === 'publicado')
          return html`<span style="padding:2px 8px;border-radius:10px;font-size:11px;background:#f0fdf4;color:#166534;">✓ Publicado</span>`;
        if (item.status === 'erro')
          return html`<span style="padding:2px 8px;border-radius:10px;font-size:11px;background:#fef2f2;color:#991b1b;" title="${item.erro || ''}">Erro</span>`;
        return html`<span style="padding:2px 8px;border-radius:10px;font-size:11px;background:#fef9c3;color:#854d0e;">Aguardando</span>`;
      };

      const formatDate = (iso) => {
        try {
          const d = new Date(iso);
          return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch { return iso; }
      };

      const filters = ['todos', 'aguardando', 'publicados', 'erros'];

      return html`
        <div class="section-head">
          <h2>Agenda</h2>
          <p>Posts agendados para publicação automática no Instagram.</p>
        </div>

        <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
          ${filters.map(f => html`
            <button
              class="btn ${filter === f ? 'btn-primary' : 'btn-secondary'}"
              style="font-size:12px;padding:4px 10px;"
              @click=${() => setFilter(f)}
            >${f.charAt(0).toUpperCase() + f.slice(1)}</button>
          `)}
        </div>

        ${filtered.length === 0 ? html`
          <div class="card">
            <p style="color:var(--ink-muted);margin:0;">
              ${items.length === 0
                ? 'Nenhum post agendado. Vá à Biblioteca e clique "Agendar" em qualquer carrossel.'
                : 'Nenhum item com esse filtro.'
              }
            </p>
          </div>
        ` : html`
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${filtered.map(item => html`
              <div class="card" style="display:flex;align-items:center;gap:12px;padding:10px 14px;">
                <div style="width:40px;height:40px;border-radius:4px;background:var(--paper-2,#f0f0f0);flex-shrink:0;overflow:hidden;">
                  <img
                    src="/api/file?path=${encodeURIComponent(item.carrosselPath + '/imagens')}"
                    width="40" height="40"
                    style="object-fit:cover;width:100%;height:100%;"
                    onerror="this.style.display='none'"
                  />
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${item.carrosselName}
                  </div>
                  <div style="font-size:12px;color:var(--ink-muted);">${formatDate(item.dataHora)}</div>
                  ${item.status === 'erro' && item.erro ? html`
                    <div style="font-size:11px;color:#ef4444;margin-top:2px;">${item.erro}</div>
                  ` : ''}
                </div>
                ${statusBadge(item)}
                <button
                  class="btn btn-ghost"
                  style="color:var(--ink-muted);font-size:18px;padding:2px 6px;line-height:1;background:none;border:none;cursor:pointer;"
                  title="Remover"
                  @click=${() => remove(item.id)}
                >×</button>
              </div>
            `)}
          </div>
        `}

        <div style="margin-top:24px;font-size:12px;color:var(--ink-muted);text-align:center;">
          O servidor precisa estar rodando para publicar automaticamente.
        </div>
      `;
    },

    async onMount(_container, ctx) {
      ctx.setTopbar('Agenda', 'Posts agendados');
      await loadAgenda(ctx);
      const poll = setInterval(async () => {
        const s = ctx.state._agenda || {};
        const hasPending = (s.items || []).some(i => i.status === 'pendente');
        if (hasPending) await loadAgenda(ctx);
      }, 30_000);
      this._poll = poll;
    },

    onUnmount() {
      if (this._poll) { clearInterval(this._poll); this._poll = null; }
    },
  });
}

async function loadAgenda(ctx) {
  try {
    const items = await apiCall('GET', '/api/agenda');
    update({ _agenda: { ...(ctx.state._agenda || {}), items } });
  } catch (e) {
    console.warn('[agenda] erro ao carregar:', e.message);
  }
}
