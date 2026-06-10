# Instagram Scheduler + Usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Instagram post scheduling queue, guided connection wizard, redesigned dashboard, and Biblioteca schedule button to MazyUI.

**Architecture:** New routes + scheduler loop added directly to `MazyUI-server.mjs`. Two new v2 panels (`agenda.js`, `conexoes.js`) registered in `index.js`. Existing `hoje.js` and `biblioteca.js` modified. Images posted via imgbb (free public hosting) → Meta Graph API carousel. Queue persisted in `agenda.json`, credentials in `instagram.config.json` at workspace root.

**Tech Stack:** Node.js 18+ native `fetch` + `FormData`, Meta Graph API v19.0, imgbb.com free API, lit-html 3.2.1 (vendorized), no new npm dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `MazyUI-server.mjs` | Modify | Add 6 routes, `publishToInstagram`, scheduler `setInterval` |
| `MazyUI-ui/panels/hoje.js` | Rewrite | Dashboard with Instagram status + queue preview |
| `MazyUI-ui/panels/biblioteca.js` | Modify | Add Agendar button + modal + schedule state |
| `MazyUI-ui/panels/agenda.js` | **Create** | Queue list panel with filters + remove |
| `MazyUI-ui/panels/conexoes.js` | **Create** | Instagram wizard (token + userId + imgbb key + test) |
| `MazyUI-ui/index.js` | Modify | Import + register agenda and conexoes panels |
| `MazyUI-ui/ui/nav.js` | Modify | Add Agenda + Conexões to NAV array |

**Runtime data files (created at runtime, not in repo):**
- `agenda.json` — `[{ id, carrosselPath, carrosselName, dataHora, status, erro }]`
- `instagram.config.json` — `{ token, userId, imgbb_key }`

---

## Task 1: Data helpers in MazyUI-server.mjs

**Files:**
- Modify: `MazyUI/MazyUI-server.mjs` (after `readSafe` function, around line 91)

- [ ] **Step 1: Add data helpers after the `readSafe` function**

Insert immediately after `function readSafe(rel) {...}` (line ~91):

```js
// ============================================================
// Instagram config + Agenda — persistência em JSON
// ============================================================
import { createHash } from 'node:crypto';

function readInstagramConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'instagram.config.json'), 'utf8')); }
  catch { return null; }
}

function writeInstagramConfig(data) {
  fs.writeFileSync(path.join(ROOT, 'instagram.config.json'), JSON.stringify(data, null, 2));
}

function readAgenda() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'agenda.json'), 'utf8')); }
  catch { return []; }
}

function writeAgenda(items) {
  fs.writeFileSync(path.join(ROOT, 'agenda.json'), JSON.stringify(items, null, 2));
}

function generateId() {
  return createHash('sha256').update(Date.now() + Math.random().toString()).digest('hex').slice(0, 16);
}
```

- [ ] **Step 2: Verify the server still starts**

```
cd MazyUI
node MazyUI-server.mjs
```
Expected: `MazyUI painel → http://localhost:7777` — no errors.

- [ ] **Step 3: Stop server (Ctrl+C) and commit**

```bash
git add MazyUI/MazyUI-server.mjs
git commit -m "feat: add data helpers for instagram config + agenda persistence"
```

---

## Task 2: Instagram API routes

**Files:**
- Modify: `MazyUI/MazyUI-server.mjs` (before the `addRoute` block, ~line 1017)

- [ ] **Step 1: Add the three Instagram route handlers before the addRoute block**

Insert before `addRoute('GET', '/', handleRoot)`:

