// Painel Conexões — wizard para configurar Instagram (token, userId, imgbb_key)
import { registerInternal } from '../core/panels-registry.js';
import { update } from '../core/state.js';

export function register() {
  registerInternal({
    id:      'conexoes',
    label:   'Conexões',
    glyph:   '⬡',
    crumb:   'Conexões',
    sidebar: true,
    v2:      true,

    view(ctx) {
      const { html, state } = ctx;
      const s = state._conexoes || {};
      const cfg = s.cfg || {};
      const saving = !!s.saving;
      const testing = !!s.testing;
      const testResult = s.testResult || null;
      const dirty = !!s.dirty;

      const set = (patch) => update({ _conexoes: { ...(state._conexoes || {}), ...patch } });

      const save = async () => {
        set({ saving: true });
        try {
          await ctx.api.call('POST', '/api/instagram/save', {
            token: s.token !== undefined ? s.token : '',
            userId: s.userId !== undefined ? s.userId : (cfg.userId || ''),
            imgbb_key: s.imgbb_key !== undefined ? s.imgbb_key : (cfg.imgbb_key || ''),
          });
          ctx.toast('Salvo!');
          set({ saving: false, dirty: false, token: undefined, userId: undefined, imgbb_key: undefined });
          await loadConfig(ctx);
        } catch (e) {
          ctx.toast('Erro: ' + e.message);
          set({ saving: false });
        }
      };

      const test = async () => {
        set({ testing: true, testResult: null });
        try {
          const r = await ctx.api.call('POST', '/api/instagram/test', {});
          set({ testing: false, testResult: r });
        } catch (e) {
          set({ testing: false, testResult: { ok: false, error: e.message } });
        }
      };

      const tokenVal    = s.token     !== undefined ? s.token     : (cfg.token_masked || '');
      const userIdVal   = s.userId    !== undefined ? s.userId    : (cfg.userId || '');
      const imgbbVal    = s.imgbb_key !== undefined ? s.imgbb_key : (cfg.imgbb_key || '');
      const connected   = cfg.connected && !dirty;

      return html`
        <div class="section-head">
          <h2>Conexões</h2>
          <p>Configure as integrações externas do MazyUI.</p>
        </div>

        <div class="card" style="max-width:520px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
            <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);flex-shrink:0;"></div>
            <div>
              <div style="font-weight:600;">Instagram</div>
              ${connected
                ? html`<div style="font-size:13px;color:#22c55e;">● Conectado</div>`
                : html`<div style="font-size:13px;color:var(--ink-muted);">Não configurado</div>`
              }
            </div>
          </div>

          <div style="margin-bottom:14px;">
            <div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;">
              Access Token
              <a href="https://developers.facebook.com/docs/instagram-basic-display-api/guides/getting-access-tokens-and-permissions"
                 target="_blank" rel="noopener"
                 style="color:#2563eb;margin-left:8px;font-size:11px;">Como obter →</a>
            </div>
            <input
              class="input"
              type="password"
              placeholder="EAABsbCS4ZA0IBO..."
              .value=${tokenVal}
              @input=${(e) => set({ token: e.target.value, dirty: true })}
              style="width:100%;font-family:var(--mono);font-size:13px;box-sizing:border-box;"
            />
          </div>

          <div style="margin-bottom:14px;">
            <div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;">Instagram Business Account ID</div>
            <input
              class="input"
              type="text"
              placeholder="17841400123456789"
              .value=${userIdVal}
              @input=${(e) => set({ userId: e.target.value, dirty: true })}
              style="width:100%;font-family:var(--mono);font-size:13px;box-sizing:border-box;"
            />
          </div>

          <div style="margin-bottom:20px;">
            <div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;">
              Chave imgbb
              <a href="https://api.imgbb.com/" target="_blank" rel="noopener"
                 style="color:#2563eb;margin-left:8px;font-size:11px;">Obter grátis →</a>
            </div>
            <input
              class="input"
              type="text"
              placeholder="Cole a API key do imgbb.com"
              .value=${imgbbVal}
              @input=${(e) => set({ imgbb_key: e.target.value, dirty: true })}
              style="width:100%;font-family:var(--mono);font-size:13px;box-sizing:border-box;"
            />
            <div style="font-size:11px;color:var(--ink-muted);margin-top:4px;">
              Necessário para publicar no Instagram. Gratuito em imgbb.com.
            </div>
          </div>

          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button class="btn btn-primary" @click=${save} ?disabled=${saving}>
              ${saving ? 'Salvando…' : 'Salvar'}
            </button>
            <button class="btn btn-secondary" @click=${test} ?disabled=${testing || !cfg.connected}>
              ${testing ? 'Testando…' : 'Testar conexão'}
            </button>
          </div>

          ${testResult ? html`
            <div style="margin-top:12px;padding:10px 12px;border-radius:6px;font-size:13px;
                        background:${testResult.ok ? '#f0fdf4' : '#fef2f2'};
                        color:${testResult.ok ? '#166534' : '#991b1b'};">
              ${testResult.ok
                ? html`✓ Conexão OK — ${testResult.name}`
                : html`✗ Erro: ${testResult.error}`
              }
            </div>
          ` : ''}
        </div>
      `;
    },

    async onMount(_container, ctx) {
      ctx.setTopbar('Conexões', 'Integrações');
      await loadConfig(ctx);
    },
  });
}

async function loadConfig(ctx) {
  try {
    const cfg = await ctx.api.call('GET', '/api/instagram/config');
    update({ _conexoes: { ...(ctx.state._conexoes || {}), cfg } });
  } catch (e) {
    console.warn('[conexoes] erro ao carregar config:', e.message);
  }
}
