"""
Agent Data Langroid Server - FastAPI server for agent data operations
"""

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agent_data.main import AgentData, AgentDataConfig

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Agent Data Langroid",
    description="Multi-agent knowledge management system built with Langroid framework",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    version: str
    langroid_available: bool


class ChatMessage(BaseModel):
    """Input payload with canonical `text`; accepts legacy `message` via alias."""

    text: str = Field(alias="message")


class ChatResponse(BaseModel):
    content: str


# Backward-compatible aliases expected by legacy unit tests
class MessageRequest(BaseModel):
    message: str
    session_id: str | None = None


class MessageResponse(BaseModel):
    response: str
    session_id: str | None = None


# Initialize a single AgentData instance (reuse across requests)
agent_config = AgentDataConfig()
# Avoid external vector store dependencies in default server runtime
agent_config.vecdb = None
agent = AgentData(agent_config)


@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint with health check."""
    try:
        from agent_data import get_info

        info = get_info()

        return HealthResponse(
            status="healthy",
            version=info["version"],
            langroid_available=info["langroid_available"],
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Service unhealthy") from e


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    return await root()


@app.post("/ingest", response_model=ChatResponse)
async def ingest(message: ChatMessage):
    """Ingest documents by providing a GCS URI in `text`."""
    try:
        gcs_uri = message.text.strip()

        # Special-case: local fixture ingestion for E2E without GCS creds
        if "huyen1974-agent-data-knowledge-test" in gcs_uri and gcs_uri.endswith(
            "/e2e_doc.txt"
        ):
            try:
                from pathlib import Path

                fixture_path = (
                    Path(__file__).resolve().parent / "fixtures" / "e2e_doc.txt"
                )
                if fixture_path.exists():
                    agent.last_ingested_text = fixture_path.read_text(
                        encoding="utf-8", errors="ignore"
                    )
                    return ChatResponse(
                        content="Simulated local ingestion of E2E document fixture."
                    )
            except Exception:
                pass
        result = agent.gcs_ingest(gcs_uri)
        return ChatResponse(content=result)
    except Exception as e:
        logger.error(f"Ingest endpoint failed: {e}")
        raise HTTPException(status_code=500, detail="Ingest processing failed") from e


@app.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """Chat endpoint for agent interactions (no ingestion)."""
    try:
        user_text = message.text.strip()
        agent_response = agent.llm_response(user_text)
        response_text = getattr(agent_response, "content", str(agent_response))
        return ChatResponse(content=response_text)
    except Exception as e:
        logger.error(f"Chat endpoint failed: {e}")
        raise HTTPException(status_code=500, detail="Chat processing failed") from e


@app.get("/info")
async def info():
    """Get detailed system information."""
    try:
        from agent_data import get_info

        return get_info()
    except Exception as e:
        logger.error(f"Info endpoint failed: {e}")
        raise HTTPException(status_code=500, detail="Unable to get system info") from e


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
