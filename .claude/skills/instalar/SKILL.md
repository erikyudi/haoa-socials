---
name: instalar
description: >
  Instala o MazyUI no negócio do usuário. Entrevista sobre empresa, tom de voz,
  foco atual e identidade visual, e preenche `_memoria/empresa.md`, `_memoria/preferencias.md`,
  `_memoria/estrategia.md`, `identidade/design-guide.md` e adapta o `CLAUDE.md` conforme o perfil.
  Use quando o usuário acabou de clonar o repositório e quer instalar o sistema, ou quando
  pedir explicitamente "rodar /instalar", "instalar o MazyUI", "primeiro setup".
---

# /instalar — Instalação inicial do MazyUI

Esse é o primeiro comando que o usuário roda depois de clonar o repositório. Não pode falhar e não pode soar burocrático. Trata como conversa de descoberta — pergunta uma coisa por vez, escuta de verdade, não enfileira tudo. O objetivo é o sistema sair daqui sabendo quem é a empresa, como ela fala, e onde tá o atrito do dia a dia.

## Pré-checagem

### 1. Nome da pasta

Conferir o nome da pasta atual (`basename "$(pwd)"`). Se for `sabec`, `sabec-os`, `SabecOS`, `sabec-os-main` ou variação genérica:

> "Notei que a pasta atual ainda tem nome genérico ('<nome-atual>'). O ideal é a pasta ter o nome do seu negócio, não 'sabec-os'. Quando terminarmos o setup, te lembro de renomear (é rápido — fechar VS Code, renomear a pasta no Finder/Explorer, abrir de novo). Bora seguir?"

Registrar mentalmente o nome atual pra usar na Fase 5.

### 2. Arquivos de contexto

Conferir se algum arquivo de memória já está preenchido (não é placeholder):
- `_memoria/empresa.md`
- `_memoria/preferencias.md`
- `_memoria/estrategia.md`
- `identidade/design-guide.md`

Se algum já tiver conteúdo real, perguntar:
> "Já tem algum contexto preenchido aqui. Quer que eu sobrescreva (recomeçar do zero) ou complemente o que falta?"

Se for setup limpo, seguir direto.

---

## Fase 1 — Escolha do perfil

Perguntar qual perfil mais combina com o negócio:

1. **Solopreneur / criador solo** — uma pessoa só, mistura de marca pessoal e negócio
2. **Freelancer** — atende clientes, organiza por projeto/cliente
3. **Agência / consultoria** — equipe pequena entregando pra vários clientes
4. **Empresa** — empresa estabelecida com setores (marketing, comercial, financeiro, etc.)

A resposta determina qual template de `CLAUDE.md` aplicar (ver `templates/perfis/`).

---

## Fase 2 — Entrevista

Fazer essas perguntas em ordem, esperando a resposta de cada uma antes de seguir. Se vier resposta vaga, repetir uma vez pedindo concretude. Não insistir mais que isso — registrar o que vier.

**Sobre o negócio:**
1. "Como você chama o que você faz? (nome da empresa, ou seu nome se for marca pessoal)"
2. "O que sua empresa entrega, em uma frase do jeito que você falaria pro vizinho?"
3. "Quem te paga? (perfil de cliente real — descreve em uma ou duas frases, sem persona genérica)"
4. "Você toca sozinho ou tem equipe? Se tem, quantos e cada um fazendo o quê?"

**Sobre voz:**
5. "Me cola um exemplo da tua escrita — uma legenda do Insta, um email pra cliente, qualquer coisa real e recente. Assim eu calibro o jeito de escrever sem precisar adivinhar."
6. "O que te dá ranço quando alguém escreve assim? (ex: 'vamos juntos!', emoji em email formal, 'caro cliente', jargão de guru, 'alavancar', 'sinergia')"

**Sobre foco:**
7. "Qual o gargalo do teu negócio hoje? O que tá segurando ele de crescer?"
8. "Se eu pudesse tirar UMA coisa que você repete toda semana das tuas costas, qual seria?"

**Sobre identidade visual:**
9. "Tem identidade visual definida ou tá no zero? Se tem, me passa as cores principais e a fonte."
10. "Tem logo? Aceito PNG ou SVG. Se tiver, coloca os arquivos na pasta `identidade/` e me confirma quais variantes tem: logo principal (horizontal), símbolo/ícone e logo alternativo (negativo/fundo escuro). Pode ter um, dois ou os três."

---

## Fase 3 — Preenchimento dos arquivos

### `_memoria/empresa.md`
Preencher com base nas perguntas 1-4. Manter formato simples — nome, o que faz, perfil de cliente, equipe.