```js
// ============================================================
// Instagram config routes
// ============================================================
async function handleInstagramConfig(req, res) {
  const cfg = readInstagramConfig();
  if (!cfg) return json(res, 200, { connected: false, token_masked: '', userId: '', imgbb_key: '' });
  const masked = cfg.token ? cfg.token.slice(0, 8) + '••••••••' : '';
  json(res, 200, {
    connected: !!(cfg.token && cfg.userId),
    token_masked: masked,
    userId: cfg.userId || '',
    imgbb_key: cfg.imgbb_key || '',
  });
}

async function handleInstagramSave(req, res) {
  try {
    const { token, userId, imgbb_key } = JSON.parse(await readBody(req));
    if (!token || !userId) return json(res, 400, { error: 'token e userId obrigatórios' });
    writeInstagramConfig({ token: token.trim(), userId: userId.trim(), imgbb_key: (imgbb_key || '').trim() });
    json(res, 200, { ok: true });
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
}

async function handleInstagramTest(req, res) {
  const cfg = readInstagramConfig();
  if (!cfg?.token) return json(res, 200, { ok: false, error: 'Token não configurado' });
  try {
    const r = await fetch(`https://graph.facebook.com/me?fields=name&access_token=${encodeURIComponent(cfg.token)}`);
    const data = await r.json();
    if (data.error) return json(res, 200, { ok: false, error: data.error.message });
    json(res, 200, { ok: true, name: data.name });
  } catch (e) {
    json(res, 200, { ok: false, error: e.message });
  }
}
```

- [ ] **Step 2: Register the three routes**

In the `addRoute` block, add after `addRoute('POST', '/api/render-carrossel', handleRenderCarrossel)`:

```js
addRoute('GET',  '/api/instagram/config', handleInstagramConfig);
addRoute('POST', '/api/instagram/save',   handleInstagramSave);
addRoute('POST', '/api/instagram/test',   handleInstagramTest);
```

- [ ] **Step 3: Test manually**

Start server, then in browser console or curl:
```
GET http://localhost:7777/api/instagram/config
```
Expected: `{"connected":false,"token_masked":"","userId":"","imgbb_key":""}`

- [ ] **Step 4: Commit**

```bash
git add MazyUI/MazyUI-server.mjs
git commit -m "feat: add instagram config API routes (get/save/test)"
```

---

## Task 3: Agenda API routes

**Files:**
- Modify: `MazyUI/MazyUI-server.mjs`

- [ ] **Step 1: Add agenda route handlers before the addRoute block**

Insert after `handleInstagramTest`:

```js
// ============================================================
// Agenda routes
// ============================================================
function handleAgendaGet(req, res) {
  const items = readAgenda().sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
  json(res, 200, items);
}

