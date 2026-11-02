from __future__ import annotations

import sqlite3
import urllib.error
from collections.abc import Callable
from typing import Any

from fastapi import HTTPException


def diagnose_services(
    database_check: Callable[[], str],
    ollama_check: Callable[[], list[dict[str, Any]]],
) -> dict[str, Any]:
    checks: list[dict[str, str]] = []

    try:
        integrity = database_check()
        if integrity == "ok":
            checks.append({
                "component": "database",
                "status": "ok",
                "message": "Banco de dados acessível e íntegro.",
                "action": "Nenhuma ação necessária.",
            })
        else:
            checks.append({
                "component": "database",
                "status": "error",
                "message": f"SQLite detectou problema de integridade: {integrity[:300]}",
                "action": "Faça uma cópia do banco antes de qualquer reparo.",
            })
    except (OSError, sqlite3.Error) as error:
        checks.append({
            "component": "database",
            "status": "error",
            "message": f"Não foi possível verificar o banco SQLite ({type(error).__name__}).",
            "action": (
                "O banco está ocupado; aguarde e tente novamente."
                if "locked" in str(error).lower() or "busy" in str(error).lower()
                else "Confira o caminho JARVES_DATABASE e as permissões do diretório."
            ),
        })

    try:
        models = ollama_check()
        checks.append({
            "component": "ollama",
            "status": "ok" if models else "warning",
            "message": (
                f"Ollama acessível; {len(models)} modelo(s) instalado(s)."
                if models
                else "Ollama acessível, mas nenhum modelo está instalado."
            ),
            "action": (
                "Nenhuma ação necessária."
                if models
                else "Baixe um modelo no Ollama antes de iniciar uma conversa."
            ),
        })
    except (HTTPException, OSError, TimeoutError, urllib.error.URLError, ValueError) as error:
        checks.append({
            "component": "ollama",
            "status": "error",
            "message": (
                f"Ollama indisponível ou resposta inválida (HTTP {error.status_code})."
                if isinstance(error, HTTPException)
                else f"Ollama indisponível ou resposta inválida ({type(error).__name__})."
            ),
            "action": "Confira JARVES_OLLAMA_URL e se o serviço Ollama está em execução.",
        })

    checks.append({
        "component": "api",
        "status": "ok",
        "message": "A API JARVES respondeu ao diagnóstico.",
        "action": "Nenhuma ação necessária.",
    })
    overall = "error" if any(item["status"] == "error" for item in checks) else (
        "warning" if any(item["status"] == "warning" for item in checks) else "ok"
    )
    return {"status": overall, "checks": checks}