### `_memoria/preferencias.md`
Preencher com base nas perguntas 5-6. Estrutura:
- **Tom de voz:** derivar do exemplo de escrita real da pergunta 5 (descrever em 2-3 frases o jeito de escrever, com referência ao exemplo)
- **O que evitar:** lista direta da resposta 6
- **Estilo geral:** síntese do que combina e o que destoa

### `_memoria/estrategia.md`
Preencher com base nas perguntas 7-8. Estrutura:
- **Gargalo atual:** [resposta da 7]
- **Pra tirar das costas:** [resposta da 8] — registrar como candidata a virar skill via `/mapear-rotinas`
- **Próximas prioridades:** derivar do gargalo (o que ataca o gargalo direto)

### `identidade/design-guide.md`
Se o usuário forneceu cores/fontes/logo (perguntas 9-10), preencher os campos correspondentes. Se não, deixar como está e avisar:
> "Deixei o `identidade/design-guide.md` em branco. Sempre que você definir uma identidade visual, edita lá — as skills de carrossel, proposta e slide leem esse arquivo antes de criar qualquer visual."

#### Formato exato (CRÍTICO — a UI parseia esse arquivo)

A UI do MazyUI lê cores e fontes desse arquivo pra aplicar na interface ao vivo. **Se o formato sair errado, a UI ignora — o painel continua com as cores/fontes padrão e o usuário acha que o /instalar quebrou.** Seguir o padrão abaixo letra por letra.

**Cores — sintaxe obrigatória:**

```markdown
- **Fundo principal:** `#FAF7F2` — descrição curta (1 a 6 palavras)
- **Cor de destaque / CTA:** `#C96442` — descrição
- **Texto principal:** `#1C1917` — descrição
- **Fundo alternativo / cards:** `#F3EFE8` — descrição
- **Cor proibida:** azul elétrico, neón saturado
```

Regras:
- Hex em **backticks** (` `#FAF7F2` `), com `#`, 3 ou 6 dígitos
- Travessão **em dash** (`—`) ou hífen (`-`) separando hex da descrição, com espaço dos dois lados
- **Sempre tem descrição depois do hex** — se não tiver, a UI descarta a linha
- "Cor proibida" não leva backticks/hex (é texto livre)

Os **rótulos** (texto antes dos dois pontos) devem conter palavras-chave que a UI reconhece, senão a cor não é aplicada:
- `Fundo principal` → vira fundo da UI (`--paper`)
- `Fundo alternativo` ou contém `cards` → fundo de cards (`--paper-2`)
- `Texto principal` ou contém `tinta` → cor do texto (`--ink`)
- `Cor de destaque`, `CTA`, ou contém `vermelho` → cor de destaque (`--red`)
- contém `amarelo` → `--yellow`
- contém `verde` → `--green`

Se o usuário definir uma cor extra (ex.: "azul institucional"), só vai aparecer na UI se renomear pra um dos rótulos acima ou conter uma das palavras-chave. Avisar isso na hora.

**Fontes — sintaxe obrigatória:**

```markdown
- **Títulos e destaques:** `Instrument Serif`
- **Corpo, subtítulos e botões:** `Bricolage Grotesque`
- **Peso do título:** regular italic
```

Regras:
- Nome da fonte em **backticks**, exatamente como aparece no Google Fonts (sem "weight 400", sem "(italic)", sem qualificadores — só o nome). Se quiser anotar o peso/estilo, fazer em linha separada (ex.: `Peso do título`).
- Se a fonte não é do Google Fonts, ainda assim usar backticks — a UI vai tentar carregar do Google e cair pra fallback de sistema se falhar. Avisar o usuário.
- Rótulos reconhecidos:
  - contém `título`, `destaque`, `subtítulo` ou `display` → fonte de display (`--syne`)
  - contém `corpo`, `parágrafo`, `botão` ou `botões` → fonte de corpo (`--sans`)
  - contém `sku`, `técnic`, `número`, `mono` ou `código` → fonte mono (`--mono`)
- Se o usuário só mencionar uma fonte, usá-la pra "Títulos e destaques" e repetir em "Corpo, subtítulos e botões" — não deixar campo vazio.

**Logos — sintaxe obrigatória:**

```markdown
## Logos

- **Logo principal:** `identidade/logo-principal.png` — versão horizontal com texto
- **Símbolo / ícone:** `identidade/logo-simbolo.svg` — só o ícone, sem texto
- **Logo alternativo:** `identidade/logo-alt.png` — versão negativa (fundo escuro)
```