async function handleAgendaAdd(req, res) {
  try {
    const { carrosselPath, carrosselName, dataHora } = JSON.parse(await readBody(req));
    if (!carrosselPath || !dataHora) return json(res, 400, { error: 'carrosselPath e dataHora obrigatórios' });
    const items = readAgenda();
    const id = generateId();
    items.push({ id, carrosselPath, carrosselName: carrosselName || carrosselPath, dataHora, status: 'pendente', erro: null });
    writeAgenda(items);
    json(res, 200, { ok: true, id });
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
}

async function handleAgendaRemove(req, res) {
  try {
    const { id } = JSON.parse(await readBody(req));
    if (!id) return json(res, 400, { error: 'id obrigatório' });
    writeAgenda(readAgenda().filter(i => i.id !== id));
    json(res, 200, { ok: true });
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
}
```

- [ ] **Step 2: Register agenda routes**

Add after the instagram routes:

```js
addRoute('GET',  '/api/agenda',        handleAgendaGet);
addRoute('POST', '/api/agenda/add',    handleAgendaAdd);
addRoute('POST', '/api/agenda/remove', handleAgendaRemove);
```

- [ ] **Step 3: Test manually**

```
GET http://localhost:7777/api/agenda
```
Expected: `[]`

```
POST http://localhost:7777/api/agenda/add
Body: {"carrosselPath":"marketing/conteudo/teste","carrosselName":"Teste","dataHora":"2099-01-01T10:00:00.000Z"}
```
Expected: `{"ok":true,"id":"<16-char hex>"}`

```
GET http://localhost:7777/api/agenda
```
Expected: array with one item, status `pendente`.

- [ ] **Step 4: Commit**

```bash
git add MazyUI/MazyUI-server.mjs
git commit -m "feat: add agenda queue API routes (get/add/remove)"
```

---

## Task 4: publishToInstagram function

**Files:**
- Modify: `MazyUI/MazyUI-server.mjs`

- [ ] **Step 1: Add publishToInstagram before the scheduler section**

Insert after the agenda route handlers:

```js
// ============================================================
// Instagram publishing — imgbb upload + Meta Graph API carousel
// ============================================================
async function uploadToImgbb(imagePath, imgbbKey) {
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');
  const form = new FormData();
  form.append('image', base64);
  const r = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(imgbbKey)}`, {
    method: 'POST',
    body: form,
  });
  const data = await r.json();
  if (!data.success) throw new Error(`imgbb: ${data.error?.message || 'upload falhou'}`);
  return data.data.url;
}

async function publishToInstagram(item) {
  const cfg = readInstagramConfig();
  if (!cfg?.token || !cfg?.userId) throw new Error('Instagram não configurado');
  if (!cfg?.imgbb_key) throw new Error('Chave imgbb não configurada (painel Conexões)');

  const { token, userId, imgbb_key } = cfg;
  const baseUrl = 'https://graph.facebook.com/v19.0';

  // Locate PNGs in marketing/conteudo/<item>/imagens/<format>/slide-*.png
  const imgDir = safeResolve(path.join(item.carrosselPath, 'imagens'));
  let pngs = [];
  if (fs.existsSync(imgDir)) {
    const subdirs = fs.readdirSync(imgDir)
      .filter(d => fs.statSync(path.join(imgDir, d)).isDirectory())
      .sort();
    for (const sub of subdirs) {
      const files = fs.readdirSync(path.join(imgDir, sub))
        .filter(f => /^slide-.*\.png$/i.test(f))
        .sort()
        .map(f => path.join(imgDir, sub, f));
      if (files.length > 0) { pngs = files; break; }
    }
  }
  if (pngs.length === 0) throw new Error('Nenhuma imagem PNG encontrada em ' + item.carrosselPath);

  // Caption from legenda.md
  let caption = '';
  const legendaAbs = path.join(ROOT, item.carrosselPath, 'legenda.md');
  if (fs.existsSync(legendaAbs)) caption = fs.readFileSync(legendaAbs, 'utf8').trim();

  // Upload each PNG to imgbb and create IG media containers
  const containerIds = [];
  for (const png of pngs) {
    const imageUrl = await uploadToImgbb(png, imgbb_key);
    const r = await fetch(
      `${baseUrl}/${userId}/media?image_url=${encodeURIComponent(imageUrl)}&is_carousel_item=true&access_token=${encodeURIComponent(token)}`,
      { method: 'POST' }
    );
    const data = await r.json();
    if (data.error) throw new Error(`Meta API (container): ${data.error.message}`);
    containerIds.push(data.id);
  }

  // Create carousel container
  const carouselRes = await fetch(`${baseUrl}/${userId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: containerIds.join(','),
      caption,
      access_token: token,
    }),
  });
  const carouselData = await carouselRes.json();
  if (carouselData.error) throw new Error(`Meta API (carousel): ${carouselData.error.message}`);

  // Publish
  const publishRes = await fetch(`${baseUrl}/${userId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: carouselData.id, access_token: token }),
  });
  const publishData = await publishRes.json();
  if (publishData.error) throw new Error(`Meta API (publish): ${publishData.error.message}`);

  return publishData.id;
}
```

- [ ] **Step 2: Verify server starts without errors**

```
node MazyUI/MazyUI-server.mjs
```
Expected: starts normally. (Function defined but not called yet.)

- [ ] **Step 3: Commit**

```bash
git add MazyUI/MazyUI-server.mjs
git commit -m "feat: add publishToInstagram via imgbb + Meta Graph API v19"
```

---

## Task 5: Scheduler loop

**Files:**
- Modify: `MazyUI/MazyUI-server.mjs` (before `server.listen(...)`)

- [ ] **Step 1: Add startScheduler function and call it**

Insert after `await loadLocalRoutes();` and before `server.listen(...)`:

```js
// ============================================================
// Scheduler — checa a fila a cada 60s e publica posts no horário
// ============================================================
function startScheduler() {
  setInterval(async () => {
    const items = readAgenda();
    const now = Date.now();
    let changed = false;
    for (const item of items) {
      if (item.status !== 'pendente') continue;
      if (new Date(item.dataHora).getTime() > now) continue;
      try {
        await publishToInstagram(item);
        item.status = 'publicado';
        item.erro = null;
        console.log(`[scheduler] Publicado: ${item.carrosselName}`);
      } catch (e) {
        item.status = 'erro';
        item.erro = e.message;
        console.error(`[scheduler] Erro ao publicar ${item.carrosselName}:`, e.message);
      }
      changed = true;
    }
    if (changed) writeAgenda(items);
  }, 60_000);
}

startScheduler();
```

The full end of the file should now read:

```js
await loadLocalRoutes();
startScheduler();

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ${brand.consoleLabel}`);
  console.log(`  → http://localhost:${PORT}\n`);
});
```

- [ ] **Step 2: Verify server starts and logs scheduler (no error)**

```
node MazyUI/MazyUI-server.mjs
```
Expected: starts normally, no errors about scheduler.

- [ ] **Step 3: Commit**

```bash
git add MazyUI/MazyUI-server.mjs
git commit -m "feat: add 60s scheduler loop that publishes pending agenda items"
```

---

## Task 6: Painel Conexões

**Files:**
- Create: `MazyUI/MazyUI-ui/panels/conexoes.js`

- [ ] **Step 1: Create the Conexões panel file**

```js
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
            token: s.token ?? cfg.token_raw ?? '',
            userId: s.userId ?? cfg.userId ?? '',
            imgbb_key: s.imgbb_key ?? cfg.imgbb_key ?? '',
          });
          ctx.toast('Salvo!');
          set({ saving: false, dirty: false, token: undefined, userId: undefined, imgbb_key: undefined });
          await loadConfig(ctx);  // reloads cfg into state._conexoes
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

      const tokenVal   = s.token    !== undefined ? s.token    : (cfg.token_masked || '');
      const userIdVal  = s.userId   !== undefined ? s.userId   : (cfg.userId || '');
      const imgbbVal   = s.imgbb_key !== undefined ? s.imgbb_key : (cfg.imgbb_key || '');
      const connected  = cfg.connected && !dirty;

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
                ? html`<div style="font-size:13px;color:var(--green,#22c55e);">● Conectado · ${cfg.name || ''}</div>`
                : html`<div style="font-size:13px;color:var(--ink-muted);">Não configurado</div>`
              }
            </div>
          </div>

          <div style="margin-bottom:14px;">
            <div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;">
              Access Token
              <a href="https://developers.facebook.com/docs/instagram-basic-display-api/guides/getting-access-tokens-and-permissions"
                 target="_blank" rel="noopener"
                 style="color:var(--blue,#2563eb);margin-left:8px;font-size:11px;">Como obter →</a>
            </div>
            <input
              class="input"
              type="password"
              placeholder="EAABsbCS4ZA0IBO..."
              .value=${tokenVal}
              @input=${(e) => set({ token: e.target.value, dirty: true })}
              style="width:100%;font-family:var(--mono);font-size:13px;"
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
              style="width:100%;font-family:var(--mono);font-size:13px;"
            />
          </div>

          <div style="margin-bottom:20px;">
            <div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;">
              Chave imgbb
              <a href="https://api.imgbb.com/" target="_blank" rel="noopener"
                 style="color:var(--blue,#2563eb);margin-left:8px;font-size:11px;">Obter grátis →</a>
            </div>
            <input
              class="input"
              type="text"
              placeholder="Cole a API key do imgbb.com"
              .value=${imgbbVal}
              @input=${(e) => set({ imgbb_key: e.target.value, dirty: true })}
              style="width:100%;font-family:var(--mono);font-size:13px;"
            />
            <div style="font-size:11px;color:var(--ink-muted);margin-top:4px;">
              Necessário para hospedar imagens ao publicar. Gratuito em imgbb.com.
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
                        background:${testResult.ok ? 'var(--green-bg,#f0fdf4)' : 'var(--red-bg,#fef2f2)'};
                        color:${testResult.ok ? 'var(--green-dark,#166534)' : 'var(--red-dark,#991b1b)'};">
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
```

- [ ] **Step 2: Verify file was created with no syntax errors**

```bash
node --input-type=module < MazyUI/MazyUI-ui/panels/conexoes.js 2>&1 | head -5
```
Expected: error about missing imports (which is fine — modules need the full server context). No *syntax* errors (SyntaxError).

- [ ] **Step 3: Commit**

```bash
git add MazyUI/MazyUI-ui/panels/conexoes.js
git commit -m "feat: add Conexoes panel with Instagram + imgbb wizard"
```

---

## Task 7: Painel Agenda

**Files:**
- Create: `MazyUI/MazyUI-ui/panels/agenda.js`

- [ ] **Step 1: Create the Agenda panel file**

```js
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

      const setFilter = (f) => ctx.update({ _agenda: { ...state._agenda, filter: f } });

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
          return html`<span class="badge badge-green">✓ Publicado</span>`;
        if (item.status === 'erro')
          return html`<span class="badge badge-red" title="${item.erro || ''}">Erro</span>`;
        return html`<span class="badge badge-yellow">Aguardando</span>`;
      };

      const formatDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      };

      const thumbUrl = (item) => {
        return `/api/file?path=${encodeURIComponent(item.carrosselPath + '/capa.png')}`;
      };

      return html`
        <div class="section-head">
          <h2>Agenda</h2>
          <p>Posts agendados para publicação automática no Instagram.</p>
        </div>

        <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
          ${['todos','aguardando','publicados','erros'].map(f => html`
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
                <img
                  src="${thumbUrl(item)}"
                  width="40" height="40"
                  style="border-radius:4px;object-fit:cover;flex-shrink:0;background:var(--paper-2,#f0f0f0);"
                  onerror="this.style.background='var(--paper-2,#f0f0f0)';this.style.opacity='0.3';"
                />
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${item.carrosselName}
                  </div>
                  <div style="font-size:12px;color:var(--ink-muted);">${formatDate(item.dataHora)}</div>
                  ${item.status === 'erro' && item.erro ? html`
                    <div style="font-size:11px;color:var(--red,#ef4444);margin-top:2px;">${item.erro}</div>
                  ` : ''}
                </div>
                ${statusBadge(item)}
                <button
                  class="btn btn-ghost"
                  style="color:var(--ink-muted);font-size:18px;padding:2px 6px;line-height:1;"
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
      // Poll a cada 30s enquanto há itens pendentes
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
```

- [ ] **Step 2: Commit**

```bash
git add MazyUI/MazyUI-ui/panels/agenda.js
git commit -m "feat: add Agenda panel with queue list, filters, and auto-refresh"
```

---

## Task 8: Register new panels in index.js and nav.js

**Files:**
- Modify: `MazyUI/MazyUI-ui/index.js`
- Modify: `MazyUI/MazyUI-ui/ui/nav.js`

- [ ] **Step 1: Add imports to index.js**

After the `import * as slideEditor` line (line ~30):

```js
import * as agenda     from './panels/agenda.js';
import * as conexoes   from './panels/conexoes.js';
```

- [ ] **Step 2: Register the panels in index.js**

After `slideEditor.register();` (line ~52):

```js
agenda.register();
conexoes.register();
```

- [ ] **Step 3: Add to NAV array in nav.js**

In `nav.js`, the current NAV array ends with `biblioteca`. Add `agenda` after `biblioteca` and `conexoes` after `identidade`:

```js
export const NAV = [
  { id: 'hoje',       label: 'Hoje',        glyph: 'H' },
  { id: 'chat',       label: 'Chat',        glyph: '/' },
  { id: 'skills',     label: 'Skills',      glyph: 'S' },
  { id: 'negocio',    label: 'Negócio',     glyph: 'N' },
  { id: 'tom',        label: 'Tom de voz',  glyph: 'T' },
  { id: 'estrategia', label: 'Estratégia',  glyph: 'E' },
  { id: 'identidade', label: 'Identidade',  glyph: 'I' },
  { id: 'biblioteca', label: 'Biblioteca',  glyph: 'B' },
  { id: 'agenda',     label: 'Agenda',      glyph: 'A' },
  { id: 'conexoes',   label: 'Conexões',    glyph: '⬡' },
];
```

- [ ] **Step 4: Start server and verify new panels appear in sidebar**

```
node MazyUI/MazyUI-server.mjs
```
Open `http://localhost:7777` — sidebar should now show "Agenda" and "Conexões". Click each to verify they render without errors.

