import unittest

from backend.app.ai_core import MemoryEngine, build_messages


class MemoryEngineTests(unittest.TestCase):
    def test_retrieval_ranks_relevant_notes_and_limits_context(self) -> None:
        memories = [
            {"label": "Idioma", "content": "Responder em português."},
            {"label": "Projeto", "content": "O projeto MINE usa Ollama local."},
            {"label": "Tema", "content": "A cor do projeto é violeta."},
            {"label": "Outro", "content": "Gosto de trilhas."},
        ]
        results = MemoryEngine.retrieve(memories, "Qual a cor do projeto MINE?")
        self.assertEqual([item["label"] for item in results], ["Projeto", "Tema"])
        self.assertLessEqual(
            sum(len(item["content"]) for item in results),
            MemoryEngine.MAX_CONTEXT_CHARS,
        )

    def test_context_marks_saved_memory_as_data_not_instructions(self) -> None:
        context = MemoryEngine.context_message([
            {"label": "Preferência", "content": "- Preferência: responder em português."},
        ])
        self.assertIn("não confiáveis", context)
        self.assertIn("<memorias>", context)

    def test_build_messages_preserves_system_and_short_term_history_order(self) -> None:
        messages = build_messages(
            [{"role": "system", "content": "Responda com clareza."}],
            [{"role": "user", "content": "Pergunta anterior"}, {"role": "assistant", "content": "Resposta anterior"}],
            "Pergunta atual",
            "Memória segura",
        )
        self.assertEqual(
            [message["role"] for message in messages],
            ["system", "system", "user", "assistant", "user"],
        )
        self.assertEqual(messages[-1]["content"], "Pergunta atual")


if __name__ == "__main__":
    unittest.main()
