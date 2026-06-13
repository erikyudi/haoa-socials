// scripts/ig-token.mjs — gera e renova o token do Instagram Login (sem Página FB).
//
// Pré-req (.env): IG_APP_ID, IG_APP_SECRET, IG_REDIRECT_URI
//
//   node scripts/ig-token.mjs authurl                          # 1) imprime URL de autorização
//   node --env-file=.env scripts/ig-token.mjs exchange <code>  # 2) code -> IG_USER_ID + IG_ACCESS_TOKEN (~60d)
//   node --env-file=.env scripts/ig-token.mjs refresh          # renova antes dos 60 dias

const SCOPES = 'instagram_business_basic,instagram_business_content_publish';
function env(n) { const v = process.env[n]; if (!v) throw new Error(`Env faltando: ${n}`); return v; }

async function authurl() {
  const u = new URL('https://www.instagram.com/oauth/authorize');
  u.searchParams.set('client_id', env('IG_APP_ID'));
  u.searchParams.set('redirect_uri', env('IG_REDIRECT_URI'));
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', SCOPES);
  console.log(u.toString());
  console.log('# Abra a URL, autorize com @haoaseguros, copie o valor de ?code= da URL de redirect.');
}

async function exchange(code) {
  // 1) code -> token de curta duração + user_id
  const form = new URLSearchParams({
    client_id: env('IG_APP_ID'),
    client_secret: env('IG_APP_SECRET'),
    grant_type: 'authorization_code',
    redirect_uri: env('IG_REDIRECT_URI'),
    code,
  });
  const r1 = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form });
  const j1 = await r1.json();
  if (!r1.ok || !j1.access_token) throw new Error(`exchange falhou: ${JSON.stringify(j1)}`);

  // 2) curta -> longa duração (~60 dias)
  const qs = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: env('IG_APP_SECRET'),
    access_token: j1.access_token,
  });
  const r2 = await fetch(`https://graph.instagram.com/access_token?${qs}`);
  const j2 = await r2.json();
  if (!r2.ok || !j2.access_token) throw new Error(`long-lived falhou: ${JSON.stringify(j2)}`);

  console.log('IG_USER_ID=' + j1.user_id);
  console.log('IG_ACCESS_TOKEN=' + j2.access_token);
  console.log(`# expira em ~${j2.expires_in}s (~60 dias). Renove com: node scripts/ig-token.mjs refresh`);
}

async function refresh() {
  const qs = new URLSearchParams({
    grant_type: 'ig_refresh_token',
    access_token: env('IG_ACCESS_TOKEN'),
  });
  const r = await fetch(`https://graph.instagram.com/refresh_access_token?${qs}`);
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`refresh falhou: ${JSON.stringify(j)}`);
  console.log('IG_ACCESS_TOKEN=' + j.access_token);
  console.log(`# novo token, expira em ~${j.expires_in}s`);
}

const [cmd, arg] = process.argv.slice(2);
const fn = { authurl, exchange, refresh }[cmd];
if (!fn) { console.error('Uso: node scripts/ig-token.mjs authurl|exchange <code>|refresh'); process.exit(1); }
fn(arg).catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