- [ ] **Step 5: Commit**

```bash
git add MazyUI/MazyUI-ui/index.js MazyUI/MazyUI-ui/ui/nav.js
git commit -m "feat: register Agenda and Conexoes panels in sidebar"
```

---

## Task 9: Biblioteca — botão Agendar + modal

**Files:**
- Modify: `MazyUI/MazyUI-ui/panels/biblioteca.js`

- [ ] **Step 1: Add agenda state loader and schedule modal functions**

After the `import` block at the top of `biblioteca.js`, add:

```js
import { apiCall } from '../core/api.js';
```

Then add these functions before `bibliotecaView`:

```js
// ---------------------------------------------------------------------------
// Agendamento
// ---------------------------------------------------------------------------

let scheduledPaths = new Set();

async function loadScheduledPaths() {
  try {
    const items = await apiCall('GET', '/api/agenda');
    scheduledPaths = new Set(
      items.filter(i => i.status === 'pendente').map(i => i.carrosselPath)
    );
  } catch { scheduledPaths = new Set(); }
}

let _modalCleanup = null;

function openScheduleModal(item) {
  if (document.getElementById('schedule-modal')) return;

  const today = new Date().toISOString().split('T')[0];
  const backdrop = document.createElement('div');
  backdrop.id = 'schedule-modal';
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:900;display:flex;align-items:center;justify-content:center;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--paper,#fff);border-radius:10px;padding:24px;width:340px;box-shadow:0 8px 32px rgba(0,0,0,0.2);';
  modal.innerHTML = `
    <div style="font-weight:700;font-size:16px;margin-bottom:16px;">📅 Agendar no Instagram</div>
    <div style="background:var(--paper-2,#f5f5f5);border-radius:6px;padding:8px 10px;margin-bottom:16px;font-size:13px;">
      <strong>${(item.name || '').replace(/^(carrossel|post)-/, '').replace(/-/g, ' ')}</strong>
      <div style="font-size:11px;color:var(--ink-muted);">${item.slides.length} slides</div>
    </div>
    <div style="margin-bottom:12px;">
      <div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;">Data</div>
      <input id="sched-date" type="date" min="${today}" value="${today}"
        style="width:100%;padding:6px 8px;border:1px solid var(--rule,#ddd);border-radius:4px;font-size:13px;box-sizing:border-box;" />
    </div>
    <div style="margin-bottom:20px;">
      <div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;">Hora</div>
      <input id="sched-time" type="time" value="09:00"
        style="width:100%;padding:6px 8px;border:1px solid var(--rule,#ddd);border-radius:4px;font-size:13px;box-sizing:border-box;" />
    </div>
    <div style="display:flex;gap:8px;">
      <button id="sched-confirm" class="btn btn-primary" style="flex:1;">Confirmar</button>
      <button id="sched-cancel" class="btn btn-secondary">Cancelar</button>
    </div>
    <div id="sched-error" style="margin-top:8px;font-size:12px;color:var(--red,#ef4444);display:none;"></div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const close = () => { backdrop.remove(); _modalCleanup = null; };

  modal.querySelector('#sched-cancel').onclick = close;
  backdrop.onclick = (e) => { if (e.target === backdrop) close(); };

  modal.querySelector('#sched-confirm').onclick = async () => {
    const date = modal.querySelector('#sched-date').value;
    const time = modal.querySelector('#sched-time').value;
    const errEl = modal.querySelector('#sched-error');
    if (!date || !time) { errEl.textContent = 'Preencha data e hora.'; errEl.style.display = 'block'; return; }
    const dataHora = new Date(`${date}T${time}:00`).toISOString();
    if (new Date(dataHora) <= new Date()) {
      errEl.textContent = 'Data deve ser no futuro.'; errEl.style.display = 'block'; return;
    }
    modal.querySelector('#sched-confirm').textContent = 'Agendando…';
    modal.querySelector('#sched-confirm').disabled = true;
    try {
      await apiCall('POST', '/api/agenda/add', {
        carrosselPath: item.folder,
        carrosselName: (item.name || '').replace(/^(carrossel|post)-/, '').replace(/-/g, ' '),
        dataHora,
      });
      scheduledPaths.add(item.folder);
      // Trigger re-render — update is already imported at top of biblioteca.js
      update({ library: [...state.library] });
      toast('Post agendado!');
      close();
    } catch (e) {
      errEl.textContent = 'Erro: ' + e.message;
      errEl.style.display = 'block';
      modal.querySelector('#sched-confirm').textContent = 'Confirmar';
      modal.querySelector('#sched-confirm').disabled = false;
    }
  };

  _modalCleanup = close;
}
```

- [ ] **Step 2: Modify libCard to add the Agendar button**

In the `libCard` function, replace the closing `</div>` of the `.body` div to add the button. Find this block in `libCard`:

```js
      <div class="body">
        <div class="title">${displayName}</div>
        <div class="sub">${subtitle}</div>
      </div>
