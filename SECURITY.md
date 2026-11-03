# Segurança — JARVES AI

## Arquitetura e limites

O backend ativo é FastAPI/Python. O aplicativo pode iniciar em loopback e atender a clientes na rede local quando configurado. O modo LAN usa HTTP e não criptografa o tráfego; não exponha a porta a redes públicas.

## Controles existentes

- Validação de payloads com Pydantic.
- Consultas SQLite parametrizadas.
- Limites para uploads e extração de documentos.
- Endpoints de API para clientes não locais exigem token Bearer quando `JARVES_ACCESS_TOKEN` está configurado.
- Segredos devem ficar em variáveis de ambiente ou em configuração local protegida.
- A geração de imagens só permite endpoint local ou IP privado explícito configurado no servidor.
- Arquivos enviados não são executados pelo JARVES.

## Recomendações

- Nunca faça commit de `.env`, tokens, chaves ou dados pessoais.
- Não coloque tokens em URLs ou parâmetros de consulta.
- Use firewall e rede Wi-Fi confiável ao habilitar `JARVES_HOST=0.0.0.0`.
- Faça backup do banco antes de atualizar ou executar migrações.
- Verifique a licença de cada modelo de IA antes de redistribuir modelos ou conteúdo gerado.
- Não trate uma conexão HTTP local como canal seguro para internet pública.

## Comunicação de vulnerabilidades

Abra uma issue privada ou use o mecanismo de reporte de vulnerabilidade do GitHub. Evite publicar detalhes exploráveis antes de uma correção estar disponível.
