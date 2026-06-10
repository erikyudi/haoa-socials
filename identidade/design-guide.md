# Identidade visual

> Como a HAOA aparece em tudo que produzimos.
> As skills de conteúdo, carrossel e post leem esse arquivo antes de criar qualquer visual.

---

## Cores

> Os 4 rótulos do **Núcleo** abaixo são lidos pela UI ao vivo (o servidor parseia esse arquivo). Não alterar o formato `- **<rótulo>:** \`#HEX\` — <nota>` sob pena de a UI ignorar a configuração.

**Núcleo (lido pela UI):**
- **Fundo principal:** `#0A0A0A` — preto base premium, fundo do sistema
- **Fundo alternativo / cards:** `#F13F13` — vermelho coral, acento forte de atenção
- **Texto principal:** `#EDE9DF` — off-white, alto contraste sem agredir
- **Cor de destaque / CTA:** `#FFA400` — âmbar dourado, acento CTA e destaque visual

**Apoio (referência humana, não lida pela UI):**
- `#1B1B1B` — grafite elevado, card sobre card
- `#2A2A2A` — line (borda discreta no escuro), `#202020` line-soft (separador)
- `#9A968D` — ink-dim (texto secundário), `#5E5B54` ink-faint (labels técnicas)
- `#CC8200` — âmbar escuro (hover, variante de botão) · `#FFD166` — âmbar claro (highlight ice)

**Modo claro (raro):**
- `#F5F2EC` — papel off-white (nunca `#FFFFFF` puro)
- `#E5E0D5` — paper-line
- Texto sobre papel: `#0A0A0A`

**Espectro expressivo** — **uso primário em fundos de post** (mesh radial) e em **kickers que herdam a atmosfera do slide**. Nunca vira botão, CTA ou cor de UI funcional:
- `#E0662F` âmbar forte · `#F13F13` vermelho coral · `#8A4FE0` violeta · `#C44BC9` magenta

Regra do kicker espectral: quando o slide tem mesh atmosférico, o **kicker mono adota a cor dominante daquela atmosfera** (ex: slide com mesh âmbar → kicker `#E0662F`; slide com mesh vermelho → kicker `#F13F13`; slide neutro → kicker `#FFD166` âmbar claro). Isso **substitui** o kicker âmbar `#FFA400` no miolo — âmbar puro fica reservado pra capa neutra, CTA final e UI.

**Acento raro:**
- `#D8CBB0` — areia, monograma stamp pontual

**Proibido:** pastel chapado, neon verde, arco-íris saturado, azul de tech genérico, `#FFFFFF` puro.

---

## Tipografia

> Os 3 rótulos abaixo são lidos pela UI ao vivo. Formato: `- **<rótulo>:** \`<família>\` — <nota>`.

- **Headlines e títulos principais:** `Space Grotesk` — display geométrico, peso **medium (500)**, tracking fechado (`-.04em` a `-.045em`) em uppercase
- **Corpo, subtítulos e botões:** `Inter` — neutra, leitura limpa, peso 400/500
- **Kickers, labels técnicos e dados:** `JetBrains Mono` — peso 500, tracking aberto (`.18em` a `.32em`) em uppercase, prefixo padrão `↳`

Regra do contraste: Space Grotesk domina os títulos com peso visual massivo e tracking fechado; JetBrains Mono enquadra a composição nos kickers, topbar e labels com tracking aberto. Esse contraste é o coração do estilo.

---

## Estilo geral

Proteção com presença. Consultivo premium. **Âmbar emergindo do preto** — sinal de atenção e confiança que nasce das bordas e aquece a composição. Autoridade sem rigidez corporativa: sério, próximo, confiável, com calor humano.

**Regra de cor por peça:** o preto `#0A0A0A` é a base, o âmbar `#FFA400` é o acento funcional (CTA, régua, kicker neutro), e o **espectro expressivo é a atmosfera** — cada slide tem uma cor de mesh dominante (âmbar forte, vermelho coral, violeta, magenta) que muda de slide pra slide pra dar respiração cromática. Carrossel inteiro só âmbar é monotonia — **evite**.

Inspiração viva: Nubank, Linear, Inter (banco), agências de comunicação premium com fundo escuro e calor editorial.

---

## Elementos-chave

