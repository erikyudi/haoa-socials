(function () {
  // ── Glows por item de nav ─────────────────────────────────────────────────
  var GLOW = {
    hoje:       'rgba(96,165,250,0.32)',
    chat:       'rgba(167,139,250,0.32)',
    skills:     'rgba(52,211,153,0.30)',
    negocio:    'rgba(251,146,60,0.32)',
    tom:        'rgba(244,114,182,0.30)',
    estrategia: 'rgba(34,211,238,0.28)',
    identidade: 'rgba(129,140,248,0.30)',
    biblioteca: 'rgba(250,204,21,0.26)',
    agenda:     'rgba(45,212,191,0.28)',
    conexoes:   'rgba(251,113,133,0.30)',
    wiki:       'rgba(134,239,172,0.30)',
  };

  var NAV_GROUP_IDS = ['setup'];

  function forceGroupsOpen() {
    NAV_GROUP_IDS.forEach(function (id) {
      localStorage.setItem('sabec:nav-group:' + id, '1');
    });
  }

  function applyGlows() {
    document.querySelectorAll('.nav-item[data-id]').forEach(function (el) {
      var color = GLOW[el.getAttribute('data-id')];
      if (color) el.style.setProperty('--item-glow', color);
    });
  }

  // ── Project Switcher ──────────────────────────────────────────────────────
  var _projects      = [];
  var _activeProject = null;
  var _switcherOpen  = false;

  function projectLabel(slug) {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  async function loadProjects() {
    try {
      var res  = await fetch('/api/projetos');
      var data = await res.json();
      _projects      = data.projetos || [];
      _activeProject = data.ativo    || null;
      renderSwitcherContent();
    } catch (e) {
      console.error('[ProjectSwitcher] erro ao carregar projetos', e);
    }
  }

  async function switchProject(nome) {
    if (nome === _activeProject) { closeSwitcher(); return; }
    var btn = document.getElementById('ps-btn');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.4'; }
    try {
      var res  = await fetch('/api/projetos/ativo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ projeto: nome }),
      });
      var data = await res.json();
      if (data.ok) {
        location.reload();
      } else {
        alert('Erro ao trocar projeto: ' + (data.error || 'desconhecido'));
        if (btn) { btn.disabled = false; btn.style.opacity = ''; }
      }
    } catch (e) {
      alert('Erro ao trocar projeto: ' + e.message);
      if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    }
  }

  async function createProject() {
    var nome = prompt('Nome do novo cliente/projeto:');
    if (!nome || !nome.trim()) return;
    try {
      var res  = await fetch('/api/projetos/novo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nome: nome.trim() }),
      });
      var data = await res.json();
      if (data.ok) {
        switchProject(data.slug);
      } else {
        alert('Erro ao criar projeto: ' + (data.error || 'desconhecido'));
      }
    } catch (e) {
      alert('Erro ao criar projeto: ' + e.message);
    }
  }

  async function deleteProject(nome) {
    if (!confirm('Deletar projeto "' + projectLabel(nome) + '"?\n\nTodo o conteúdo será perdido. Essa ação não pode ser desfeita.')) return;
    try {
      var res  = await fetch('/api/projetos/deletar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ projeto: nome }),
      });
      var data = await res.json();
      if (data.ok) {
        await loadProjects();
      } else {
        alert('Erro ao deletar: ' + (data.error || 'desconhecido'));
      }
    } catch (e) {
      alert('Erro ao deletar: ' + e.message);
    }
  }

  function closeSwitcher() {
    _switcherOpen = false;
    var dd = document.getElementById('ps-dropdown');
    if (dd) {
      dd.style.opacity       = '0';
      dd.style.pointerEvents = 'none';
      dd.style.transform     = 'translateY(-6px)';
    }
  }

  function openSwitcher() {
    _switcherOpen = true;
    var dd = document.getElementById('ps-dropdown');
    if (dd) {
      dd.style.opacity       = '1';
      dd.style.pointerEvents = 'auto';
      dd.style.transform     = 'translateY(0)';
    }
  }

  function renderSwitcherContent() {
    var switcher = document.getElementById('project-switcher');
    if (!switcher) return;

    var displayName = _activeProject ? projectLabel(_activeProject) : 'Projeto';

    var projectsHtml = _projects.map(function (p) {
      var isActive = (p === _activeProject);
      var label    = projectLabel(p);
      return [
        '<div class="ps-item" data-project="', p, '" style="',
          'display:flex;align-items:center;justify-content:space-between;',
          'padding:7px 10px;border-radius:7px;cursor:pointer;gap:8px;',
          'color:', (isActive ? 'rgba(245,240,232,0.95)' : 'rgba(245,240,232,0.62)'), ';',
          'background:', (isActive ? 'rgba(245,240,232,0.09)' : 'transparent'), ';',
          'font-size:13px;transition:background 120ms,color 120ms;',
        '">',
          '<span style="display:flex;align-items:center;gap:8px;">',
            '<span style="',
              'width:6px;height:6px;border-radius:50%;',
              'background:', (isActive ? 'rgba(52,211,153,0.8)' : 'transparent'), ';',
              'border:1px solid rgba(245,240,232,', (isActive ? '0.4' : '0.18'), ');',
              'flex-shrink:0;',
            '"></span>',
            label,
          '</span>',
          (!isActive
            ? '<span class="ps-delete" data-project="' + p + '" title="Deletar" style="opacity:0;font-size:11px;padding:2px 5px;border-radius:4px;color:rgba(245,240,232,0.35);cursor:pointer;transition:opacity 150ms,color 150ms;flex-shrink:0;">✕</span>'
            : ''),
        '</div>',
      ].join('');
    }).join('');

    switcher.innerHTML = [
      '<button id="ps-btn" style="',
        'display:flex;align-items:center;gap:6px;',
        'background:rgba(245,240,232,0.06);border:1px solid rgba(245,240,232,0.10);',
        'color:rgba(245,240,232,0.78);padding:5px 11px;border-radius:7px;cursor:pointer;',
        'font-size:12.5px;font-family:var(--sans);white-space:nowrap;',
        'transition:background 150ms,border-color 150ms;',
      '">',
        '<span style="width:5px;height:5px;border-radius:50%;background:rgba(52,211,153,0.75);flex-shrink:0;"></span>',
        '<span id="ps-label">', displayName, '</span>',
        '<span style="font-size:9px;opacity:0.4;margin-left:1px;">▾</span>',
      '</button>',

      '<div id="ps-dropdown" style="',
        'position:absolute;top:calc(100% + 6px);right:0;',
        'min-width:210px;background:var(--ink);',
        'border:1px solid rgba(245,240,232,0.12);border-radius:11px;',
        'padding:6px;box-shadow:0 20px 52px rgba(0,0,0,0.55);',
        'z-index:500;',
        'opacity:0;pointer-events:none;transform:translateY(-6px);',
        'transition:opacity 140ms ease,transform 160ms cubic-bezier(.4,0,.2,1);',
      '">',
        projectsHtml,
        '<div style="border-top:1px solid rgba(245,240,232,0.08);margin:4px 0 0;padding-top:4px;">',
          '<div id="ps-new" style="',
            'display:flex;align-items:center;gap:8px;',
            'padding:7px 10px;border-radius:7px;cursor:pointer;',
            'color:rgba(245,240,232,0.42);font-size:12.5px;',
            'transition:color 120ms,background 120ms;',
          '">',
            '<span style="font-size:15px;line-height:1;margin-top:-1px;">+</span>',
            'Novo cliente / projeto',
          '</div>',
        '</div>',
      '</div>',
    ].join('');

    // Eventos
    document.getElementById('ps-btn').onclick = function (e) {
      e.stopPropagation();
      _switcherOpen ? closeSwitcher() : openSwitcher();
    };
    document.getElementById('ps-btn').onmouseenter = function () {
      this.style.background = 'rgba(245,240,232,0.10)';
      this.style.borderColor = 'rgba(245,240,232,0.18)';
    };
    document.getElementById('ps-btn').onmouseleave = function () {
      this.style.background = 'rgba(245,240,232,0.06)';
      this.style.borderColor = 'rgba(245,240,232,0.10)';
    };

    document.getElementById('ps-new').onclick = function (e) {
      e.stopPropagation();
      closeSwitcher();
      createProject();
    };
    document.getElementById('ps-new').onmouseenter = function () {
      this.style.color = 'rgba(245,240,232,0.72)';
      this.style.background = 'rgba(245,240,232,0.05)';
    };
    document.getElementById('ps-new').onmouseleave = function () {
      this.style.color = 'rgba(245,240,232,0.42)';
      this.style.background = 'transparent';
    };

    switcher.querySelectorAll('.ps-item').forEach(function (el) {
      var proj = el.getAttribute('data-project');
      el.onclick = function (e) {
        if (e.target.classList.contains('ps-delete')) return;
        closeSwitcher();
        switchProject(proj);
      };
      el.onmouseenter = function () {
        if (proj !== _activeProject) {
          el.style.background = 'rgba(245,240,232,0.05)';
          el.style.color = 'rgba(245,240,232,0.85)';
        }
        var del = el.querySelector('.ps-delete');
        if (del) del.style.opacity = '1';
      };
      el.onmouseleave = function () {
        if (proj !== _activeProject) {
          el.style.background = 'transparent';
          el.style.color = 'rgba(245,240,232,0.62)';
        }
        var del = el.querySelector('.ps-delete');
        if (del) del.style.opacity = '0';
      };
    });

    switcher.querySelectorAll('.ps-delete').forEach(function (el) {
      el.onclick = function (e) {
        e.stopPropagation();
        closeSwitcher();
        deleteProject(el.getAttribute('data-project'));
      };
      el.onmouseenter = function () { el.style.color = 'rgba(240,80,80,0.85)'; };
      el.onmouseleave = function () { el.style.color = 'rgba(245,240,232,0.35)'; };
    });
  }

  function mountProjectSwitcher() {
    if (document.getElementById('project-switcher')) return;
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    var wrapper = document.createElement('div');
    wrapper.id  = 'project-switcher';
    wrapper.style.cssText = 'position:relative;display:flex;align-items:center;flex-shrink:0;padding-right:6px;';
    sidebar.appendChild(wrapper);

    // Fecha ao clicar fora
    document.addEventListener('click', function () {
      if (_switcherOpen) closeSwitcher();
    });

    loadProjects();
  }

  function mountRestartBtn() {
    if (document.getElementById('btn-restart-server')) return;
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    var btn = document.createElement('button');
    btn.id  = 'btn-restart-server';
    btn.title = 'Reiniciar servidor';
    btn.style.cssText = 'flex-shrink:0;background:transparent;border:none;color:rgba(245,240,232,0.28);cursor:pointer;font-size:14px;padding:4px 8px;margin-right:2px;transition:color 150ms;';
    btn.textContent = '↺';

    btn.onmouseenter = function () { btn.style.color = 'rgba(245,240,232,0.60)'; };
    btn.onmouseleave = function () { btn.style.color = 'rgba(245,240,232,0.28)'; };

    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = '↺…';
      fetch('/api/restart', { method: 'POST' })
        .then(function () {
          btn.textContent = '✓';
          setTimeout(function () { location.reload(); }, 2500);
        })
        .catch(function () {
          btn.disabled   = false;
          btn.textContent = '↺';
        });
    });

    sidebar.appendChild(btn);
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    forceGroupsOpen();
    mountProjectSwitcher();
    mountRestartBtn();

    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-group-header')) {
        e.stopImmediatePropagation();
        e.preventDefault();
        forceGroupsOpen();
      }
    }, true);

    window.addEventListener('sabec:nav', function () {
      forceGroupsOpen();
      applyGlows();
      if (!document.getElementById('project-switcher')) mountProjectSwitcher();
      if (!document.getElementById('btn-restart-server')) mountRestartBtn();
    });

    window.dispatchEvent(new CustomEvent('sabec:nav'));
    applyGlows();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Wiki panel ────────────────────────────────────────────────────────────

  var WIKI_MD = `# Wiki — Como usar o MazyUI

O MazyUI é o sistema operacional do conteúdo da HAOA. Ele une o contexto do negócio, um design system visual e skills (comandos) para gerar carrosséis, posts, emails e relatórios com consistência.

---

## Menu — o que cada seção faz

| Seção | O que é |
|---|---|
| **Hoje** | Dashboard com resumo do contexto ativo |
| **Chat** | Interface direta com o Claude — onde tudo acontece |
| **Skills** | Lista de todos os comandos disponíveis |
| **Negócio** | Perfil da empresa, serviços, clientes e objetivos |
| **Tom de voz** | Como o Claude escreve em nome da HAOA |
| **Estratégia** | Foco atual, metas e prioridades de conteúdo |
| **Identidade** | Cores, fontes, gradientes e regras visuais |
| **Biblioteca** | Todo conteúdo gerado: carrosséis, posts, fotos |
| **Agenda** | Publicações agendadas para o Instagram |
| **Conexões** | Integrações com Instagram e outras plataformas |

---

## Como o sistema usa seu contexto

Antes de gerar qualquer conteúdo, o Claude lê automaticamente três arquivos:

1. **\`_memoria/empresa.md\`** — quem é a empresa, o que vende, quem são os clientes
2. **\`_memoria/preferencias.md\`** — tom de voz, estilo, o que evitar
3. **\`_memoria/estrategia.md\`** — foco atual, metas dos próximos 30–90 dias

Esses arquivos são editáveis nos painéis **Negócio**, **Tom de voz** e **Estratégia**.

> **Regra de ouro:** Quanto mais rico e específico for o contexto, menos iterações para aprovar um conteúdo.

---

## Gerando conteúdo — passo a passo

### Carrossel (\`/carrossel\`)

\`\`\`
/carrossel Por que contratar plano de saúde empresarial vale a pena
\`\`\`

A skill vai: criar roteiro → gerar HTMLs de cada slide → renderizar PNGs automaticamente.

**Dicas:**
- Informe o público: *"para donos de pequenas empresas"*
- Informe o objetivo: *"educar, não vender"*
- Informe o formato: *"máximo 7 slides, linguagem direta"*

### Post único

No Chat, peça diretamente:

\`\`\`
Crie um post para o Instagram sobre reajuste de planos de saúde.
Tom consultivo. CTA suave para WhatsApp.
\`\`\`

### Email profissional (\`/email-profissional\`)

\`\`\`
/email-profissional Proposta de plano odontológico para empresa com 20 funcionários
\`\`\`

### SEO / Blog (\`/seo\`)

\`\`\`
/seo plano de saúde empresarial pequena empresa
\`\`\`

---

## Calibrando o sistema ao seu gosto

### O que adicionar em "Tom de voz"

Exemplos concretos funcionam melhor do que regras abstratas:

\`\`\`markdown
## Exemplos de copy aprovados
"Você não precisa escolher entre custo e qualidade. A HAOA encontra os dois."
"Plano de saúde para sua equipe: cotação gratuita em 24h, sem burocracia."

## Formatos que funcionam bem
- Carrossel educativo: gancho com dor → 3 slides de solução → CTA consultivo
- Máximo 3 itens por slide — listas longas não convertem
\`\`\`

### O que adicionar em "Estratégia"

Atualize mensalmente:

\`\`\`markdown
## Temas quentes agora
- Reajuste de operadoras — oportunidade de migração
- RH de MPEs: dor com processo burocrático

## Que não fazer agora
- Não falar de plano individual — foco 100% empresarial
\`\`\`

### O que adicionar em "Identidade"

\`\`\`markdown
## Atmosferas aprovadas
- Fundo escuro mesh + tipografia Space Grotesk bold + acento laranja

## Erros recorrentes a evitar
- Não usar gradiente holográfico em posts técnicos/sérios
\`\`\`

---

## Feedback loop — como o sistema aprende

Quando aprovar um resultado:
- Cole um trecho do copy aprovado em **Tom de voz** como exemplo

Quando reprovar:
- Diga ao Claude *exatamente* o que não funcionou
- Ele vai perguntar: *"Quer que eu salve isso para não precisar repetir?"*
- Diga **sim** — enriquece o contexto permanentemente

---

## Workflow semanal recomendado

\`\`\`
Segunda   → Revisar estratégia.md com foco da semana
Terça     → Gerar 2–3 carrosséis com /carrossel
Quarta    → Revisar e aprovar slides na Biblioteca
Quinta    → Agendar publicações na Agenda
Sexta     → Feedback: o que funcionou → salvar em preferencias.md
\`\`\`

---

## Atalhos úteis no Chat

| Comando | O que faz |
|---|---|
| \`/carrossel [tema]\` | Gera carrossel completo (HTML + PNG) |
| \`/email-profissional [tema]\` | Gera email profissional |
| \`/seo [palavra-chave]\` | Gera artigo otimizado para SEO |
| \`/anuncio-google [tema]\` | Gera anúncio para Google Ads |
| \`/relatorio-ads\` | Analisa dados de campanhas em \`dados/\` |
| \`/salvar\` | Salva informação importante na memória |
| \`/atualizar\` | Atualiza contexto após mudanças no negócio |
| \`/skills\` | Lista todos os comandos disponíveis |

---

## Perguntas frequentes

**O Claude não seguiu meu estilo — o que fazer?**
Vá em **Tom de voz** e adicione um exemplo concreto do que você queria.

**Quero mudar cores e fontes — onde fica?**
Painel **Identidade** → edite o design guide ou peça ao Claude: *"Atualize a cor primária para #XXYYZZ"*

**Como publicar no Instagram?**
Vá em **Agenda**, selecione conteúdo da Biblioteca, defina data/hora e agende. Configure credenciais em **Conexões**.

**Como sei que o contexto está correto?**
Abra **Hoje** — mostra resumo do que o Claude está usando como base.
`;

  function mountWikiPanel(container, ctx) {
    ctx.setTopbar('Wiki', 'Como usar o MazyUI', '');

    var html = '';
    if (typeof marked !== 'undefined' && marked.parse) {
      try { html = marked.parse(WIKI_MD, { breaks: true, gfm: true }); } catch (_) {}
    }
    if (!html) {
      html = '<pre style="white-space:pre-wrap">' + WIKI_MD.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>';
    }

    container.innerHTML =
      '<div style="max-width:760px;margin:0 auto;padding:24px 16px 48px">' +
        '<div class="wiki-body">' + html + '</div>' +
      '</div>';

    if (!document.getElementById('wiki-styles')) {
      var s = document.createElement('style');
      s.id = 'wiki-styles';
      s.textContent = [
        '.wiki-body{color:var(--ink,#f1f1f1);font-family:var(--sans,system-ui,sans-serif);line-height:1.7;font-size:15px}',
        '.wiki-body h1{font-size:1.55em;font-weight:700;margin:0 0 4px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:10px}',
        '.wiki-body h2{font-size:1.15em;font-weight:600;margin:2em 0 0.6em;color:#86efac}',
        '.wiki-body h3{font-size:1em;font-weight:600;margin:1.4em 0 0.4em;opacity:0.9}',
        '.wiki-body p{margin:0.6em 0}',
        '.wiki-body ul,.wiki-body ol{padding-left:1.4em;margin:0.4em 0}',
        '.wiki-body li{margin:0.25em 0}',
        '.wiki-body code{background:rgba(255,255,255,0.08);border-radius:4px;padding:1px 5px;font-size:0.88em;font-family:var(--mono,monospace)}',
        '.wiki-body pre{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px 16px;overflow-x:auto;margin:0.8em 0}',
        '.wiki-body pre code{background:none;padding:0;font-size:0.85em}',
        '.wiki-body table{border-collapse:collapse;width:100%;margin:0.8em 0;font-size:0.9em}',
        '.wiki-body th{text-align:left;padding:8px 12px;background:rgba(255,255,255,0.06);font-weight:600;border-bottom:1px solid rgba(255,255,255,0.12)}',
        '.wiki-body td{padding:7px 12px;border-bottom:1px solid rgba(255,255,255,0.06)}',
        '.wiki-body tr:last-child td{border-bottom:none}',
        '.wiki-body blockquote{border-left:3px solid #86efac;margin:0.8em 0;padding:6px 16px;opacity:0.85;font-style:italic;background:rgba(134,239,172,0.04);border-radius:0 6px 6px 0}',
        '.wiki-body hr{border:none;border-top:1px solid rgba(255,255,255,0.08);margin:2em 0}',
      ].join('\n');
      document.head.appendChild(s);
    }
  }

  function registerWikiWhenReady() {
    if (window.Sabec) {
      window.Sabec.registerPanel({
        id:      'wiki',
        label:   'Wiki',
        crumb:   'Wiki',
        glyph:   'W',
        sidebar: true,
        onMount: mountWikiPanel,
      });
    } else {
      window.addEventListener('sabec:ready', function () {
        window.Sabec.registerPanel({
          id:      'wiki',
          label:   'Wiki',
          crumb:   'Wiki',
          glyph:   'W',
          sidebar: true,
          onMount: mountWikiPanel,
        });
      }, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerWikiWhenReady);
  } else {
    registerWikiWhenReady();
  }
})();
