// scripts/postar-instagram.js — publica um carrossel no Instagram via Meta Graph API.
//
// Uso (CLI):
//   node --env-file=.env scripts/postar-instagram.js marketing/conteudo/<slug>
//
// Também exporta postarInstagram(folder) pra ser chamado pelo processar-agenda.js.

import { findSlides, readCaption, uploadAllToImgbb, postInstagram, env } from './lib-meta.mjs';

export async function postarInstagram(folder) {
  const igUserId = env('IG_USER_ID');
  const token    = env('IG_ACCESS_TOKEN');
  const imgbbKey = env('IMGBB_KEY');

  const slides = findSlides(folder);
  const caption = readCaption(folder, 'instagram');

  console.log(`[instagram] ${slides.length} slide(s) — subindo pro imgbb...`);
  const urls = await uploadAllToImgbb(slides, imgbbKey);

  console.log('[instagram] publicando...');
  const postId = await postInstagram({ igUserId, token, imageUrls: urls, caption });

  console.log(`[instagram] OK — post id: ${postId}`);
  return postId;
}

// Executa como CLI quando rodado direto (não quando importado).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('postar-instagram.js')) {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Uso: node --env-file=.env scripts/postar-instagram.js <pasta-do-conteudo>');
    process.exit(1);
  }
  postarInstagram(folder).catch((e) => {
    console.error('[instagram] ERRO:', e.message);
    process.exit(1);
  });
}
