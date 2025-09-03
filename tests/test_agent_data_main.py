import pytest

from agent_data.main import AgentData, AgentDataConfig


@pytest.mark.unit
def test_agent_data_instantiation():
    """Basic instantiation test for AgentData core class.

    Ensures that an AgentData instance can be created from a default
    AgentDataConfig, and the resulting object is an instance of AgentData.
    """

    cfg = AgentDataConfig()
    # Avoid external dependencies during unit test
    # by disabling vector store initialization
    cfg.vecdb = None
    agent = AgentData(cfg)
    assert isinstance(agent, AgentData)


@pytest.mark.unit
def test_agent_data_config_handling():
    """Ensure AgentData preserves provided config attributes.

    We mock key config attributes to avoid external dependencies and
    verify they are retained on the instantiated AgentData.
    """

    cfg = AgentDataConfig()
    # Avoid external services in unit tests
    setattr(cfg, "vecdb", None)
    setattr(cfg, "llm", None)

    agent = AgentData(cfg)

    assert agent.config is cfg
    assert getattr(agent.config, "vecdb", "__missing__") is None
    assert getattr(agent.config, "llm", "__missing__") is None
