# Instalação do JARVES AI

## Linux

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
npm ci
npm run check
npm test
npm start
```

Abra `http://127.0.0.1:8000`.

## Windows PowerShell

```powershell
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
npm ci
npm run check
npm test
npm start
```

Se necessário, defina `JARVES_PYTHON` para apontar ao Python correto.

## Ollama

Instale e inicie Ollama no computador que executa o backend. Baixe um modelo compatível e selecione-o nas Configurações do JARVES. O modelo não é instalado automaticamente pelo JARVES e não roda dentro do APK.

## Geração de imagens

Instale e inicie um serviço local compatível com Stable Diffusion WebUI/Forge, com API habilitada. Defina no ambiente do backend:

```bash
JARVES_IMAGE_API_URL=http://127.0.0.1:7860
```

Reinicie o JARVES e abra **Ideias em Imagens**. O painel consulta a conexão real; se o serviço estiver ausente, a geração informa indisponibilidade. Até sete imagens PNG podem ser solicitadas por lote. Arquivos são salvos em `data/generated-images/`.

## Acesso pelo Android na rede local

No computador, em uma rede confiável:

```bash
JARVES_HOST=0.0.0.0 JARVES_PORT=8000 JARVES_ACCESS_TOKEN="gere-um-token-forte" ./scripts/run.sh
```

No Android, informe `http://IP-DO-COMPUTADOR:8000` na tela de servidor. Salve o mesmo token em Configurações. A conexão HTTP não é criptografada; não use em Wi-Fi pública e não encaminhe a porta para a internet. O backend e os modelos continuam no computador.

## Desktop

O modo de desenvolvimento usa Python instalado no sistema:

```bash
npm ci
npm start
```

Para empacotar, instale PyInstaller e gere o executável backend com os comandos do README. Copie o executável para `build/backend/` e execute `npm run build:windows` em Windows ou `npm run build:linux` em Linux. Não tente empacotar um alvo Windows em Linux ou vice-versa.

## Android APK

O workflow GitHub Actions compila o APK de debug e publica o arquivo como artefato de execução. O APK não contém Ollama, modelos nem backend. Não há publicação automática em Google Play ou GitHub Releases.
