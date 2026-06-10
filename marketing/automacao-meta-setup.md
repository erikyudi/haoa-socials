# Postagem automática agendada — setup

Sistema que posta carrossel no Instagram + Facebook no dia/hora que você
agendar, sozinho, sem precisar do seu PC ligado. Roda na nuvem via **GitHub
Actions cron**.

## Como funciona (visão geral)

```
você agenda  →  agenda.json (fila)  →  GitHub Actions roda a cada 15min
                                          ↓
                          posts vencidos (datetime <= agora)?
                                          ↓ sim
              sobe PNGs no imgbb → Meta Graph API → posta IG + FB
                                          ↓
                       marca status "postado" no agenda.json
```

- **Instagram não tem agendamento nativo na API** — o post sai na hora em que
  a API é chamada. Por isso o cron fica de plantão e dispara no horário.
- **O cron atrasa 5-15 min** (limitação do GitHub Actions). Normal. Pra IG
  não faz diferença.

## Pré-requisitos (uma vez só)

### 1. Conta Instagram Business + Página Facebook

- Conta Instagram precisa ser **Business** (ou Creator), não pessoal
- Conectada a uma **Página** do Facebook
- Você precisa ser admin da Página

### 2. App no Meta for Developers

1. Vá em https://developers.facebook.com/apps → **Create App** → tipo "Business"
2. Adicione o produto **Instagram Graph API** e **Facebook Login**
3. Permissões necessárias: `instagram_basic`, `instagram_content_publish`,
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`

### 3. Pegar os 3 valores da Meta

Use o **Graph API Explorer** (https://developers.facebook.com/tools/explorer):

| Valor | Como pegar |
|---|---|
| `META_PAGE_ACCESS_TOKEN` | Gere um **token de Página de longa duração** (60 dias). Veja nota abaixo. |
| `META_PAGE_ID` | `GET /me/accounts` → campo `id` da sua Página |
| `META_IG_USER_ID` | `GET /{page-id}?fields=instagram_business_account` → campo `id` |

> **Token de longa duração:** o token curto do Explorer expira em ~1h. Troque
> por um de 60 dias: `GET /oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={token-curto}`.
> Depois pegue o token **da Página** (não do usuário) via `GET /me/accounts`.
> Token de Página derivado de user-token de longa duração **não expira**
> enquanto o app e a permissão seguirem válidos.

### 4. Chave do imgbb (hospeda as imagens)

A Meta API busca a imagem por URL pública. O imgbb hospeda de graça:

1. Crie conta em https://imgbb.com
2. Pegue a chave em https://api.imgbb.com → `IMGBB_KEY`

### 5. Cadastrar tudo como GitHub Secrets

No repo do GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

Crie os 4 secrets (nomes exatos):

- `META_PAGE_ACCESS_TOKEN`
- `META_PAGE_ID`
- `META_IG_USER_ID`
- `IMGBB_KEY`

> Os tokens ficam **só nos Secrets** do GitHub, nunca no código nem no `.env`
> commitado. O `.env` local (pra testar na sua máquina) deve estar no
> `.gitignore`.

## Como agendar um post

O conteúdo precisa **já estar criado e renderizado em PNG** (`slide-XX.png`
dentro de `marketing/conteudo/<slug>/instagram/`). Renderize o carrossel antes.

Aí use o CLI:

```bash
node scripts/agendar.js <slug> "<data e hora>" [redes]
```

Exemplos:

```bash
# IG + FB (padrão), horário de Brasília assumido
node scripts/agendar.js carrossel-copa-sargentao-2026-06-08 "2026-06-10 19:00"

# só Instagram
node scripts/agendar.js carrossel-copa-sargentao-2026-06-08 "2026-06-10 19:00" instagram
```

Depois **commite e pushe** o `agenda.json` — o cron lê do que está no GitHub:

```bash
git add agenda.json && git commit -m "agenda: post de 10/06" && git push
```

## Testar antes de confiar

**Dry run** (mostra o que faria, sem postar):

```bash
node --env-file=.env scripts/processar-agenda.js --dry
```

**Post manual de uma pasta** (sem mexer na fila):

```bash
node --env-file=.env scripts/postar-instagram.js marketing/conteudo/<slug>
node --env-file=.env scripts/postar-facebook.js  marketing/conteudo/<slug>
```

**Forçar o cron na nuvem agora:** aba **Actions** do GitHub → workflow
"Postar agendados" → **Run workflow**.

## Limitações conhecidas (v1)

1. **Multi-projeto:** o cron roda no repo que foi pushado = **só o projeto
   ativo** (`projeto-ativo.json`). Posts agendados de outro projeto não
   acham a pasta de conteúdo e marcam `erro`. Pra agendar de vários projetos,
   precisaria mover o conteúdo pra fora do esquema de troca de projeto — fica
   pra v2 se virar necessidade.
2. **Token expira:** se você gerou token de 60 dias em vez de permanente, ele
   morre e os posts falham. Renove ou gere um permanente (ver nota acima).
3. **PNG tem que existir:** o cron não renderiza. Renderize o carrossel antes
   de agendar.

## Schema do agenda.json

```json
[
  {
    "slug": "carrossel-copa-sargentao-2026-06-08",
    "datetime": "2026-06-10T19:00:00-03:00",
    "redes": ["instagram", "facebook"],
    "status": "agendado",
    "postadoEm": null,
    "resultado": null
  }
]
```

- `status`: `agendado` → `postado` (com `resultado` = ids dos posts) ou `erro`
  (com `resultado.erro` = mensagem).
- `datetime`: ISO 8601 com timezone. Sem timezone, `agendar.js` assume `-03:00`.