- Bordas: 1px em `#2A2A2A` (line) no escuro, `#E5E0D5` no claro
- Border-radius: **12px** cards, **8px** botões, 999px pills
- Botões primários: fundo `#FFA400`, texto `#0A0A0A`, radius 8px, glow sutil `0 0 40px rgba(255,164,0,.18)`
- Botões ghost: transparente, border `#2A2A2A`, hover muda border pra `#FFA400`
- Pills: padding 9px 17px, border 1px `#2A2A2A`, `.dot` 6px âmbar, variante `.solid` com fundo âmbar
- HUD frame: cantos 14px em `#FFA400` (marcas de corte) — usar pra destacar dados/painel de observação
- Card de vidro: `linear-gradient(180deg, rgba(255,164,0,.08), rgba(20,20,20,.6))` + `backdrop-filter: blur(6px)`
- Sombras: **evitar**. Só glow âmbar sutil em CTAs primários
- Halftone: pontos warm `#FFD166` 1.2-1.4px em grid de 8-9px, com mask radial — overlay sutil
- Grão: SVG fractalNoise 3-4% opacity, mix-blend `overlay`, sempre presente em fundos grandes
- Grade técnica: linhas 1px em `rgba(237,233,223,.04)`, pitch 80px, com máscara radial — presente em todos os slides
- Kicker prefix: `↳` como âncora visual antes do texto; cor varia por atmosfera do slide (âmbar, vermelho, violeta, magenta)
- Color rule: 72px × 4px, fundo `#FFA400`, `box-shadow: 0 0 20px rgba(255,164,0,.4)` — divide kicker de headline na capa
- SVG decorativos: **Radar** (círculos concêntricos + mira, stroke branco 0.3px, opacidade .10–.25, ponto central `#FFA400`) — posicionados fora do padding, parcialmente cortados pela borda
- **Gradientes espectrais (default pra capa e atmosfera de slide):**
  - `g-holo` — `radial-gradient(circle at 50% -20%, rgba(224,102,47,0.26), transparent 50%), radial-gradient(circle at 15% 50%, rgba(138,79,224,0.24), transparent 50%), radial-gradient(circle at 85% 50%, rgba(241,63,19,0.22), transparent 50%), radial-gradient(circle at 50% 120%, rgba(255,164,0,0.28), transparent 55%), radial-gradient(circle at 50% 50%, rgba(255,164,0,0.15), transparent 40%)` sobre `#0A0A0A` — Warm Fluid (capa multicolor mestre suave, **default canônico**)
  - `g-ember` — `radial-gradient(ellipse 70% 120% at 78% 18%, #E0662F 0%, #F13F13 26%, #FFA400 52%, #0A0A0A 82%)` — âmbar→vermelho→dourado, quente intenso
  - `g-nova` — `radial-gradient(circle at 85% 15%, #F13F13 0%, rgba(241,63,19,0.8) 18%, rgba(196,75,201,0.7) 42%, rgba(255,164,0,0.5) 70%, #0A0A0A 95%)` — Vermelho Flame, brilho no topo direito
  - **Mesh quente-frio inferior-esquerdo + superior-direito:** combo `radial-gradient(circle at 25% 75%, rgba(224,102,47,.26), transparent 50%), radial-gradient(circle at 75% 25%, rgba(138,79,224,.18), transparent 50%)` sobre `#0A0A0A` — boa pra slide de dado
- **Gradientes-assinatura (âmbar) — uso restrito:** radial hero, steel diagonal, light emergindo. Reservados pra **CTA final**, hero de landing, e capa quando o tema pede peso institucional.
- **Fundo âmbar chapado** (`#FFA400` flat, sem gradiente nem textura) — **proibido em post**. Único lugar tolerado: botão.

---

## Uso de fotografia

- Preferência por **tons quentes com grão** ou cor desbotada (low saturation, contraste alto)
- Tema: ambiente consultivo, reuniões reais, pessoas em contexto de decisão — nada de stock corporativo genérico
- Quando usar cor: paleta restrita ao âmbar + vermelho + neutros
- Evitar: fotografia genérica de banco de imagem, gente posada sorrindo sem contexto

---

## O que NUNCA fazer

