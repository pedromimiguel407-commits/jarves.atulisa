# Arquitetura

O MVP separa uma interface estática (`frontend/`) da API FastAPI (`backend/app/`).
A API consulta a API HTTP local do Ollama para listar modelos e gerar respostas.
Não há treinamento de modelos neste projeto.

Conversas e mensagens são persistidas em SQLite no caminho definido por
`JARVES_DATABASE`. Cada mensagem do usuário é persistida antes da chamada ao modelo;
respostas só são persistidas após geração válida. Configurações/tema ficam em
localStorage. O módulo `frontend/autosave.js` cria/migra o IndexedDB
`jarves-local-media` da versão 1 para 2, preserva a store `images` e adiciona
`drafts` e `backups`. Rascunhos usam debounce e guardam até cinco versões anteriores
por chave. O chat recupera rascunhos interrompidos para revisão manual e tenta abrir
a última conversa visitada. Isso não é um backup integral do SQLite nem sincronização
entre dispositivos. Na interface, o modo rápido fica desligado por padrão; quando
ativado, reduz histórico e limita contexto e saída. No modo completo, a API usa no
máximo 20 mensagens e 32.000 caracteres históricos, com limite configurável de 128
a 8.192 tokens. O modelo fica
carregado pelo tempo definido em `JARVES_OLLAMA_KEEP_ALIVE` (10 minutos por padrão).
A API atende somente loopback por padrão;
clientes não locais precisam de um token Bearer configurado no servidor. A conexão
de rede não é criptografada e não deve ser exposta a redes não confiáveis.

## Núcleo e memória

`backend/app/ai_core.py` fornece recuperação lexical limitada para memórias
persistidas e composição de mensagens do modelo. O histórico da conversa é o
contexto de curto prazo; notas SQLite são memória longa opcional, consultada somente
com `use_memory=true`. O usuário administra, pesquisa, importa, exporta e exclui
essas notas por `/api/memory`; arquivos importados continuam sendo anexos
explícitos, não um índice vetorial/RAG automático. Nenhum dado é usado para retreinar
modelos.

Arquivos TXT e PDF são limitados em tamanho e páginas; apenas texto extraído é
armazenado, nunca o binário original. O testador HTML renderiza `srcdoc` em `iframe`
com sandbox, CSP restritiva e sem mesma origem. A PWA guarda apenas os recursos
estáticos; histórico, modelos e processamento de IA exigem o backend local.

As rotas `POST /api/generate/image` e `POST /api/generate/3d` usam o modelo Ollama
selecionado para gerar SVG e Wavefront OBJ. A API valida o formato e restringe SVG a
elementos/atributos sem scripts ou referências externas; OBJ aceita somente vértices
e faces validados. O navegador renderiza o SVG e mostra uma prévia 3D básica da malha.
Esses recursos não usam um modelo especializado de imagem/3D nem fazem geração
fotorrealista.

`POST /api/anime/plan` pede ao Ollama um storyboard textual original. A cena de
animação é desenhada com Canvas 2D no navegador, pode ser editada e exportada como
WebM de até 30 segundos quando há suporte a `MediaRecorder`. O WebM é renderizado no
cliente, sem faixa de áudio; isso não corresponde à geração de vídeo por modelo nem
à montagem de episódios longos.

`backend/app/logic_engine.py` fornece análise local determinística de solicitações:
classificação lexical de intenção, extração de itens explicitamente listados,
modelos genéricos de etapas, lacunas de informação e marcação de ações que pedem
confirmação. `POST /api/logic/analyze` expõe o resultado. O módulo não prova fatos,
não executa ferramentas e não substitui um LLM; a análise entra no prompt do chat
somente nos modos de plano e diagnóstico, rotulada como hipótese revisável.
Expressões aritméticas explícitas usam um AST com operadores permitidos, limites de
expoente e de magnitude; construções Python arbitrárias não são executadas.

## Fluxo do chat

1. O navegador obtém modelos instalados em `GET /api/models`.
2. Envia texto, conversa, modelo e preferências para `POST /api/chat`.
3. Para modelos locais, a API valida o modelo contra a lista do Ollama.
4. O modo opcional de pesquisa consulta a API da Wikipédia em português após
   confirmação no navegador; os resumos entram no contexto como dados não confiáveis
   e a API retorna links para as fontes. Os outros modos só alteram as instruções
   enviadas ao modelo local.
5. Para modelos locais, o Ollama aplica temperatura, limite de tokens, retenção do
   modelo e instruções; o JARVES desativa raciocínio estendido quando suportado e
   transmite os trechos gerados por SSE.
6. A API grava a pergunta em SQLite antes de gerar; só grava a resposta depois de
   uma conclusão não vazia e envia o evento final com modelo, fontes e duração.

## Diagnóstico

`GET /api/health` informa se o processo HTTP está respondendo;
`GET /api/ai/status` informa se o Ollama e modelos locais estão disponíveis.
`GET /api/diagnostics` e `POST /api/diagnostics/test` executam verificações somente
de leitura para a resposta da API, `PRAGMA integrity_check` do SQLite e
conexão/modelos do Ollama. `POST /api/ai/chat` é um alias do chat já existente. A interface
mantém eventos de frontend localmente, com limite e remoção de tokens reconhecíveis.
O `connection-manager.js` monitora `GET /api/health`, exibe desconexões e recupera
o indicador quando a rede volta. Leituras GET têm timeout de 15 segundos, até duas
novas tentativas com espera crescente e deduplicação de leituras simultâneas iguais.
Após três falhas de transporte, um circuit breaker suspende pedidos por 10 segundos
enquanto permite sondagens de saúde;
POSTs, gerações e gravações não são repetidos. Reparos de banco, mudanças de
configuração e reinício de processos são deliberadamente manuais para preservar os
dados e exigir autorização.

O gerador SVG local limita a saída a 768 tokens e o contexto a 1.536 tokens. Uma
saída inválida pode receber uma única tentativa corretiva, sempre revalidada pelo
sanitizador SVG. A resposta informa duração e número de tentativas; isso não
substitui um modelo especializado de geração de imagens.