```

Replace with:

```js
      <div class="body">
        <div class="title">${displayName}</div>
        <div class="sub">${subtitle}</div>
        <div style="margin-top:8px;">
          ${scheduledPaths.has(item.folder)
            ? html`<span class="btn btn-secondary" style="font-size:11px;padding:3px 8px;color:var(--green,#22c55e);cursor:default;">✓ Agendado</span>`
            : html`<button class="btn btn-secondary" style="font-size:11px;padding:3px 8px;"
                @click=${(e) => { e.stopPropagation(); openScheduleModal(item); }}>📅 Agendar</button>`
          }
        </div>
      </div>
```

- [ ] **Step 3: Load scheduled paths on mount**

In the `register()` function, modify `onMount`:

```js
    onMount: async (container, ctx) => {
      ctx.setTopbar('Biblioteca', 'Conteúdo produzido');
      await loadScheduledPaths();
    },
```

- [ ] **Step 4: Verify in browser**

Start server, open Biblioteca. Each card should show "📅 Agendar" button. Click it — modal should appear. Fill date/time and confirm. Check Agenda panel shows the new item.

- [ ] **Step 5: Commit**

```bash
git add MazyUI/MazyUI-ui/panels/biblioteca.js
git commit -m "feat: add Agendar button + schedule modal to Biblioteca cards"
```

---

## Task 10: Dashboard "Hoje" redesenhado

**Files:**
- Rewrite: `MazyUI/MazyUI-ui/panels/hoje.js`

- [ ] **Step 1: Replace the entire hoje.js with the new version**

```js
// Painel "Hoje" — dashboard com status do Instagram, próximos posts, ações rápidas
import { registerInternal } from '../core/panels-registry.js';
import { update } from '../core/state.js';
import { extractBusiness, extractFocus, extractTone, extractNextSteps } from '../core/markdown.js';
import { openSkillModal } from './skills.js';
import { openGuideModal } from '../ui/modal.js';
import { apiCall } from '../core/api.js';

