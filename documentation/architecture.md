# Arquitetura atual do JARVES AI

## Componentes ativos

- **Interface:** HTML/CSS/JavaScript estático em `frontend/`, servido por FastAPI.
- **API:** `backend/app/main.py`, FastAPI + Uvicorn.
- **IA de texto:** adaptador Python para Ollama local e integração OpenAI opcional.
- **Memória:** histórico e notas em SQLite; recuperação lexical limitada em `backend/app/ai_core.py`.
- **Lógica:** `backend/app/logic_engine.py` classifica pedidos e propõe etapas; não executa ferramentas nem prova fatos.
- **Arquivos:** upload de TXT/PDF com limites; conteúdo extraído é armazenado no banco.
- **Imagem vetorial:** `POST /api/generate/image` pede SVG ao modelo de texto e valida a saída.
- **Imagem raster:** `POST /api/images/generate` encaminha a solicitação a um endpoint local Stable Diffusion WebUI/Forge, valida PNG e guarda em `data/generated-images/`. Máximo de 7 por lote.
- **Android:** WebView conectado ao backend remoto na rede local.
- **Desktop:** Electron inicia backend Python empacotado por PyInstaller.

Os arquivos JavaScript legados em `ai/` e `backend/services/` não fazem parte do caminho ativo do FastAPI. Eles não devem ser tratados como serviço em execução sem uma futura migração explícita.

## Inicialização

- `npm start` chama `scripts/start.mjs`, que inicia `uvicorn backend.app.main:app`.
- `scripts/run.sh` inicia o mesmo backend e lê variáveis permitidas de `.env`.
- `GET /api/health` retorna estado, serviço e versão; o cliente Android valida esses campos.
- O host padrão é `127.0.0.1`, porta `8000`. Acesso LAN exige `JARVES_HOST=0.0.0.0` e token Bearer.

## Dados

- SQLite padrão: `data/jarves.db`; substituível por `JARVES_DATABASE`.
- Imagens geradas: `data/generated-images/<uuid>.png`.
- Preferências locais de interface ficam no armazenamento do navegador.
- Arquivos de dados não devem ser sobrescritos durante atualizações; faça cópia antes de migrações.

## Provedores

Ollama é executado separadamente. O JARVES consulta os modelos instalados e envia prompts ao endpoint configurado por `JARVES_OLLAMA_URL`. A geração de imagem raster usa `JARVES_IMAGE_API_URL`, que aceita apenas localhost ou endereço IP privado explícito. O modelo de texto que refina ideias não é o motor de geração raster.

## Segurança

- Entradas são validadas no frontend e no backend.
- SQLite usa parâmetros nas consultas.
- Clientes não locais precisam de `Authorization: Bearer` com `JARVES_ACCESS_TOKEN`.
- O serviço de imagem não aceita URLs arbitrárias fornecidas pelo navegador.
- A API local em HTTP não fornece criptografia; não exponha portas em redes públicas.
- A prévia HTML usa isolamento/sandbox quando disponível.

## Limitações conhecidas

- O APK é cliente e depende do computador/servidor para API e modelos.
- O build de desktop depende do backend PyInstaller gerado para o sistema operacional de destino.
- Geração raster depende de um serviço local e de hardware compatível.
- Pesquisa web e provedores remotos dependem de rede e podem ter limites/custos.
- Os módulos legados Node não estão conectados ao FastAPI ativo.
