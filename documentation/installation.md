# Instalação

Instale Python 3.10+, crie um ambiente virtual e instale `requirements.txt`. Instale
Ollama pelo canal oficial e baixe um modelo cuja licença e requisitos de hardware
sejam adequados ao seu uso.

Linux/macOS:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
ollama pull llama3.2
./scripts/run.sh
```

Windows PowerShell:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
ollama pull llama3.2
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Ollama precisa estar iniciado (no Windows, normalmente é executado pelo aplicativo).
No Linux, se necessário, execute `ollama serve` em outro terminal antes de iniciar o app.
Depois, abra `http://127.0.0.1:8000`. O MVP não distribui executáveis nem oferece
cliente Android.

## Usar pelo celular na rede local

O layout funciona em telas pequenas. Para permitir que um telefone abra a interface
no computador, execute o servidor somente em uma rede confiável e proteja os
endpoints com um segredo:

```sh
export JARVES_HOST=0.0.0.0
export JARVES_ACCESS_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
./scripts/run.sh
```

Descubra o endereço IP local do computador e abra `http://IP-DO-COMPUTADOR:8000` no
telefone. No Jarves, abra **Configurações**, cole o valor de `JARVES_ACCESS_TOKEN`
e salve. Não encaminhe essa porta para a internet, não use em Wi-Fi público e não
trate HTTP como conexão criptografada: o token pode ser interceptado na rede.
Para instalar a PWA no celular, o navegador exige um endereço HTTPS confiável; o
projeto não configura certificado TLS automaticamente. O modelo Ollama continua
rodando no computador.

No computador, abra o endereço local em um navegador Chromium compatível e use
**Instalar app** (quando oferecido) ou o menu do navegador. Os recursos de
instalação PWA dependem do navegador e de um contexto seguro.
