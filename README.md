# JARVES AI 2.3.7

Assistente local em português brasileiro, com interface web responsiva, backend FastAPI/Python, inferência local opcional pelo Ollama e cliente Android WebView.

> **Estado desta versão:** desenvolvimento beta. Recursos só são considerados disponíveis quando a integração e os testes correspondentes são verificados. APK, EXE e AppImage são produzidos como artefatos de CI; não há publicação automática em Releases.

## Arquitetura real

- **Frontend:** HTML, CSS e JavaScript em `frontend/`.
- **Backend:** FastAPI em `backend/app/main.py`, servido por Uvicorn.
- **IA de texto:** Ollama local; integração remota opcional com OpenAI configurada no servidor.
- **Persistência:** SQLite; caminho padrão `data/jarves.db`, alterável por `JARVES_DATABASE`.
- **Android:** cliente WebView que se conecta ao backend em um computador/servidor na mesma rede.
- **Desktop:** Electron inicia um backend Python empacotado; no modo de desenvolvimento usa Python instalado no sistema.

Os módulos JavaScript legados em `ai/` e `backend/services/` não são o backend ativo. O backend ativo é FastAPI; não execute os serviços legados isoladamente.

## Requisitos

- Python 3.10 ou superior.
- Node.js 22.13 ou superior para scripts npm e empacotamento desktop.
- Ollama opcional para respostas generativas locais.
- Java 17 e Gradle/Android SDK para compilar Android manualmente; o workflow GitHub configura o ambiente.
- Para o instalador desktop, PyInstaller empacota o backend Python antes do Electron.

## Iniciar no computador

Linux:
```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
npm ci
npm run check
npm test
npm start
```

Windows PowerShell:
```powershell
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
npm ci
npm run check
npm test
npm start
```

Abra `http://127.0.0.1:8000`. Se Python não estiver no PATH, defina `JARVES_PYTHON` com o executável correto. O comando `npm start` apenas inicia o FastAPI; ele não instala Python nem Ollama automaticamente.

## Ollama e modelos de texto

1. Instale e inicie o Ollama no computador que executa o backend.
2. Baixe um modelo compatível pelo próprio Ollama.
3. Abra Configurações no JARVES e atualize a lista de modelos.

A inferência ocorre no computador/servidor, não dentro do APK. Modelos maiores exigem mais memória e armazenamento. A alternativa offline `jarves-base` é limitada e não equivale a um LLM generativo.

## Ideias em Imagens — até 7 por lote

A área **Ideias em Imagens** permite refinar uma descrição com Ollama e enviar um lote de até sete imagens a um serviço local compatível com Stable Diffusion WebUI/Forge.

No computador que executa o JARVES, configure:

```bash
JARVES_IMAGE_API_URL=http://127.0.0.1:7860
```

Inicie o serviço local de imagens com a API habilitada e reinicie o JARVES. O painel mostra se a conexão foi realmente detectada. PNGs recebidos são guardados em `data/generated-images/` e podem ser visualizados, baixados ou excluídos pela galeria.

Sem um serviço de imagens configurado, a geração retorna uma mensagem de indisponibilidade; o JARVES não simula resultados. A geração usa CPU/GPU, RAM, energia e espaço em disco. Em celulares modestos, use o telefone como cliente do computador, não como host do modelo de imagem.

A função **Imagem e 3D IA** existente continua separada: ela cria SVG vetorial e malhas OBJ por meio do modelo de texto, não imagens fotorrealistas.

## Android

O APK abre um **menu independente no próprio celular**, sem exigir computador para iniciar a aplicação. Inclui bloco de notas local, uso do reconhecimento de voz do Android e uma opção de conexão com API externa/local quando existir um servidor disponível. O menu e as notas funcionam offline.

**Limite importante:** esta compilação ainda não embute o backend Python, Ollama ou um modelo generativo local no APK. Portanto, a conversa generativa e recursos que dependem da API continuam indisponíveis sem um backend/modelo configurado. O reconhecimento de voz depende do serviço de fala instalado no Android e pode precisar de internet.

Para conectar a uma API opcional, abra **Configurar conexão** no menu e informe o endereço HTTPS (ou HTTP apenas em rede local confiável). Se o servidor exigir autenticação, configure o token correspondente nas definições do backend.

O aplicativo não força a abertura da sua tela ao ligar/reiniciar o telefone. O Android restringe lançamentos de atividades em segundo plano; abra o JARVES pelo ícone normal do aplicativo.

## Builds

### Android APK

O workflow **Android APK** compila `android/app/build/outputs/apk/debug/app-debug.apk` e envia o arquivo como artefato do GitHub Actions. O APK de debug não é um pacote assinado para publicação na Play Store.

### Windows EXE e Linux AppImage

Os workflows de desktop empacotam o backend Python com PyInstaller e depois o Electron. O build deve ocorrer em runner do sistema operacional de destino. Os instaladores são artefatos de CI; não são publicados em Releases automaticamente.

Build local Linux:
```bash
python -m pip install pyinstaller
python -m PyInstaller --noconfirm --clean --onefile --name JARVESBackend --paths . --collect-all fastapi --collect-all starlette --collect-all pydantic --collect-all uvicorn --collect-all pypdf --collect-all multipart --add-data "frontend:frontend" --add-data "JARVES_UNIVERSAL_ERROR_ENGINE:JARVES_UNIVERSAL_ERROR_ENGINE" scripts/backend_entry.py
mkdir -p build/backend
cp dist/JARVESBackend build/backend/
npm run build:linux
```

No Windows, use `;` como separador de `--add-data` e copie `dist/JARVESBackend.exe` para `build/backend/JARVESBackend.exe` antes de executar `npm run build:windows`.

## Testes e verificações

```bash
npm run check
npm test
python -m unittest discover -s tests -p "test_*.py"
```

Os comandos verificam sintaxe, estrutura, interface, testes JavaScript e testes Python. A geração real de imagens depende de um serviço local; a compilação depende dos SDKs e runners correspondentes. Consulte o resultado dos workflows antes de considerar um artefato validado.

## Custos e licenças

O núcleo local prioriza ferramentas gratuitas e abertas. Baixar modelos e executá-los usa internet, armazenamento e hardware; licenças de modelos podem variar. Provedores remotos opcionais podem cobrar por uso. Não existe promessa de custo zero universal.

## Segurança e dados

- Não coloque chaves ou tokens no código nem em commits.
- Use `.env.example` como referência; mantenha `.env` privado.
- O banco local existente em `data/jarves.db` é preservado; não o substitua sem backup.
- Faça backup antes de mudanças de banco ou migrações.
- Endpoints remotos exigem token Bearer quando o cliente não é loopback.
- O gerador de imagens aceita somente endpoint HTTP em localhost ou IP privado configurado no servidor.

Consulte [Arquitetura](documentation/architecture.md), [Instalação](documentation/installation.md), [Segurança](SECURITY.md) e o [Relatório de evolução beta](RELATORIO_EVOLUCAO_BETA.md).