function memoryHealth(s) {
  let n = 0;
  if (s.memory?.empresa)      n++;
  if (s.memory?.preferencias) n++;
  if (s.memory?.estrategia)   n++;
  if (s.identidade)           n++;
  return n;
}

const QUICK_ACTIONS = [
  { skillId: 'carrossel',          title: 'Criar carrossel',  icon: '◈' },
  { skillId: 'publicar-tema',      title: 'Publicar tema',    icon: '◎' },
  { skillId: 'email-profissional', title: 'Escrever email',   icon: '◉' },
  { skillId: 'salvar',             title: 'Salvar tudo',      icon: '◇' },
];

function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function isWithin7Days(iso) {
  const diff = new Date(iso) - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

export function register() {
  registerInternal({
    id:      'hoje',
    label:   'Hoje',
    glyph:   'H',
    crumb:   'Hoje',
    sidebar: true,
    v2:      true,

    view(ctx) {
      const { html, state } = ctx;
      const d = state._hoje || {};
      const igCfg = d.igCfg || {};
      const agendaItems = d.agendaItems || [];

      const filled = memoryHealth(state) > 0;
      if (!filled) {
        return html`
          <div class="section-head">
            <h2>Bem-vindo ao MazyUI</h2>
            <p>O sistema ainda não conhece seu negócio.
               Clique em <strong>Primeiros passos</strong> no topo.</p>
          </div>
        `;
      }

      const biz      = extractBusiness(state.memory?.empresa || '');
      const focus    = extractFocus(state.memory?.estrategia || '') || 'Defina a prioridade principal em Estratégia.';
      const bizName  = state.business?.name || biz || '—';

      const pending  = agendaItems.filter(i => i.status === 'pendente');
      const next     = pending.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora))[0] || null;
      const next7    = agendaItems.filter(i => i.status === 'pendente' && isWithin7Days(i.dataHora))
                         .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

      const igConnected = igCfg.connected;
      const igName      = igCfg.name || '';

      const healthBadge = (label, ok) => html`
        <span style="padding:3px 10px;border-radius:10px;font-size:11px;
              background:${ok ? 'var(--green-bg,#f0fdf4)' : 'var(--red-bg,#fef2f2)'};
              color:${ok ? 'var(--green-dark,#166534)' : 'var(--red-dark,#991b1b)'};">
          ${ok ? '✓' : '⚠'} ${label}
        </span>
      `;

      return html`
        <!-- Status cards row -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">

          <div class="card" style="padding:14px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
                        color:${igConnected ? 'var(--green,#22c55e)' : 'var(--ink-muted)'};margin-bottom:6px;">
              Instagram
            </div>
            ${igConnected
              ? html`
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="width:8px;height:8px;background:var(--green,#22c55e);border-radius:50%;display:inline-block;"></span>
                  <span style="font-weight:600;font-size:14px;">Conectado</span>
                </div>
                <div style="font-size:12px;color:var(--ink-muted);margin-top:2px;">${igName}</div>
              `
              : html`
                <div style="font-size:13px;color:var(--ink-muted);">Não configurado</div>
                <button class="btn btn-secondary" style="margin-top:6px;font-size:11px;padding:3px 8px;"
                  @click=${() => ctx.setActive('conexoes')}>Configurar →</button>
              `
            }
          </div>

          <div class="card" style="padding:14px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
                        color:var(--ink-muted);margin-bottom:6px;">Próximo post</div>
            ${next
              ? html`
                <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${next.carrosselName}
                </div>
                <div style="font-size:12px;color:var(--ink-muted);margin-top:2px;">${formatDateShort(next.dataHora)}</div>
              `
              : html`<div style="font-size:13px;color:var(--ink-muted);">Nenhum agendado</div>`
            }
          </div>

          <div class="card" style="padding:14px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
                        color:var(--ink-muted);margin-bottom:6px;">Na fila</div>
            <div style="font-size:28px;font-weight:700;line-height:1;">${pending.length}</div>
            <div style="font-size:12px;color:var(--ink-muted);margin-top:2px;">
              post${pending.length !== 1 ? 's' : ''} agendado${pending.length !== 1 ? 's' : ''}
            </div>
          </div>

        </div>

        <!-- Quick actions -->
        <div style="margin-bottom:20px;">
          <div class="kicker" style="margin-bottom:10px;">Ações rápidas</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${QUICK_ACTIONS.map(({ skillId, title, icon }) => html`
              <button class="btn btn-secondary" @click=${() => openSkillModal(skillId)}
                      style="display:flex;align-items:center;gap:6px;">
                <span>${icon}</span> ${title}
              </button>
            `)}
            <button class="btn btn-secondary" @click=${() => ctx.setActive('agenda')}
                    style="display:flex;align-items:center;gap:6px;">
              <span>◑</span> Ver agenda
            </button>
          </div>
        </div>

        <!-- Next 7 days -->
        ${next7.length > 0 ? html`
          <div style="margin-bottom:20px;">
            <div class="kicker" style="margin-bottom:10px;">Próximos 7 dias</div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${next7.map(item => html`
                <div class="card" style="display:flex;align-items:center;gap:10px;padding:8px 12px;">
                  <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                      ${item.carrosselName}
                    </div>
                    <div style="font-size:12px;color:var(--ink-muted);">${formatDateShort(item.dataHora)}</div>
                  </div>
                  <span style="font-size:11px;padding:2px 8px;border-radius:10px;
                               background:var(--yellow-bg,#fef9c3);color:var(--yellow-dark,#854d0e);">
                    Aguardando
                  </span>
                </div>
              `)}
            </div>
          </div>
        ` : ''}

        <!-- Memory health -->
        <div>
          <div class="kicker" style="margin-bottom:10px;">Saúde do sistema</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${healthBadge('Empresa',      !!state.memory?.empresa)}
            ${healthBadge('Preferências', !!state.memory?.preferencias)}
            ${healthBadge('Estratégia',   !!state.memory?.estrategia)}
            ${healthBadge('Identidade',   !!state.identidade)}
          </div>
        </div>

        <!-- Focus card (collapsed, below fold) -->
        <div class="card" style="margin-top:20px;">
          <div class="kicker">Foco atual</div>
          <p style="margin:6px 0 0;color:var(--ink-soft);">${focus}</p>
        </div>
      `;
    },

    async onMount(_container, ctx) {
      const bizName = ctx.state.business?.name || 'Bem-vindo';
      ctx.setTopbar('Hoje', bizName,
        `<button class="btn btn-secondary" id="btn-guide">Primeiros passos</button>
         <button class="btn btn-secondary" id="btn-refresh">Atualizar</button>`
      );
      await loadHojeData(ctx);

      const handleTopbar = async (e) => {
        const t = e.target;
        if (t?.id === 'btn-guide') openGuideModal();
        if (t?.id === 'btn-refresh') {
          if (typeof window.reload === 'function') await window.reload();
          await loadHojeData(ctx);
          ctx.toast('Atualizado.');
        }
      };
      document.addEventListener('click', handleTopbar);
      this._topbarHandler = handleTopbar;
    },

    onUnmount() {
      if (this._topbarHandler) {
        document.removeEventListener('click', this._topbarHandler);
        this._topbarHandler = null;
      }
    },
  });
}