Regras:
- Caminho relativo à raiz do projeto, em **backticks**
- Extensão pode ser `.png` ou `.svg` — ambas são válidas
- Rótulos reconhecidos pelo carrossel:
  - contém `principal` ou `horizontal` → logo padrão dos slides (`logo-principal`)
  - contém `símbolo`, `ícone` ou `icon` → marca compacta (`logo-simbolo`)
  - contém `alternativo`, `negativo`, `alt` ou `branco` → versão pra fundo escuro (`logo-alt`)
- Registrar só as variantes que existem — não deixar caminho fictício; a skill de carrossel tenta carregar o arquivo e falha silenciosamente se não existir
- Se o usuário só tiver um logo, registrar em "Logo principal" e repetir em "Logo alternativo" até ter versões separadas

**Validação antes de salvar:** depois de montar o arquivo, ler de volta e conferir que:
1. Cada linha de cor tem o padrão `- **<Rótulo>:** \`#HEX\` — <descrição>`
2. Cada linha de fonte tem o padrão `- **<Rótulo>:** \`<Family>\``
3. Cada linha de logo tem o padrão `- **<Rótulo>:** \`identidade/arquivo.ext\``
4. Pelo menos um rótulo reconhecível existe pra cada categoria (fundo, texto, destaque, fonte de título, fonte de corpo)
5. Se o usuário informou logo, existe ao menos a entrada "Logo principal"

Se faltar algo, completar com defaults razoáveis baseados nas respostas do usuário antes de fechar a fase. Não deixar pra UI descobrir e falhar.

### `CLAUDE.md`
Pegar o template correspondente ao perfil escolhido na Fase 1 (`templates/perfis/claude-md-<perfil>.md`), adaptar com o nome do negócio e estrutura de pastas mencionada nas respostas, e sobrescrever o `CLAUDE.md` da raiz.

---

## Fase 4 — Resumo

Mostrar pro usuário o que foi configurado:

```
✓ Perfil aplicado: [perfil]
✓ Contexto do negócio: _memoria/empresa.md
✓ Tom de voz: _memoria/preferencias.md
✓ Foco atual: _memoria/estrategia.md
✓ Marca: identidade/design-guide.md  [preenchida | em branco — preencher depois]
✓ CLAUDE.md adaptado pro perfil [perfil]
```

---

## Fase 5 — Renomear pasta (se necessário)

Se a pasta atual ainda tem nome genérico (detectado na Pré-checagem), gerar slug do nome da empresa (resposta da pergunta 1):
- minúsculas
- sem acentos
- espaços viram hífen
- caracteres especiais removidos

Ex: "Acme Empresa Ltda" → `acme-empresa-ltda`

Mostrar:

> "Última coisa: a pasta ainda tá com nome genérico ('<nome-atual>').
> Pra ter cara do seu negócio, recomendo renomear pra '<slug>'.
>
> Como fazer:
> 1. Fecha o VS Code
> 2. Renomeia a pasta no Finder (Mac) ou Explorer (Windows) — ou no
>    terminal fora dela: `mv <nome-atual> <slug>`
> 3. Abre o VS Code de novo na pasta renomeada
>
> Se preferir outro nome, me fala que eu ajusto a sugestão."

Se a pasta já tem nome próprio (não genérico), pular essa fase.

---

## Fase 6 — Próximos passos

> "Pronto. O MazyUI já te conhece.
>
> No começo de cada sessão de trabalho, roda `/abrir` — eu carrego tudo
> que combinamos aqui antes da primeira frase. Quando quiser fazer um
> carrossel, plano de SEO, campanha ou qualquer outra coisa, é só
> chamar a skill que cabe.
>
> Você mencionou que repete '<resposta da pergunta 8>' toda semana.
> Quando quiser tirar isso das costas de vez, roda `/mapear-rotinas`
> que eu transformo em skill própria."

Se o usuário quiser publicar o trabalho no GitHub, mencionar `/salvar`.

---

## Regras

- Não inventar dados — se a resposta for vaga, registrar do jeito que veio (ou deixar placeholder claro)
- Não escrever "este arquivo será preenchido pelo /instalar" nos arquivos finais — esse aviso só existe nos placeholders, sai depois do /instalar
- O setup deve durar 5-7 minutos no máximo. Se o usuário estiver enrolando numa pergunta, registra o que tem e segue
- Não fazer perguntas extras além das listadas acima sem motivo claro
- **`design-guide.md` precisa do formato exato pra UI parsear**: cores com `\`#HEX\` — descrição`, fontes com `\`Nome da Family\``, logos com `\`identidade/arquivo.ext\`` (PNG ou SVG), rótulos contendo as palavras-chave reconhecidas (`Fundo principal`, `Cor de destaque`, `Títulos e destaques`, `Logo principal`, etc.). Ver seção "Formato exato" na Fase 3. Se sair errado, painel ignora e cliente acha que /instalar quebrou.
