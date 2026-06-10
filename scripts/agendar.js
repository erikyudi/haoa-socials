// scripts/agendar.js — adiciona um post na fila de agendamento (agenda.json).
//
// Evita editar o JSON na mão (erro de vírgula derruba o cron).
//
// Uso:
//   node scripts/agendar.js <slug> "<datetime>" [redes]
//
// Exemplos:
//   node scripts/agendar.js carrossel-copa-sargentao-2026-06-08 "2026-06-10T19:00:00-03:00"
//   node scripts/agendar.js carrossel-copa-sargentao-2026-06-08 "2026-06-10 19:00" instagram
//   node scripts/agendar.js carrossel-copa-sargentao-2026-06-08 "2026-06-10 19:00" instagram,facebook
//
// Se a hora não tiver timezone, assume -03:00 (Brasília).

import fs from 'fs';
import path from 'path';

const AGENDA = 'agenda.json';

function normalizarDatetime(s) {
  let v = s.trim().replace(' ', 'T');
  // Sem timezone? Anexa -03:00 (Brasília).
  if (!/[+-]\d{2}:?\d{2}$|Z$/.test(v)) {
    if (/T\d{2}:\d{2}$/.test(v)) v += ':00';
    v += '-03:00';
  }
  const d = new Date(v);
  if (isNaN(d.getTime())) throw new Error(`Data inválida: "${s}"`);
  return v;
}

function main() {
  const [slug, datetimeRaw, redesRaw] = process.argv.slice(2);
  if (!slug || !datetimeRaw) {
    console.error('Uso: node scripts/agendar.js <slug> "<datetime>" [redes]');
    console.error('Ex:  node scripts/agendar.js carrossel-x-2026-06-08 "2026-06-10 19:00" instagram,facebook');
    process.exit(1);
  }

  const folder = path.join('marketing', 'conteudo', slug);
  if (!fs.existsSync(folder)) {
    console.error(`Aviso: pasta ${folder} não existe no projeto ativo. Agendando mesmo assim.`);
  }

  const datetime = normalizarDatetime(datetimeRaw);
  const redes = (redesRaw || 'instagram,facebook')
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);

  let itens = [];
  if (fs.existsSync(AGENDA)) {
    const raw = fs.readFileSync(AGENDA, 'utf8').trim();
    if (raw) itens = JSON.parse(raw);
  }

  itens.push({
    slug,
    datetime,
    redes,
    status: 'agendado',
    postadoEm: null,
    resultado: null,
  });

  fs.writeFileSync(AGENDA, JSON.stringify(itens, null, 2) + '\n');
  console.log(`Agendado: ${slug} → ${datetime} em ${redes.join(', ')}`);
}

main();