async function loadHojeData(ctx) {
  try {
    const [igCfg, agendaItems] = await Promise.all([
      apiCall('GET', '/api/instagram/config'),
      apiCall('GET', '/api/agenda'),
    ]);
    update({ _hoje: { igCfg, agendaItems } });
  } catch (e) {
    console.warn('[hoje] erro ao carregar dados:', e.message);
  }
}
```

- [ ] **Step 2: Open browser and verify the dashboard**

Open `http://localhost:7777`. The "Hoje" panel should now show:
- 3 status cards (Instagram status, próximo post, contagem)
- Ações rápidas buttons
- Se agenda tiver posts: lista dos próximos 7 dias
- Saúde do sistema badges

- [ ] **Step 3: Commit**

```bash
git add MazyUI/MazyUI-ui/panels/hoje.js
git commit -m "feat: redesign Hoje dashboard with Instagram status and schedule preview"
```

---

## Task 11: .bat launcher improvements

**Files:**
- Modify: `MazyUI/Abrir MazyUI.bat`

> The current .bat already checks for Node.js and polls for the server. We add npm install check.

- [ ] **Step 1: Add npm install check to the .bat**

Replace the current content with:

```batch
@echo off
REM Abre o painel do MazyUI — sobe o servidor local e abre o navegador.
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js nao encontrado.
  echo  Instale em https://nodejs.org e abra de novo.
  echo.
  pause
  exit /b 1
)

REM Instala dependencias se node_modules nao existir
if not exist "node_modules\" (
  echo  Instalando dependencias pela primeira vez...
  npm install --no-audit --no-fund --loglevel=error
  if errorlevel 1 (
    echo  Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

REM Sobe o servidor em background, minimizado
start "MazyUI" /min cmd /c "node MazyUI-server.mjs"

REM Espera o servidor responder antes de abrir o browser
set /a tries=0
:wait
set /a tries+=1
powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://localhost:7777/' -UseBasicParsing -TimeoutSec 1).StatusCode } catch { 0 }" >nul 2>nul
if errorlevel 1 (
  if %tries% LSS 60 (
    timeout /t 1 /nobreak >nul
    goto wait
  )
)

start "" "http://localhost:7777/"
exit
```

