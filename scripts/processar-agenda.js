// scripts/processar-agenda.js — motor do agendamento.
//
// Lê agenda.json, encontra posts cujo horário já venceu (status "agendado" e
// datetime <= agora), publica nas redes pedidas e marca o resultado de volta
// no agenda.json. Roda na nuvem via GitHub Actions cron (ou local pra testar).
//
// Uso:
//   node --env-file=.env scripts/processar-agenda.js          # processa de verdade
//   node --env-file=.env scripts/processar-agenda.js --dry    # só mostra o que faria
//
// Schema de cada item em agenda.json:
//   {
//     "slug":      "carrossel-copa-sargentao-2026-06-08",  // = nome da pasta em marketing/conteudo/
//     "datetime":  "2026-06-10T19:00:00-03:00",            // ISO 8601 com timezone
//     "redes":     ["instagram", "facebook"],              // onde postar
//     "status":    "agendado",                             // agendado | postado | erro
//     "postadoEm": null,
//     "resultado": null
//   }

import fs from 'fs';
import path from 'path';
import { postarInstagram } from './postar-instagram.js';
import { postarFacebook } from './postar-facebook.js';

const AGENDA = 'agenda.json';
const CONTENT_DIR = path.join('marketing', 'conteudo');
const DRY = process.argv.includes('--dry');

function carregarAgenda() {
  if (!fs.existsSync(AGENDA)) return [];
  const raw = fs.readFileSync(AGENDA, 'utf8').trim();
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('agenda.json deve ser um array');
  return data;
}

function salvarAgenda(itens) {
  fs.writeFileSync(AGENDA, JSON.stringify(itens, null, 2) + '\n');
}

const POSTADORES = {
  instagram: postarInstagram,
  facebook: postarFacebook,
};

async function processarItem(item) {
  const folder = path.join(CONTENT_DIR, item.slug);
  if (!fs.existsSync(folder)) {
    throw new Error(
      `Pasta não encontrada: ${folder}. ` +
        `O cron roda no projeto ativo do último push — confira se "${item.slug}" pertence a ele.`
    );
  }

  const redes = Array.isArray(item.redes) && item.redes.length ? item.redes : ['instagram'];
  const resultado = {};
  for (const rede of redes) {
    const postar = POSTADORES[rede];
    if (!postar) throw new Error(`Rede desconhecida: ${rede}`);
    console.log(`→ ${item.slug} em ${rede}`);
    resultado[rede] = await postar(folder);
  }
  return resultado;
}

async function main() {
  const itens = carregarAgenda();
  const agora = Date.now();
  let mudou = false;

  const vencidos = itens.filter(
    (it) => it.status === 'agendado' && new Date(it.datetime).getTime() <= agora
  );

  if (!vencidos.length) {
    console.log('Nada vencido. Nada a postar.');
    return;
  }

  console.log(`${vencidos.length} post(s) vencido(s).${DRY ? ' (DRY RUN)' : ''}`);

  for (const item of vencidos) {
    if (DRY) {
      console.log(`[dry] postaria ${item.slug} em ${(item.redes || ['instagram']).join(', ')}`);
      continue;
    }
    try {
      const resultado = await processarItem(item);
      item.status = 'postado';
      item.postadoEm = new Date().toISOString();
      item.resultado = resultado;
      mudou = true;
      console.log(`✓ ${item.slug} postado.`);
    } catch (e) {
      item.status = 'erro';
      item.resultado = { erro: e.message };
      mudou = true;
      console.error(`✗ ${item.slug} falhou: ${e.message}`);
    }
  }

  if (mudou && !DRY) {
    salvarAgenda(itens);
    console.log('agenda.json atualizado.');
  }
}

main().catch((e) => {
  console.error('ERRO fatal no processar-agenda:', e.message);
  process.exit(1);
});
