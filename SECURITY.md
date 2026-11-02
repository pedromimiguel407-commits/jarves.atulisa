# Segurança

## Reportar vulnerabilidades

Não publique detalhes de uma vulnerabilidade ainda não corrigida em uma issue
pública. Use o recurso **Report a vulnerability** do GitHub Security Advisories
quando este projeto tiver um repositório público. Até lá, contate os mantenedores
por um canal privado que eles tenham publicado.

## Uso seguro

- A API escuta somente em `127.0.0.1` por padrão.
- Clientes não locais precisam de `JARVES_ACCESS_TOKEN` e do header `Authorization: Bearer`.
- A API não fornece TLS/HTTPS. Não use o token por HTTP em rede pública ou não confiável.
- O histórico de conversa é salvo localmente em SQLite sem criptografia.
- Não envie segredos ou informações sensíveis aos modelos.
- Uploads aceitam apenas TXT/PDF, limitados a 5 MB e 100 páginas; só o texto extraído é guardado.
- Revise dependências e licenças antes de distribuir builds.
