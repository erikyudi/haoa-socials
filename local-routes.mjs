// local-routes.mjs — ContentCreator: multi-projeto + rotas custom
import fs from 'fs';
import path from 'path';

const PROJECTS_DIR = 'projetos';
const ACTIVE_FILE  = 'projeto-ativo.json';

// Diretórios e arquivos que pertencem ao projeto (copiados no switch)
const PROJECT_DIRS        = ['_memoria', 'identidade'];
const PROJECT_FILES_LONE  = ['instagram.config.json'];
// Pasta de conteúdo — movida (rename) em vez de copiada para ser rápido
const CONTENT_REL = path.join('marketing', 'conteudo');

// ─── helpers internos ─────────────────────────────────────────────────────────

function readActive(ROOT) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, ACTIVE_FILE), 'utf8')).projeto || null;
  } catch { return null; }
}

function writeActive(ROOT, nome) {
  fs.writeFileSync(
    path.join(ROOT, ACTIVE_FILE),
    JSON.stringify({ projeto: nome }, null, 2)
  );
}

function listProjects(ROOT) {
  const dir = path.join(ROOT, PROJECTS_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => {
      try { return fs.statSync(path.join(dir, name)).isDirectory(); }
      catch { return false; }
    })
    .sort();
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Tenta rename (O(1)); se cross-device, faz copy+delete
function moveDirSafe(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    fs.renameSync(src, dest);
  } catch {
    copyDirSync(src, dest);
    fs.rmSync(src, { recursive: true, force: true });
  }
}

