// scripts/lib-meta.mjs — helpers compartilhados pra postar carrossel via Meta Graph API.
// Sem dependências externas: usa fetch/FormData/Blob nativos do Node 18+.
//
// Env esperado (vem do .env local ou dos GitHub Secrets no workflow):
//   META_PAGE_ACCESS_TOKEN  token de longa duração da Página FB
//   META_PAGE_ID            ID da Página FB (pra Facebook)
//   META_IG_USER_ID         ID da conta Instagram Business (pra Instagram)
//   IMGBB_KEY               chave da API do imgbb (hospeda os PNGs)

import fs from 'fs';
import path from 'path';

export const GRAPH = 'https://graph.facebook.com/v21.0';
export const IG_GRAPH = 'https://graph.instagram.com/v21.0';

// ── util ────────────────────────────────────────────────────────────────────

export function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Env faltando: ${name}`);
  return v;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Localiza os PNGs do carrossel dentro da pasta de conteúdo.
// Tenta dois layouts conhecidos, em ordem:
//   <pasta>/instagram/slide-XX.png
//   <pasta>/instagram/imagens/1080x1350/slide-XX.png
export function findSlides(folder) {
  const candidates = [
    path.join(folder, 'instagram'),
    path.join(folder, 'instagram', 'imagens', '1080x1350'),
  ];
  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    const pngs = fs
      .readdirSync(dir)
      .filter((f) => /^slide-\d+\.png$/i.test(f))
      .sort()
      .map((f) => path.join(dir, f));
    if (pngs.length) return pngs;
  }
  throw new Error(
    `Nenhum PNG de slide encontrado em ${folder}. ` +
      `Renderize o carrossel (slide-XX.png) antes de agendar o post.`
  );
}

// Lê a legenda. Aceita legenda.md (Instagram/Facebook) ou variante por rede.
export function readCaption(folder, rede) {
  const tentativas = [
    rede ? path.join(folder, `legenda-${rede}.md`) : null,
    path.join(folder, 'legenda.md'),
  ].filter(Boolean);
  for (const f of tentativas) {
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  }
  return ''; // sem legenda é permitido
}

// ── imgbb ─────────────────────────────────────────────────────────────────────

// Sobe um PNG pro imgbb e devolve a URL pública (a Meta API busca a imagem por URL).
export async function uploadToImgbb(pngPath, imgbbKey) {
  const base64 = fs.readFileSync(pngPath).toString('base64');
  const form = new FormData();
  form.append('key', imgbbKey);
  form.append('image', base64);

  const r = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.data?.url) {
    throw new Error(`imgbb falhou (${r.status}): ${JSON.stringify(j)}`);
  }
  return j.data.url;
}

export async function uploadAllToImgbb(pngPaths, imgbbKey) {
  const urls = [];
  for (const p of pngPaths) urls.push(await uploadToImgbb(p, imgbbKey));
  return urls;
}

// ── Graph API helper ──────────────────────────────────────────────────────────

async function graphPost(urlPath, params, base = GRAPH) {
  const body = new URLSearchParams(params);
  const r = await fetch(`${base}/${urlPath}`, { method: 'POST', body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.error) {
    throw new Error(`Graph POST /${urlPath} falhou (${r.status}): ${JSON.stringify(j.error || j)}`);
  }
  return j;
}

async function graphGet(urlPath, params, base = GRAPH) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${base}/${urlPath}?${qs}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.error) {
    throw new Error(`Graph GET /${urlPath} falhou (${r.status}): ${JSON.stringify(j.error || j)}`);
  }
  return j;
}

// ── Instagram ─────────────────────────────────────────────────────────────────

// Publica carrossel (ou imagem única) no Instagram.
// imageUrls: array de URLs públicas. caption: texto. Retorna o id do post publicado.
export async function postInstagram({ igUserId, token, imageUrls, caption }) {
  if (!imageUrls.length) throw new Error('Sem imagens pra postar no Instagram');

  if (imageUrls.length === 1) {
    const c = await graphPost(`${igUserId}/media`, {
      image_url: imageUrls[0], caption, access_token: token,
    }, IG_GRAPH);
    await waitContainer(c.id, token);
    const pub = await graphPost(`${igUserId}/media_publish`, {
      creation_id: c.id, access_token: token,
    }, IG_GRAPH);
    return pub.id;
  }

  const childIds = [];
  for (const url of imageUrls) {
    const child = await graphPost(`${igUserId}/media`, {
      image_url: url, is_carousel_item: 'true', access_token: token,
    }, IG_GRAPH);
    childIds.push(child.id);
  }

  const carousel = await graphPost(`${igUserId}/media`, {
    media_type: 'CAROUSEL', children: childIds.join(','), caption, access_token: token,
  }, IG_GRAPH);

  await waitContainer(carousel.id, token);

  const pub = await graphPost(`${igUserId}/media_publish`, {
    creation_id: carousel.id, access_token: token,
  }, IG_GRAPH);
  return pub.id;
}

// IG processa o container async; espera virar FINISHED antes de publicar.
async function waitContainer(containerId, token, { tentativas = 20, intervaloMs = 3000 } = {}) {
  for (let i = 0; i < tentativas; i++) {
    const j = await graphGet(containerId, { fields: 'status_code', access_token: token }, IG_GRAPH);
    if (j.status_code === 'FINISHED') return;
    if (j.status_code === 'ERROR') throw new Error(`Container IG deu ERROR: ${containerId}`);
    await sleep(intervaloMs);
  }
  throw new Error(`Container IG não ficou pronto a tempo: ${containerId}`);
}

// ── Facebook ──────────────────────────────────────────────────────────────────

// Publica carrossel (ou foto única) na Página do Facebook. Retorna o id do post.
export async function postFacebook({ pageId, token, imageUrls, caption }) {
  if (!imageUrls.length) throw new Error('Sem imagens pra postar no Facebook');

  // Foto única — publica direto com legenda.
  if (imageUrls.length === 1) {
    const r = await graphPost(`${pageId}/photos`, {
      url: imageUrls[0],
      caption,
      access_token: token,
    });
    return r.post_id || r.id;
  }

  // Multi-foto: sobe cada foto unpublished, depois cria o post com attached_media.
  const mediaFbids = [];
  for (const url of imageUrls) {
    const ph = await graphPost(`${pageId}/photos`, {
      url,
      published: 'false',
      access_token: token,
    });
    mediaFbids.push(ph.id);
  }

  const attached = {};
  mediaFbids.forEach((id, i) => {
    attached[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
  });

  const post = await graphPost(`${pageId}/feed`, {
    message: caption,
    ...attached,
    access_token: token,
  });
  return post.id;
}
