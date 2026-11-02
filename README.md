# JARVES AI

Assistente de IA gratuito e open source, com interface web e inferência local pelo
[Ollama](https://ollama.com/). O JARVES AI é o aplicativo de orquestração: os
modelos são instalados separadamente e executados na máquina do usuário.

> **Estado do projeto:** MVP funcional em desenvolvimento. O chat prioriza modelos
> Ollama locais sem custo de API (incluindo `qwen3.5:4b` quando instalado), com OpenAI remota opcional. Inclui testador HTML isolado, gerenciador/anexos TXT e PDF,
> correção de TXT pelo modelo escolhido, voz do navegador, foto de fundo e PWA.
> Não há aplicativo Android nativo nem empacotadores desktop. Este repositório não
> foi publicado no GitHub por esta entrega.

O painel **Configurações** permite escolher tema automático (preferência do sistema), escuro, claro ou neon RGB, cor de
destaque, criatividade, limite de tokens por resposta e instruções personalizadas.
As preferências ficam no navegador; temas podem ser importados/exportados em JSON
com uma lista permitida apenas de aparência e cor, sem credenciais. Por padrão, a API envia os parâmetros de
geração ao Ollama local. O JARVES também oferece OpenAI como opção remota quando
`OPENAI_API_KEY` está configurada no servidor. O JARVES não inclui nem declara
integração com um serviço chamado “Codex 6.1”.
Para tarefas de código, instale e selecione um modelo de programação compatível no
Ollama (por exemplo, `qwen2.5-coder:7b`) e confira a licença e os requisitos do
modelo antes de usar.

O botão de perfil permite salvar nome de exibição, nome de usuário local, avatar
ou foto, e cor de destaque. A foto é recortada e comprimida no navegador para
256×256 e fica no IndexedDB; os demais dados são armazenados no `localStorage`.
Salvar, cancelar e restaurar são ações explícitas. Este perfil não é uma conta:
não há senha, autenticação, sincronização ou tradução completa da interface.

## Core e memória local

O chat mantém memória de curto prazo pelo histórico da conversa e oferece uma
**Memória** local que o usuário salva, pesquisa, exporta, importa e exclui. Cada
solicitação só consulta essa memória quando **Usar memória** está marcado; no máximo
três itens lexicalmente relevantes entram no contexto, identificados como dados não
confiáveis. Isso é recuperação contextual, não treinamento nem aprendizagem dos
pesos do modelo. Arquivos TXT/PDF permanecem uma fonte de conhecimento separada e
precisam ser anexados explicitamente.

## Salvamento automático e recuperação

Conversas, mensagens, arquivos de texto extraídos e memórias ficam no SQLite do
servidor (`JARVES_DATABASE`). A pergunta é gravada antes de iniciar a geração; se o
modelo falhar, ela permanece no histórico sem uma resposta inventada. Configurações
e tema ficam no armazenamento local do navegador e são gravados automaticamente
após alterações; modo de resposta, modo rápido e uso de memória ficam em IndexedDB.
Rascunhos do chat, código HTML e
projetos de anime usam IndexedDB com debounce, migração versionada e até cinco
versões anteriores por rascunho. O indicador no topo informa salvamento e falhas.
Rascunhos de mensagens interrompidas são restaurados para revisão, nunca reenviados
automaticamente; a última conversa aberta é retomada quando possível.

Fotos de fundo e fotos de perfil permanecem no IndexedDB privado do navegador. O projeto pode exportar
o storyboard de anime como JSON. Ainda não há backup completo do banco de dados,
restauração global, sincronização entre dispositivos ou recuperação de anexos
originais: arquivos importados são armazenados como texto extraído. Limpar os dados
do navegador ou apagar o arquivo SQLite remove os respectivos dados locais.

## Logic Engine

A aba **Lógica** e `POST /api/logic/analyze` estruturam um pedido usando regras
determinísticas: identificam intenção provável por palavras-chave, extraem itens
explicitamente listados, sugerem modelos genéricos de etapas, apontam lacunas e
pedem confirmação para ações potencialmente irreversíveis. Expressões aritméticas
escritas diretamente são avaliadas por um parser restrito, sem `eval`. Esse módulo
não prova fatos externos, não interpreta contradições semanticamente nem executa
ferramentas. Nos modos **Plano em etapas** e **Diagnosticar bug**, suas sugestões
entram no contexto do modelo como hipóteses revisáveis; o modelo local continua
responsável pela resposta em linguagem natural.

## Modos de resposta e velocidade

No chat, selecione **Atender pedido**, **Plano em etapas**, **Pesquisa online** ou
**Diagnosticar bug** para orientar a resposta. O modo de pesquisa consulta até
cinco páginas da Wikipédia em português, exibe links das fontes e só é iniciado
depois de confirmação: a pergunta é enviada à Wikipédia e esse modo precisa de
internet. Os demais modos continuam locais.

As respostas do chat são transmitidas em streaming: o texto aparece à medida que
Ollama ou OpenAI o gera, em vez de aguardar a resposta completa. A pergunta é
salva no histórico antes da geração; a resposta só é persistida após conclusão
válida. Streaming melhora o tempo até o primeiro texto visível,
mas não aumenta a velocidade de geração do modelo; latência e tokens por segundo
dependem do modelo, do hardware e da rede.
No chat local, o JARVES também desativa o raciocínio estendido do Ollama quando o
modelo aceita essa opção, evitando consumir o limite de saída com conteúdo interno
em vez da resposta visível.

## Diagnóstico de erros

A aba **Diagnóstico** captura erros JavaScript e falhas vistas pela interface,
mantendo até 50 eventos somente no armazenamento local do navegador e removendo
tokens reconhecíveis antes de salvá-los. **Analisar erros** consulta
`GET /api/diagnostics`, que verifica a resposta da API, a integridade SQLite e a
conexão/lista de modelos do Ollama, sem modificar dados ou reiniciar serviços.
Chamadas GET da interface têm até duas tentativas adicionais com espera crescente;
operações que alteram dados e gerações não são repetidas automaticamente. O relatório
JSON é baixado sob solicitação.

Endpoint:

```http
GET /api/diagnostics
POST /api/diagnostics/test
GET /api/health
GET /api/ai/status
POST /api/ai/chat
POST /api/logic/analyze
```

Retorna um estado geral e verificações individuais de API, SQLite e Ollama, cada
uma com status, evidência observada e próximo passo sugerido.
`/api/ai/chat` é um alias compatível para o endpoint existente `/api/chat`; os
dois preservam o mesmo formato, streaming e validações. A interface usa URLs
relativas à origem em que foi aberta, permitindo acesso por IP/nome da máquina
servidora na rede local, em vez de fixar `localhost` no navegador.

O painel oferece diagnóstico e recomendações, não reparo automático de código,
configuração, banco de dados ou processos. Faça backup e autorize alterações
manualmente. A verificação não detecta problemas de GPU/memória do host nem substitui
logs do sistema operacional.

Na interface, o modo **Rápido** é opcional e vem desligado: quando ativado, mantém
o modelo carregado por 10 minutos, envia menos histórico, usa contexto de 4.096
tokens e limita cada resposta a 1.024 tokens. No modo normal, o limite padrão é
4.096 tokens e pode ser ajustado nas configurações até 8.192; o modelo selecionado
e a memória do dispositivo ainda determinam o máximo que pode ser gerado. Clientes
da API que não enviam `fast_mode` preservam o limite de tokens configurado. O
primeiro pedido ainda pode demorar enquanto o modelo carrega;
modelos menores costumam ser mais rápidos, e o desempenho real depende do hardware
e do modelo. O modo de diagnóstico também permite baixar o relatório em Markdown.

## Imagens e modelos 3D

A aba **Imagem e 3D IA** usa o modelo selecionado no Ollama para criar uma ilustração
vetorial SVG ou uma malha Wavefront OBJ a partir de uma descrição. Os arquivos são
gerados localmente e podem ser baixados. A ilustração SVG também pode ser convertida
localmente no navegador e baixada como PNG; o OBJ tem uma prévia 3D interativa no
navegador e pode ser aberto em um editor compatível, como o Blender. Isso não instala
ou baixa modelos extras, mas também não é geração fotorrealista nem usa um modelo
especializado de 3D: a qualidade e a validade do resultado dependem do modelo de
linguagem local. Para reduzir a espera, a geração usa o modo sem raciocínio longo do
Ollama (quando aceito pelo modelo), contexto de 1.536 tokens e limite de saída de
768 tokens. Uma saída SVG inválida recebe no máximo uma nova tentativa de correção,
continuando sujeita à sanitização. O tempo da geração concluída é medido pelo
servidor e mostrado na tela; não é uma promessa de duração futura. Se o modelo
demorar mais de 90 segundos, a interface informa o timeout e sugere uma descrição
mais simples ou um modelo menor. Verifique a licença do modelo antes de redistribuir
o conteúdo.

## Arquivos, voz e instalação

- Anexe ou gerencie arquivos `.txt` e `.pdf` pelo chat e pela aba **Gerenciar arquivos**.
  Limite de 5 MB por arquivo, 100 arquivos guardados e 100 páginas por PDF. O texto
  extraído fica em SQLite local; o binário original não é retido. PDF escaneado sem
  camada de texto não é reconhecido. “Corrigir com IA” usa o modelo local escolhido.
- Pesquise conversas pelo título ou conteúdo e renomeie conversas pelo histórico lateral.
- A aba **Testar HTML** renderiza código em um `iframe` isolado, bloqueando acesso ao
  chat e conexões externas do conteúdo testado. O botão **Jogar exemplo** carrega um
  jogo de pegar estrelas, jogável com teclado ou controles de toque, que pode ser
  editado e baixado como arquivo HTML.
- Leia respostas com voz do sistema; vozes disponíveis dependem do navegador e do OS.
  O ditado pergunta antes de iniciar e pode enviar áudio ao fornecedor de voz do
  navegador. Não é uma transcrição offline garantida.
- Na aba **Estúdio Anime**, Ollama pode gerar um storyboard textual editável a partir
  da descrição. **Gerar animação do texto** interpreta o prompt localmente sem
  depender de um modelo, permite escolher entre seis ambientes e oito movimentos
  e reproduz uma cena procedural com deslocamento suave, pose de personagem e
  efeitos visuais em Canvas 2D. A opção Ollama gera separadamente um storyboard
  editável. Personagem, cenário, legenda, ambiente, movimento e duração de 5–30
  segundos podem ser editados e salvos no projeto. Ao alterar a descrição, os
  seletores de ambiente e movimento voltam à detecção automática; sem legenda
  personalizada, o texto da descrição é usado como legenda da cena.
  Quando o navegador suporta
  `MediaRecorder`/WebM, a cena é exportada como arquivo WebM real sem áudio. Também
  é possível baixar uma animação independente em HTML/CSS, sem dependências
  externas. O rascunho é salvo localmente e mantém até cinco versões anteriores.
  Isto não é
  geração de vídeo por IA; episódios de 25 minutos, múltiplas cenas montadas,
  sincronização labial e voz incorporada ainda não estão implementados.
- Em **Usar vídeo existente**, abra um vídeo local e reproduza uma narração com as
  vozes do dispositivo, velocidade e volume ajustáveis. O vídeo não é enviado ao
  servidor e a narração não é incorporada ao arquivo.
- Para o testador HTML funcionar sem servidor/modelo, acesse uma vez enquanto online
  e deixe o service worker guardar a interface. O chat ainda precisa do Jarves e do
  Ollama em execução, mesmo sem internet.
- No Android, Chrome ou outro navegador compatível pode oferecer **Instalar app**.
  Em desktop/Linux, use o menu do navegador para instalar a PWA. Isso instala a
  interface web; não compila um APK/EXE/AppImage e não instala Ollama no telefone.
- A página `/downloads.html` mostra as opções reais de instalação para Android,
  Windows e Linux. APK/AAB, EXE/MSI, AppImage e DEB ainda não foram compilados nem
  publicados; não há link de release nesta cópia do projeto.
- A interface é responsiva em celular, desktop e Linux. Para outro dispositivo na
  mesma rede, execute `./scripts/run-lan.sh` no computador que hospeda o Jarves.
  O script gera um token temporário e mostra o endereço de rede; informe o token
  em **Configurações → Token para acesso de outro dispositivo** no celular. Em
  seguida, abra o endereço exibido nos dois dispositivos. Mantenha o computador,
  o servidor e o Ollama ligados. No Windows, configure `JARVES_HOST=0.0.0.0` e
  `JARVES_ACCESS_TOKEN` antes de iniciar o Uvicorn e abra o IP local do computador
  (visível com `ipconfig`) no celular. O recurso funciona pelo navegador na rede
  Wi-Fi local; instalar o PWA no celular exige HTTPS. A API exige token para
  clientes remotos, mas o servidor não fornece HTTPS: use somente em rede
  confiável, não use em Wi-Fi público nem encaminhe a porta para a internet.

## Requisitos

- Python 3.10 ou superior.
- Ollama instalado e em execução para gerar respostas.
- Um modelo baixado no Ollama; `ollama pull qwen3.5:4b` instala o modelo local
  gratuito usado como padrão quando disponível. Licenças e termos de
  redistribuição dependem do modelo escolhido.
- Navegador moderno.

O modelo e seu download não são incluídos no repositório. Tamanho, velocidade e
qualidade dependem do modelo e do hardware disponível. Sem Ollama, a interface e a
API iniciam, mas a geração de respostas não fica disponível.

## Executar localmente

Linux/macOS:

Se o Ollama ainda não estiver em execução, inicie `ollama serve` em outro terminal
antes de baixar o modelo.

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
ollama pull qwen3.5:4b
./scripts/run.sh
```

Para permitir acesso do seu celular pela mesma rede Wi-Fi, use `./scripts/run-lan.sh`;
consulte a seção de compatibilidade e segurança antes de habilitar o acesso remoto.

Windows (PowerShell):

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
ollama pull qwen3.5:4b
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

No Linux/macOS, copie `.env.example` para `.env`, informe uma chave nova na
variável `OPENAI_API_KEY` (sem aspas) e inicie com `./scripts/run.sh`. Proteja o
arquivo com `chmod 600 .env`. No Windows, configure `OPENAI_API_KEY` nas
variáveis de ambiente do Windows, abra um novo PowerShell e execute o Uvicorn
como acima. Não coloque chaves no
frontend, no repositório, em capturas de tela ou em mensagens. Chaves compartilhadas
devem ser revogadas. A API OpenAI é um serviço externo, pode cobrar pelo uso e
recebe as mensagens/anexos enviados ao modelo. O chat local via Ollama continua
disponível sem chave; geração de imagem SVG/3D permanece local via Ollama.

Abra <http://127.0.0.1:8000>. A documentação interativa da API fica em
<http://127.0.0.1:8000/docs>.

Configurações opcionais podem ser definidas por variáveis de ambiente:

| Variável | Padrão | Descrição |
|---|---|---|
| `JARVES_OLLAMA_URL` | `http://127.0.0.1:11434` | Endereço do Ollama |
| `JARVES_OLLAMA_KEEP_ALIVE` | `10m` | Tempo para manter o modelo carregado entre pedidos |
| `JARVES_MODEL` | primeiro modelo instalado | Modelo selecionado inicialmente |
| `JARVES_DATABASE` | `data/jarves.db` | Caminho do histórico SQLite |
| `JARVES_HOST` | `127.0.0.1` | Endereço local do servidor |
| `JARVES_PORT` | `8000` | Porta HTTP |
| `JARVES_ACCESS_TOKEN` | vazio | Token de acesso exigido de clientes não locais |
| `OPENAI_API_KEY` | vazio | Chave opcional do backend para modelos OpenAI; mantenha em `.env` local ou ambiente seguro |

O servidor é vinculado ao loopback por padrão. Para acesso pela rede local, gere
um segredo privado e configure o mesmo valor no ambiente do servidor e em
**Configurações → Token para acesso de outro dispositivo**. O token fica salvo no
localStorage do navegador. Sem esse segredo, clientes que não são locais recebem
HTTP 403. Use apenas em rede confiável; o servidor não fornece TLS/HTTPS.

## Testes

```bash
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
node --check frontend/app.js
```

## Estrutura

- `backend/`: API FastAPI e integração com Ollama.
- `frontend/`: interface web estática responsiva.
- `models/`: notas sobre instalação e licenças de modelos externos.
- `plugins/`: convenções para futuras integrações.
- `documentation/`: arquitetura, instalação e roadmap.
- `tests/`: testes da API e utilitários.
- `configuration/`: configuração de exemplo.
- `scripts/`: inicialização e utilitários de desenvolvimento.

## Licença e contribuições

O código deste projeto está sob a licença MIT. Modelos, Ollama e demais componentes
externos mantêm suas próprias licenças; verifique-as antes de baixar ou redistribuir.
Leia [CONTRIBUTING.md](CONTRIBUTING.md) para contribuir e [SECURITY.md](SECURITY.md)
para reportar problemas de segurança.
