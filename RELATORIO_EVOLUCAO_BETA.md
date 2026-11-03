# Relatório de evolução beta — JARVES AI

## Escopo

- Repositório: `pedromimiguel407-commits/jarves.atulisa`
- Branch de trabalho: `ai/evolution-max-2026-11-02`
- Base original de `main`: `897b3b05b1ce3b34509d619d4eb4d7f4eb5f6617`
- Estado: alterações isoladas na branch; `main` não foi modificada.
- Releases: nenhuma Release foi criada ou publicada.

## Auditoria inicial

1. A página HTML havia sido substituída por uma versão que referenciava CSS, scripts e seletores inexistentes ou incompatíveis com `frontend/app.js`.
2. `npm start` apontava para `backend/server.mjs`, ausente. O backend ativo era FastAPI em `backend/app/main.py`.
3. O endpoint `/api/health` não retornava o campo `version` exigido pelo cliente Android.
4. A documentação descrevia Express/Node como backend ativo, embora o caminho funcional fosse FastAPI.
5. Não havia workflows ativos de CI, APK e desktop no estado auditado.
6. O projeto Android é um cliente WebView, não um pacote com Ollama e backend embutidos.

## Alterações aplicadas

- Restaurada a página funcional alinhada aos scripts e estilos existentes.
- Criada a área **Ideias em Imagens**, com refinamento opcional de prompt via Ollama e seleção de 1 a 7 imagens por lote.
- Criadas rotas para estado do provedor, refinamento, geração, galeria, download e exclusão de PNGs.
- Integração local configurável via `JARVES_IMAGE_API_URL` com Stable Diffusion WebUI/Forge.
- Segurança do provedor: apenas localhost ou IP privado explícito; bloqueio de endereços públicos, link-local e reservados; limite de resposta e de tamanho por imagem; validação de assinatura/cabeçalho PNG.
- Imagens efetivamente recebidas são armazenadas em `data/generated-images/`; o sistema não simula imagens quando o provedor está indisponível.
- `npm start` agora inicia FastAPI/Uvicorn através de `scripts/start.mjs`.
- Criados scripts de verificação, testes e empacotamento desktop.
- Criado inicializador Electron que inicia o backend Python empacotado por PyInstaller e restringe navegação à origem local exata.
- Health check agora inclui versão; corrigida a porta padrão Android para 8000.
- Criados workflows CI, Android e desktop. Eles enviam artefatos; não publicam Releases.
- Atualizados README, arquitetura, instalação, segurança, changelog, licença e `.env.example`.

## Validação automatizada

Última execução CI concluída com sucesso no commit `fbc6078021a7821687170cb4f693fa6ad1e64679`:

- 31 arquivos JavaScript verificados sintaticamente.
- 7 arquivos Python verificados sintaticamente.
- JavaScript: 9 aprovados, 0 falhas.
- Python: 69 testes aprovados.
- Workflow: [JARVES CI](https://github.com/pedromimiguel407-commits/jarves.atulisa/actions/runs/41552993667).

## Builds

- **Android:** APK debug compilado e enviado como artefato no commit `d8bf7c92e7b95c4067b463d2912c67b990ac123d`. [Workflow e artefato](https://github.com/pedromimiguel407-commits/jarves.atulisa/actions/runs/41552752942).
- **Linux:** AppImage compilado e enviado como artefato no mesmo commit. [Workflow e artefato](https://github.com/pedromimiguel407-commits/jarves.atulisa/actions/runs/41552752758).
- **Windows:** um build anterior do instalador NSIS concluiu com sucesso e enviou artefato. A recompilação da branch atual, que inclui o último endurecimento da navegação Electron, está em execução: [Workflow atual](https://github.com/pedromimiguel407-commits/jarves.atulisa/actions/runs/41552993881).

Os builds são artefatos de CI, não foram instalados e testados em dispositivos físicos. O APK produzido é de debug, não assinado para publicação na Play Store.

## Limitações restantes

- A geração raster real depende de um serviço Stable Diffusion WebUI/Forge instalado e iniciado pelo usuário. A integração foi testada com provedor simulado nos testes automatizados; uma geração com modelo real não foi executada neste CI.
- ComfyUI não está integrado nesta versão.
- O APK é cliente WebView e precisa de um backend acessível; Ollama e modelos continuam no computador/servidor.
- O `LogicEngine` atual é heurístico e determinístico. O modo de pesquisa usa fontes consultadas pelo backend, mas não pesquisa automaticamente em toda solicitação.
- Não há executor autônomo de comandos arbitrários. Ações externas ou destrutivas continuam exigindo confirmação e uma implementação de permissões/sandbox própria.
- Windows, Linux e Android foram compilados em CI; não houve teste manual de interface em cada sistema.
- Modelos locais consomem armazenamento, RAM e CPU/GPU; serviços remotos opcionais podem ter custos. Não existe promessa de custo zero universal.

## Dados existentes

O arquivo `data/jarves.db` já estava versionado na base. Ele foi deixado intocado por poder conter dados do usuário. O novo `.gitignore` evita adicionar novos bancos e dados gerados, mas não remove arquivos já rastreados nem limpa o histórico Git. Recomenda-se avaliar esse arquivo separadamente, com backup e autorização antes de removê-lo do repositório público.

## Estado final

- Alterações mantidas na branch de trabalho.
- `main` permanece no commit original.
- Nenhuma Release publicada.
- Nenhum APK/EXE/AppImage foi anexado a GitHub Releases.
- Merge não executado.
