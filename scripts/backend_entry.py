from __future__ import annotations

import os

import uvicorn

from backend.app.main import app


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=os.getenv("JARVES_HOST", "127.0.0.1"),
        port=int(os.getenv("JARVES_PORT", "8000")),
        log_level=os.getenv("JARVES_LOG_LEVEL", "info"),
    )