// Salva estado atual (root) na pasta do projeto
function saveCurrentToProject(ROOT, nome) {
  const projDir = path.join(ROOT, PROJECTS_DIR, nome);
  fs.mkdirSync(projDir, { recursive: true });

  // Dirs: _memoria, identidade
  for (const dir of PROJECT_DIRS) {
    const src  = path.join(ROOT, dir);
    const dest = path.join(projDir, dir);
    if (fs.existsSync(src)) {
      fs.rmSync(dest, { recursive: true, force: true });
      copyDirSync(src, dest);
    }
  }

  // Arquivos soltos: instagram.config.json
  for (const file of PROJECT_FILES_LONE) {
    const src  = path.join(ROOT, file);
    const dest = path.join(projDir, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }

  // Conteúdo de marketing: move (não copia) pra ser rápido
  const contentSrc  = path.join(ROOT, CONTENT_REL);
  const contentDest = path.join(projDir, CONTENT_REL);
  fs.mkdirSync(path.join(projDir, 'marketing'), { recursive: true });
  if (fs.existsSync(contentSrc)) {
    fs.rmSync(contentDest, { recursive: true, force: true });
    moveDirSafe(contentSrc, contentDest);
  } else {
    fs.mkdirSync(contentDest, { recursive: true });
  }
}

// Carrega estado de um projeto para root (ativa o projeto)
function loadProjectToRoot(ROOT, nome) {
  const projDir = path.join(ROOT, PROJECTS_DIR, nome);

  for (const dir of PROJECT_DIRS) {
    const src  = path.join(projDir, dir);
    const dest = path.join(ROOT, dir);
    fs.rmSync(dest, { recursive: true, force: true });
    if (fs.existsSync(src)) copyDirSync(src, dest);
    else fs.mkdirSync(dest, { recursive: true });
  }

  for (const file of PROJECT_FILES_LONE) {
    const src  = path.join(projDir, file);
    const dest = path.join(ROOT, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }

  const contentSrc  = path.join(projDir, CONTENT_REL);
  const contentDest = path.join(ROOT, CONTENT_REL);
  fs.rmSync(contentDest, { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, 'marketing'), { recursive: true });
  if (fs.existsSync(contentSrc)) {
    moveDirSafe(contentSrc, contentDest);
  } else {
    fs.mkdirSync(contentDest, { recursive: true });
  }
}

function toSlug(nome) {
  return nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ─── registro de rotas ───────────────────────────────────────────────────────

export function register({ ROOT, helpers, addRoute }) {
  console.log('[local-routes] multi-projeto ativo. ROOT:', ROOT);

  // Serve local-ui.css
  addRoute('GET', '/local-ui.css', (req, res) => {
    const content = helpers.readSafe('local-ui.css');
    if (!content) return helpers.text(res, 404, 'sem local-ui.css');
    helpers.text(res, 200, content, 'text/css; charset=utf-8');
  });

  // ── Projetos ──────────────────────────────────────────────────────────────

  // Listar projetos
  addRoute('GET', '/api/projetos', (req, res) => {
    const projetos = listProjects(ROOT);
    const ativo    = readActive(ROOT);
    helpers.json(res, 200, { projetos, ativo });
  });

  // Trocar projeto ativo
  addRoute('POST', '/api/projetos/ativo', async (req, res) => {
    try {
      const { projeto } = JSON.parse(await helpers.readBody(req));
      if (!projeto || typeof projeto !== 'string') {
        return helpers.json(res, 400, { error: 'projeto obrigatório' });
      }
      const projDir = path.join(ROOT, PROJECTS_DIR, projeto);
      if (!fs.existsSync(projDir)) {
        return helpers.json(res, 404, { error: `projeto "${projeto}" não existe` });
      }
      const atual = readActive(ROOT);
      if (atual === projeto) return helpers.json(res, 200, { ok: true, projeto });

      if (atual) saveCurrentToProject(ROOT, atual);
      loadProjectToRoot(ROOT, projeto);
      writeActive(ROOT, projeto);

      helpers.json(res, 200, { ok: true, projeto });
    } catch (e) {
      helpers.json(res, 500, { error: String(e.message || e) });
    }
  });

  // Criar novo projeto
  addRoute('POST', '/api/projetos/novo', async (req, res) => {
    try {
      const body = JSON.parse(await helpers.readBody(req));
      const nome = (body.nome || '').trim();
      if (!nome) return helpers.json(res, 400, { error: 'nome obrigatório' });

      const slug = toSlug(nome);
      if (!slug) return helpers.json(res, 400, { error: 'nome inválido' });

      const projDir = path.join(ROOT, PROJECTS_DIR, slug);
      if (fs.existsSync(projDir)) {
        return helpers.json(res, 409, { error: `projeto "${slug}" já existe` });
      }

      fs.mkdirSync(path.join(projDir, '_memoria'), { recursive: true });
      fs.mkdirSync(path.join(projDir, 'identidade'), { recursive: true });
      fs.mkdirSync(path.join(projDir, 'marketing', 'conteudo'), { recursive: true });

      fs.writeFileSync(
        path.join(projDir, '_memoria', 'empresa.md'),
        `# Empresa\n\n**Nome:** ${nome}\n\n**Negócio:** \n\n**O que faz:** \n\n## Contexto adicional\n\n`
      );
      fs.writeFileSync(
        path.join(projDir, '_memoria', 'preferencias.md'),
        `# Preferências\n\n## Tom de voz\n\n## O que evitar\n\n## Estilo geral\n\n`
      );
      fs.writeFileSync(
        path.join(projDir, '_memoria', 'estrategia.md'),
        `# Estratégia\n\n## Fase\n\n## Prioridade principal\n\n`
      );
      fs.writeFileSync(
        path.join(projDir, 'identidade', 'design-guide.md'),
        `# Identidade Visual\n\n## Paleta de Cores\n\n## Tipografia\n\n`
      );
      fs.writeFileSync(
        path.join(projDir, 'instagram.config.json'),
        JSON.stringify({ token: '', userId: '', imgbb_key: '' }, null, 2)
      );

      helpers.json(res, 200, { ok: true, slug });
    } catch (e) {
      helpers.json(res, 500, { error: String(e.message || e) });
    }
  });

  // Deletar projeto (não pode deletar o ativo)
  addRoute('POST', '/api/projetos/deletar', async (req, res) => {
    try {
      const { projeto } = JSON.parse(await helpers.readBody(req));
      if (!projeto) return helpers.json(res, 400, { error: 'projeto obrigatório' });

      const atual = readActive(ROOT);
      if (atual === projeto) {
        return helpers.json(res, 400, { error: 'não pode deletar o projeto ativo' });
      }
      const projDir = path.join(ROOT, PROJECTS_DIR, projeto);
      if (!fs.existsSync(projDir)) {
        return helpers.json(res, 404, { error: 'projeto não existe' });
      }
      fs.rmSync(projDir, { recursive: true, force: true });
      helpers.json(res, 200, { ok: true });
    } catch (e) {
      helpers.json(res, 500, { error: String(e.message || e) });
    }
  });

  // ── Rotas existentes ──────────────────────────────────────────────────────

  // Deletar item da biblioteca
  addRoute('POST', '/api/delete-item', async (req, res) => {
    try {
      const { name } = JSON.parse(await helpers.readBody(req));
      if (!name || typeof name !== 'string') {
        return helpers.json(res, 400, { error: 'name obrigatório' });
      }
      const rel = path.join('marketing', 'conteudo', name);
      const abs = helpers.safeResolve(rel);
      if (!fs.existsSync(abs)) {
        return helpers.json(res, 404, { error: `item não encontrado: ${rel}` });
      }
      fs.rmSync(abs, { recursive: true, force: true });
      helpers.json(res, 200, { ok: true });
    } catch (e) {
      helpers.json(res, 500, { error: String(e.message || e) });
    }
  });
}