- [ ] **Step 2: Test the bat**

Double-click `Abrir MazyUI.bat`. Expected: server starts, browser opens at `http://localhost:7777`.

- [ ] **Step 3: Commit**

```bash
git add "MazyUI/Abrir MazyUI.bat"
git commit -m "feat: improve launcher with auto npm install on first run"
```

---

## Verification Checklist (end-to-end)

After all tasks are complete:

- [ ] **Conexões:** Open panel → paste a real Meta Access Token + Instagram Business ID + imgbb API key → "Salvar" → "Testar conexão" → shows name
- [ ] **Agenda (add):** Go to Biblioteca → click "📅 Agendar" on any carousel → set date/time 2 min in future → Confirmar → toast "Post agendado!"
- [ ] **Agenda panel:** Open Agenda → item appears with "Aguardando" badge
- [ ] **Hoje dashboard:** Instagram card shows "Conectado", "Próximo post" card shows the scheduled post, "Na fila: 1"
- [ ] **Auto-publish:** Wait for scheduled time (server must be running) → item status changes to "Publicado" in Agenda panel
- [ ] **Error state:** Use invalid token → after schedule time passes, item shows red "Erro" badge with message
- [ ] **.bat launcher:** Run on fresh machine (with Node.js) → npm install runs → browser opens
