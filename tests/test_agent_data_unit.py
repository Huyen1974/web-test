"""
Unit tests for agent_data package functionality.
"""

import os
import sys

import pytest

# Add the project root to sys.path for reliable imports
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)


@pytest.mark.unit
class TestAgentDataCore:
    """Test core agent_data functionality."""

    def test_package_import(self):
        """Test that agent_data package can be imported."""
        import importlib

        import agent_data

        # Force reload to get fresh module
        importlib.reload(agent_data)

        assert hasattr(agent_data, "__version__")
        assert agent_data.__version__ == "0.1.0"

    def test_get_version(self):
        """Test get_version function."""
        import importlib

        import agent_data

        importlib.reload(agent_data)

        assert hasattr(agent_data, "get_version")
        assert agent_data.get_version() == "0.1.0"

    def test_check_dependencies(self):
        """Test dependency checking."""
        import importlib

        import agent_data

        importlib.reload(agent_data)

        assert hasattr(agent_data, "check_dependencies")
        deps = agent_data.check_dependencies()
        assert isinstance(deps, dict)
        assert "fastapi" in deps
        assert "pydantic" in deps

    def test_get_info(self):
        """Test get_info function."""
        import importlib

        import agent_data

        importlib.reload(agent_data)

        assert hasattr(agent_data, "get_info")
        info = agent_data.get_info()
        assert isinstance(info, dict)
        assert "version" in info
        assert "author" in info
        assert info["version"] == "0.1.0"


@pytest.mark.unit
class TestCLI:
    """Test CLI functionality."""

    def test_cli_import(self):
        """Test that CLI module can be imported."""
        from agent_data import cli

        assert hasattr(cli, "main")


@pytest.mark.unit
class TestServer:
    """Test server functionality."""

    def test_server_import(self):
        """Test that server module can be imported."""
        from agent_data import server

        assert hasattr(server, "app")

    def test_fastapi_app_creation(self):
        """Test FastAPI app is created properly."""
        from agent_data.server import app

        assert app is not None
        assert hasattr(app, "title")
        assert app.title == "Agent Data Langroid"


@pytest.mark.unit
class TestAgentDataExtended:
    """Extended tests to improve coverage."""

    def test_langroid_availability(self):
        """Test langroid availability detection."""
        import importlib

        import agent_data

        importlib.reload(agent_data)

        assert hasattr(agent_data, "LANGROID_AVAILABLE")
        assert hasattr(agent_data, "LANGROID_VERSION")
        assert isinstance(agent_data.LANGROID_AVAILABLE, bool)

    def test_check_dependencies_detailed(self):
        """Test dependency checking in detail."""
        import importlib

        import agent_data

        importlib.reload(agent_data)

        deps = agent_data.check_dependencies()

        # Check required dependencies are tracked
        required_deps = [
            "langroid",
            "fastapi",
            "uvicorn",
            "pydantic",
            "openai",
            "qdrant_client",
        ]
        for dep in required_deps:
            assert dep in deps
            assert isinstance(deps[dep], bool)

    def test_get_info_structure(self):
        """Test get_info returns proper structure."""
        import importlib

        import agent_data

        importlib.reload(agent_data)

        info = agent_data.get_info()

        # Check all required fields
        required_fields = [
            "name",
            "version",
            "author",
            "email",
            "langroid_available",
            "langroid_version",
            "dependencies",
        ]
        for field in required_fields:
            assert field in info

        assert info["name"] == "agent-data-langroid"
        assert info["version"] == "0.1.0"
        assert info["author"] == "Agent Data Team"


@pytest.mark.unit
class TestCLIExtended:
    """Extended CLI tests for better coverage."""

    def test_cli_commands_exist(self):
        """Test that CLI commands are properly defined."""
        from agent_data.cli import info, main, serve, test

        # Check commands are callable
        assert callable(main)
        assert callable(serve)
        assert callable(info)
        assert callable(test)

    def test_cli_click_decorators(self):
        """Test that commands have proper click decorators."""
        from agent_data.cli import info, main, serve, test

        # Check main is a click group
        assert hasattr(main, "__click_params__")

        # Check commands are click commands
        assert hasattr(serve, "__click_params__")
        assert hasattr(info, "__click_params__")
        assert hasattr(test, "__click_params__")


@pytest.mark.unit
class TestServerExtended:
    """Extended server tests for better coverage."""

    def test_fastapi_middleware(self):
        """Test that CORS middleware is configured."""
        from agent_data.server import app

        # Check middleware is configured
        assert len(app.user_middleware) > 0

        # Find CORS middleware
        cors_middleware = None
        for middleware in app.user_middleware:
            if "CORSMiddleware" in str(middleware.cls):
                cors_middleware = middleware
                break

        assert cors_middleware is not None

    def test_pydantic_models(self):
        """Test Pydantic models are properly defined."""
        from agent_data.server import HealthResponse, MessageRequest, MessageResponse

        # Test model instantiation
        health = HealthResponse(
            status="healthy", version="0.1.0", langroid_available=True
        )
        assert health.status == "healthy"

        request = MessageRequest(message="test", session_id="123")
        assert request.message == "test"

        response = MessageResponse(response="test", session_id="123")
        assert response.response == "test"

    def test_app_metadata(self):
        """Test FastAPI app metadata."""
        from agent_data.server import app

        assert app.title == "Agent Data Langroid"
        assert app.version == "0.1.0"
        assert "Multi-agent knowledge management" in app.description
