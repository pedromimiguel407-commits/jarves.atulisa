from __future__ import annotations

import ast
import math
import operator
import re
from collections.abc import Mapping
from typing import Any


class LogicEngine:
    """Bounded, deterministic request analysis; not a substitute for an LLM."""

    VERSION = "1.0"
    MAX_TASKS = 12
    INTENT_PATTERNS = {
        "debugging": (
            r"\b(?:bug|erro|falha|problema|corrig\w*|corrij\w*|depurar|debug)\b",
            r"\b(?:quebrou|não funciona|nao funciona|travando)\b",
        ),
        "coding": (
            r"\b(?:código|codigo|programar|implementar|função|funcao|script|classe)\b",
            r"\b(?:python|javascript|typescript|html|css|java|kotlin|c\+\+?)\b",
            r"\b(?:api|testes?)\b",
        ),
        "planning": (
            r"\b(?:planejar|planejamento|plano|etapas|passos|organizar)\b",
            r"\b(?:cronograma|prioridade|dependência|dependencia)\b",
        ),
        "research": (
            r"\b(?:pesquisar|pesquisa|fontes|referências|referencias|investigar)\b",
            r"\b(?:compare|comparar|evidências|evidencias)\b",
        ),
        "creation": (
            r"\b(?:criar|crie|gerar|gere|escrever|escreva|produzir|produza)\b",
            r"\b(?:projeto|história|historia|imagem|animação|animacao)\b",
        ),
    }
    SPLIT_PATTERN = re.compile(r"(?:\r?\n+|(?<!\d)(?<=[.!?;])\s+)")
    LIST_PREFIX = re.compile(r"^\s*(?:(?:[-*•])\s+|(?:\d{1,2}[.)])\s+)")
    ACTION_WORDS = re.compile(
        r"\b(?:apag\w*|delet\w*|exclu\w*|remov\w*|sobrescrev\w*|public\w*|"
        r"envi\w*|deploy|reset\w*|format\w*|instal\w*|compr\w*|pag\w*)\b",
        re.IGNORECASE,
    )
    MATH_PREFIX = re.compile(r"^(?:(?:calcule|calcular|quanto é|quanto e|resultado de)\s*)", re.IGNORECASE)
    MATH_CHARACTERS = re.compile(r"^[\d\s.+\-*/()%]+$")
    BINARY_OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
    }

    @classmethod
    def analyze(cls, text: str, task_mode: str = "chat") -> dict[str, Any]:
        request = text.strip()
        folded = request.casefold()
        matches = {
            intent: [pattern for pattern in patterns if re.search(pattern, folded)]
            for intent, patterns in cls.INTENT_PATTERNS.items()
        }
        scores = {intent: len(patterns) for intent, patterns in matches.items()}
        candidate = max(scores, key=scores.get) if any(scores.values()) else None
        if task_mode == "plan":
            intent = "planning"
        elif task_mode == "bug":
            intent = "debugging"
        else:
            intent = candidate or ("question" if "?" in request else "general")

        explicit_tasks = cls._extract_tasks(request)
        tasks = explicit_tasks or cls._suggest_tasks(intent)
        action_requires_confirmation = bool(cls.ACTION_WORDS.search(request))
        math_result = cls._calculate(request)
        missing_information: list[str] = []
        if intent == "coding" and not re.search(
            r"\b(?:python|javascript|typescript|html|css|java|kotlin|c\+\+?|rust|go)\b",
            folded,
        ):
            missing_information.append("Linguagem ou ambiente de execução não foi especificado.")
        if intent == "debugging" and not any(
            marker in folded for marker in ("traceback", "stack trace", "log", "erro:", "http ")
        ):
            missing_information.append("Logs, mensagem de erro e passos para reproduzir não foram fornecidos.")
        if action_requires_confirmation:
            missing_information.append(
                "Confirme o escopo e as permissões antes de qualquer ação irreversível ou externa."
            )

        hypotheses = []
        if candidate:
            matched_phrases = [pattern.removeprefix(r"\b(?:").split(")")[0] for pattern in matches[candidate]]
            if task_mode in {"plan", "bug"}:
                basis = f"Modo de tarefa selecionado: {task_mode}; candidato lexical: {candidate}."
            else:
                basis = "Correspondência de palavras-chave no pedido: " + "; ".join(matched_phrases)
            hypotheses.append({
                "claim": f"A intenção provável é {intent}.",
                "basis": basis,
                "confidence": "heurística; não é probabilidade calibrada",
            })

        return {
            "engine": "LOGIC ENGINE MAX",
            "version": cls.VERSION,
            "method": "determinístico: padrões lexicais e estrutura explícita do texto",
            "limitations": [
                "Não executa ferramentas ou testes nem valida fatos externos.",
                "A intenção e o plano são inferências heurísticas que precisam de revisão.",
            ],
            "request": request,
            "intent": {
                "selected": intent,
                "candidate": candidate,
                "keyword_scores": scores,
            },
            "objective": request,
            "observations": ["O texto da solicitação foi recebido."],
            "confirmed_facts": [],
            "hypotheses": hypotheses,
            "unknowns": [
                "Requisitos, ambiente e estado do projeto não fornecidos no pedido atual."
            ],
            "missing_information": missing_information,
            "plan": tasks,
            "calculation": math_result,
            "decision": {
                "action_requires_confirmation": action_requires_confirmation,
                "execution_status": "not_executed",
            },
        }

    @classmethod
    def prompt_context(cls, analysis: Mapping[str, Any]) -> str:
        plan = analysis.get("plan", [])
        steps = "\n".join(
            f"{item['index']}. {item['task']}"
            for item in plan
            if isinstance(item, dict) and isinstance(item.get("task"), str)
        )
        return (
            "Use esta estrutura preliminar do LOGIC ENGINE como hipótese revisável, "
            "não como prova nem como informação confirmada. Diferencie o que foi "
            "fornecido pelo usuário, o que você inferiu e o que ainda é desconhecido. "
            "Não diga que executou ferramentas ou verificou fatos sem evidência.\n"
            f"Intenção heurística: {analysis['intent']['selected']}.\n"
            f"Etapas sugeridas:\n{steps or 'Responda diretamente ao pedido.'}"
        )

    @classmethod
    def _extract_tasks(cls, request: str) -> list[dict[str, Any]]:
        lines = [line for line in request.splitlines() if line.strip()]
        structured = len(lines) > 1 or any(cls.LIST_PREFIX.match(line) for line in lines)
        if not structured:
            structured = len(cls.SPLIT_PATTERN.split(request)) > 1
        if not structured:
            return []

        candidates = []
        for line in lines or [request]:
            for raw in cls.SPLIT_PATTERN.split(line):
                item = cls.LIST_PREFIX.sub("", raw).strip(" \t-*•")
                if len(item) >= 3:
                    candidates.append(item)
        unique: list[str] = []
        seen: set[str] = set()
        for item in candidates:
            key = item.casefold()
            if key not in seen:
                unique.append(item)
                seen.add(key)
            if len(unique) >= cls.MAX_TASKS:
                break
        return [
            {"index": index, "task": task, "source": "explicit_in_request", "depends_on": []}
            for index, task in enumerate(unique, start=1)
        ]

    @classmethod
    def _suggest_tasks(cls, intent: str) -> list[dict[str, Any]]:
        if intent == "planning":
            labels = (
                "Definir objetivo e critérios de conclusão.",
                "Dividir o trabalho em etapas e identificar dependências.",
                "Executar apenas as etapas autorizadas.",
                "Verificar resultados e registrar pendências.",
            )
        elif intent == "coding":
            labels = (
                "Confirmar linguagem, escopo e critérios de aceitação.",
                "Inspecionar os arquivos e dependências relevantes.",
                "Implementar uma alteração focada no objetivo.",
                "Executar testes direcionados e relatar limitações.",
            )
        elif intent == "debugging":
            labels = (
                "Obter erro observável e passos para reproduzi-lo.",
                "Localizar o caminho de execução relacionado.",
                "Corrigir a causa confirmada sem alterar áreas alheias.",
                "Reexecutar o teste de regressão e registrar o resultado.",
            )
        elif intent == "research":
            labels = (
                "Definir a pergunta e o escopo da pesquisa.",
                "Consultar fontes identificáveis e adequadas ao tema.",
                "Separar evidências, inferências e informações não confirmadas.",
                "Apresentar referências e limitações.",
            )
        else:
            labels = ("Esclarecer o resultado esperado e responder ao pedido.",)
        return [
            {"index": index, "task": task, "source": "generic_template", "depends_on": []}
            for index, task in enumerate(labels, start=1)
        ]

    @classmethod
    def _calculate(cls, request: str) -> dict[str, Any]:
        source = request.strip()
        explicit_calculation = bool(cls.MATH_PREFIX.match(source))
        expression = cls.MATH_PREFIX.sub("", source)
        if explicit_calculation:
            expression = re.split(r"\s+\be\b\s+|[?;,\n]", expression, maxsplit=1, flags=re.IGNORECASE)[0]
        expression = expression.strip().rstrip(" ?=")
        if not expression:
            return {"status": "not_requested"}
        if not cls.MATH_CHARACTERS.fullmatch(expression):
            if explicit_calculation:
                return {"status": "invalid_or_unsupported", "expression": expression[:100]}
            return {"status": "not_requested"}
        if len(expression) > 100:
            return {"status": "invalid_or_unsupported", "expression": expression[:100]}
        try:
            tree = ast.parse(expression, mode="eval")
            if sum(1 for _ in ast.walk(tree)) > 100:
                raise ValueError("Expression is too complex.")
            result = cls._evaluate_node(tree.body)
        except (ArithmeticError, SyntaxError, ValueError, TypeError, OverflowError):
            return {
                "status": "invalid_or_unsupported",
                "expression": expression[:100],
            }
        if not math.isfinite(result):
            return {"status": "invalid_or_unsupported", "expression": expression[:100]}
        return {
            "status": "calculated",
            "expression": expression,
            "result": int(result) if result.is_integer() else result,
        }

    @classmethod
    def _evaluate_node(cls, node: ast.expr, depth: int = 0) -> float:
        if depth > 32:
            raise ValueError("Expression nesting exceeds supported depth.")
        if isinstance(node, ast.Constant) and type(node.value) in {int, float}:
            value = float(node.value)
            if not math.isfinite(value) or abs(value) > 1e100:
                raise ValueError("Numeric literal exceeds supported range.")
            return value
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            operand = cls._evaluate_node(node.operand, depth + 1)
            return operand if isinstance(node.op, ast.UAdd) else -operand
        if isinstance(node, ast.BinOp):
            left = cls._evaluate_node(node.left, depth + 1)
            right = cls._evaluate_node(node.right, depth + 1)
            if isinstance(node.op, ast.Pow):
                if abs(right) > 100 or abs(left) > 1e6:
                    raise ValueError("Exponentiation exceeds supported range.")
                result = operator.pow(left, right)
            else:
                operation = cls.BINARY_OPERATORS.get(type(node.op))
                if operation is None:
                    raise ValueError("Operator is not supported.")
                result = operation(left, right)
            if not math.isfinite(result) or abs(result) > 1e100:
                raise ValueError("Calculation result exceeds supported range.")
            return result
        raise ValueError("Expression contains an unsupported construct.")
