import unittest

from backend.app.logic_engine import LogicEngine


class LogicEngineTests(unittest.TestCase):
    def test_explicit_numbered_steps_are_preserved(self) -> None:
        result = LogicEngine.analyze(
            "1. Criar uma API.\n2. Adicionar testes.\n3. Documentar limitações.",
        )

        self.assertEqual(result["intent"]["selected"], "coding")
        self.assertEqual(
            [task["task"] for task in result["plan"]],
            ["Criar uma API.", "Adicionar testes.", "Documentar limitações."],
        )
        self.assertTrue(all(task["source"] == "explicit_in_request" for task in result["plan"]))

    def test_plan_mode_overrides_keyword_candidate(self) -> None:
        result = LogicEngine.analyze("Corrigir este bug.", task_mode="plan")

        self.assertEqual(result["intent"]["candidate"], "debugging")
        self.assertEqual(result["intent"]["selected"], "planning")
        self.assertEqual(result["plan"][0]["source"], "generic_template")

    def test_intent_scores_are_lexical_and_no_facts_are_invented(self) -> None:
        result = LogicEngine.analyze("Investigue este erro no Python.")

        self.assertEqual(result["intent"]["selected"], "debugging")
        self.assertGreater(result["intent"]["keyword_scores"]["debugging"], 0)
        self.assertEqual(result["confirmed_facts"], [])
        self.assertTrue(result["hypotheses"])
        self.assertIn("heurística", result["hypotheses"][0]["confidence"])

    def test_missing_debugging_evidence_is_reported(self) -> None:
        result = LogicEngine.analyze("Corrija meu programa.")

        self.assertIn(
            "Logs, mensagem de erro e passos para reproduzir não foram fornecidos.",
            result["missing_information"],
        )

    def test_language_is_requested_when_coding_request_omits_it(self) -> None:
        result = LogicEngine.analyze("Implemente uma função para ordenar nomes.")

        self.assertIn(
            "Linguagem ou ambiente de execução não foi especificado.",
            result["missing_information"],
        )

    def test_irreversible_actions_are_flagged_for_confirmation(self) -> None:
        result = LogicEngine.analyze("Apague os arquivos antigos.")

        self.assertTrue(result["decision"]["action_requires_confirmation"])
        self.assertEqual(result["decision"]["execution_status"], "not_executed")

    def test_unstructured_planning_request_gets_explicitly_generic_steps(self) -> None:
        result = LogicEngine.analyze("Ajude a planejar um aplicativo.", task_mode="plan")

        self.assertEqual(len(result["plan"]), 4)
        self.assertTrue(all(task["source"] == "generic_template" for task in result["plan"]))
        self.assertEqual(
            [task["depends_on"] for task in result["plan"]],
            [[], [], [], []],
        )

    def test_prompt_context_labels_analysis_as_revisable(self) -> None:
        context = LogicEngine.prompt_context(LogicEngine.analyze("Criar código.", "plan"))

        self.assertIn("hipótese revisável", context)
        self.assertIn("não como prova", context)
        self.assertIn("Etapas sugeridas", context)

    def test_explicit_math_expression_is_calculated_with_safe_parser(self) -> None:
        result = LogicEngine.analyze("Calcule (2 + 3) * 4 e crie um plano de teste.")

        self.assertEqual(
            result["calculation"],
            {"status": "calculated", "expression": "(2 + 3) * 4", "result": 20},
        )

    def test_explicit_unsupported_calculation_is_reported(self) -> None:
        result = LogicEngine.analyze("Calcule __import__('os').system('id')")

        self.assertEqual(result["calculation"]["status"], "invalid_or_unsupported")

    def test_unsupported_math_expression_is_not_executed(self) -> None:
        result = LogicEngine.analyze("__import__('os').system('id')")

        self.assertEqual(result["calculation"]["status"], "not_requested")

    def test_division_by_zero_is_reported_as_unsupported(self) -> None:
        result = LogicEngine.analyze("Calcule 4 / 0")

        self.assertEqual(result["calculation"]["status"], "invalid_or_unsupported")

    def test_excessively_nested_calculation_is_rejected(self) -> None:
        result = LogicEngine.analyze(f"Calcule {'-' * 40}1")

        self.assertEqual(result["calculation"]["status"], "invalid_or_unsupported")

    def test_overlong_calculation_is_rejected_before_parsing(self) -> None:
        result = LogicEngine.analyze(f"Calcule {'1 + ' * 30}1")

        self.assertEqual(result["calculation"]["status"], "invalid_or_unsupported")


if __name__ == "__main__":
    unittest.main()