- Usar `#FFFFFF` puro (usar `#F5F2EC` se precisar de modo claro)
- Cores do espectro expressivo (âmbar forte/vermelho/violeta/magenta) virando **botão, CTA, link** ou cor funcional de UI — espectro é fundo/atmosfera e (no máximo) cor do kicker mono. Botão/CTA usa âmbar `#FFA400` ou off-white
- **Fundo âmbar chapado** (`background: #FFA400;` flat sem mesh/textura) em slide de carrossel
- **Capa com fundo `#0A0A0A` chapado** (preto sem mesh espectral) — capa **precisa** de gradiente espectral (`g-holo`, `g-ember`) ou mesh quente-frio
- **Carrossel monocromático** — todos os slides com a mesma atmosfera. Variar atmosfera por slide é regra
- Sombras pesadas — no máximo glow âmbar sutil
- Foto stock corporativo de gente sorrindo posada
- Pastel chapado, neon verde, arco-íris saturado, azul de tech genérico
- Texto em CAPS LOCK longo (mais de 4 palavras)
- Quadro lotado de texto (uma ideia + um CTA por peça)
- Mais de um CTA competindo
- "Vamos juntos!", "Decola!", "Bora!" estampado em peça
- Mockup de site/app dentro de moldura de iPhone genérico

## Regras de post (Instagram)

- **Margem segura:** 8% em toda peça. Texto, logo e CTA nunca cruzam essa calha
- **Ancoragem:** kicker mono no topo, headline display embaixo-esquerda, CTA logo abaixo
- **Uma ideia por slide.** Densidade é pro carrossel, não pro slide
- **Kicker:** mono 9-11px (proporção; em 4:5 1080×1350 vira ~24px), tracking `.22em`, uppercase. **Cor herda a atmosfera do slide** (espectro dominante do mesh). Default neutro: âmbar claro `#FFD166`
- **Page counter:** mono 9-10px no canto superior direito (`01/05`)
- **CTA pill:** padding 7px 14px, radius 999px, fundo `#FFA400` ou ghost com border off-white. Em CTA final com fundo âmbar rico, usar pill **off-white** (`#EDE9DF`) com texto preto pra contraste máximo
- **Formatos canônicos:** 1:1 (1080×1080 feed) · 4:5 (1080×1350 carrossel — mestre) · 9:16 (1080×1920 story/reels)
- **Arco do carrossel:** capa (gancho+promessa) → miolo (um ponto/slide, mono enumerado `01/02/03`) → dado (KPI mono gigante) → fecho (CTA único)

### Atmosfera por slide — regra crítica de variedade cromática

Cada slide do carrossel tem uma cor de atmosfera diferente do vizinho. A atmosfera vem do mesh de fundo + cor do kicker + (opcional) cor do anel/radar decorativo.

**Receita padrão (6 slides):**

| # | Tipo de slide | Atmosfera default | Mesh / fundo |
|---|---|---|---|
| 01 | CAPA | **warm multicolor** | `g-holo` **obrigatório como padrão**. Variantes intensas (`g-nova`, `g-ember`) só quando "alta voltagem" ou "impacto forte" for pedido |
| 02 | PONTO 01 | âmbar-frio | radial âmbar `rgba(255,164,0,.22)` no canto inferior-esquerdo sobre `#0A0A0A`; kicker `#FFA400` |
| 03 | DADO / KPI | quente (âmbar forte+violeta) | mesh quente-frio (ember 25%/75% + violet 75%/25%) ou `g-nova`; kicker `#E0662F`; ring decorativo âmbar |
| 04 | PONTO 02 | vermelho coral | mesh vermelho nas bordas + violeta; kicker `#F13F13` |
| 05 | HUD / ESTRUTURA | âmbar-frio com moldura HUD | radial âmbar sutil central + cantos HUD em `#FFA400`; kicker warm `#FFD166` |
| 06 | CTA FINAL | âmbar rico | radial âmbar `#FFA400` → `#CC8200` → `#0A0A0A` com halftone `#FFD166`; pill off-white |

**Antipadrão proibido:** dois slides seguidos com a mesma cor de atmosfera.

---

## Logo

- **Arquivo:** `identidade/logo.svg` — versão vetorial principal, enviada via painel em 04 de jun. de 2026 (original: `haoa_logotipo_ok-01.svg`)
- **Cores do logo:** âmbar `#FFA400`, vermelho `#EC4638`, cinza escuro `#3F3F3F`
- **Versão pra fundo escuro:** usar o SVG original (cores já funcionam sobre fundo escuro)
- **Onde usar:** header de propostas, slide final de carrossel (CTA), assinatura de e-mail, marca d'água em fichas de produto
- **Tamanho sugerido:** largura entre 120-200px nos HTMLs
