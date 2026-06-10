// scripts/postar-facebook.js — publica um carrossel na Página do Facebook via Meta Graph API.
//
// Uso (CLI):
//   node --env-file=.env scripts/postar-facebook.js marketing/conteudo/<slug>
//
// Também exporta postarFacebook(folder) pra ser chamado pelo processar-agenda.js.

import { findSlides, readCaption, uploadAllToImgbb, postFacebook, env } from './lib-meta.mjs';

export async function postarFacebook(folder) {
  const pageId = env('META_PAGE_ID');
  const token = env('META_PAGE_ACCESS_TOKEN');
  const imgbbKey = env('IMGBB_KEY');

  const slides = findSlides(folder);
  const caption = readCaption(folder, 'facebook');

  console.log(`[facebook] ${slides.length} foto(s) — subindo pro imgbb...`);
  const urls = await uploadAllToImgbb(slides, imgbbKey);

  console.log('[facebook] publicando...');
  const postId = await postFacebook({ pageId, token, imageUrls: urls, caption });

  console.log(`[facebook] OK — post id: ${postId}`);
  return postId;
}

// Executa como CLI quando rodado direto (não quando importado).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('postar-facebook.js')) {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Uso: node --env-file=.env scripts/postar-facebook.js <pasta-do-conteudo>');
    process.exit(1);
  }
  postarFacebook(folder).catch((e) => {
    console.error('[facebook] ERRO:', e.message);
    process.exit(1);
  });
}
