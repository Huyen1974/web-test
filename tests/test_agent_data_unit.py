"""
Unit tests for agent_data package functionality.
"""

import os
import sys
from unittest.mock import Mock, patch

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
        assert hasattr(main, "params")

        # Check commands are click commands
        assert hasattr(serve, "params")
        assert hasattr(info, "params")
        assert hasattr(test, "params")


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


@pytest.mark.unit
class TestQdrantManagement:
    """Test Qdrant management functionality."""

    @patch("functions.manage_qdrant.main.requests.request")
    @patch("functions.manage_qdrant.main.os.getenv")
    def test_get_cluster_status_success(self, mock_getenv, mock_request):
        """Test successful cluster status retrieval with list-clusters API."""
        # Mock environment variables
        env_vars = {
            "PROJECT_ID": "github-chatgpt-ggcloud",
            "QDRANT_ACCOUNT_ID": "b7093834-20e9-4206-8ea0-025b6994b319",
            "QDRANT_CLUSTER_ID": "529a17a6-01b8-4304-bc5c-b936aec8fca9",
            "AUTO_STOP_MINUTES": "60",
            "QDRANT_MGMT_KEY": "test-mgmt-key-12345",
            "QDRANT_API_BASE": "https://cloud.qdrant.io/api/v1",
            "QDRANT_AUTH_HEADER": "api-key",
        }
        mock_getenv.side_effect = lambda key, default=None: env_vars.get(key, default)

        # Mock successful list-clusters response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "clusters": [
                {
                    "id": "529a17a6-01b8-4304-bc5c-b936aec8fca9",
                    "phase": "HEALTHY",
                    "endpoint": "https://test-cluster.cloud.qdrant.io",
                },
                {
                    "id": "other-cluster-id",
                    "phase": "SUSPENDED",
                    "endpoint": "https://other-cluster.cloud.qdrant.io",
                },
            ]
        }
        mock_request.return_value = mock_response

        # Mock Flask request
        mock_flask_request = Mock()
        mock_flask_request.args.get.return_value = "status"

        # Import and test the handle function
        sys.path.append(os.path.join(project_root, "functions", "manage_qdrant"))
        from functions.manage_qdrant.main import handle

        result = handle(mock_flask_request)

        # Verify the result
        assert result["status"] == "ok"
        assert result["cluster"]["id"] == "529a17a6-01b8-4304-bc5c-b936aec8fca9"
        assert result["cluster"]["phase"] == "HEALTHY"
        assert result["cluster"]["endpoint"] == "https://test-cluster.cloud.qdrant.io"

        # Verify the API call was made correctly
        mock_request.assert_called_once()
        call_args = mock_request.call_args
        assert call_args[1]["method"] == "GET"
        assert (
            "accounts/b7093834-20e9-4206-8ea0-025b6994b319/clusters"
            in call_args[1]["url"]
        )
        assert call_args[1]["headers"]["api-key"] == "test-mgmt-key-12345"

    @patch("functions.manage_qdrant.main.requests.request")
    @patch("functions.manage_qdrant.main.os.getenv")
    def test_suspend_cluster_success(self, mock_getenv, mock_request):
        """Test successful cluster suspension."""
        # Mock environment variables
        env_vars = {
            "PROJECT_ID": "github-chatgpt-ggcloud",
            "QDRANT_ACCOUNT_ID": "b7093834-20e9-4206-8ea0-025b6994b319",
            "QDRANT_CLUSTER_ID": "529a17a6-01b8-4304-bc5c-b936aec8fca9",
            "AUTO_STOP_MINUTES": "60",
            "QDRANT_MGMT_KEY": "test-mgmt-key-12345",
            "QDRANT_API_BASE": "https://cloud.qdrant.io/api/v1",
            "QDRANT_AUTH_HEADER": "api-key",
        }
        mock_getenv.side_effect = lambda key, default=None: env_vars.get(key, default)

        # Mock successful suspend response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"task_id": "suspend-task-123"}
        mock_request.return_value = mock_response

        # Mock Flask request
        mock_flask_request = Mock()
        mock_flask_request.args.get.return_value = "suspend"

        # Import and test the handle function
        sys.path.append(os.path.join(project_root, "functions", "manage_qdrant"))
        from functions.manage_qdrant.main import handle

        result = handle(mock_flask_request)

        # Verify the result
        assert result["status"] == "ok"
        assert result["action"] == "suspend"
        assert result["result"]["task_id"] == "suspend-task-123"

    @patch("functions.manage_qdrant.main.requests.post")
    @patch("functions.manage_qdrant.main.requests.get")
    @patch("functions.manage_qdrant.main.os.getenv")
    def test_secret_manager_update_success(self, mock_getenv, mock_get, mock_post):
        """Test successful Secret Manager update with version logging."""
        # Mock environment variables
        env_vars = {
            "PROJECT_ID": "github-chatgpt-ggcloud",
        }
        mock_getenv.side_effect = lambda key, default=None: env_vars.get(key, default)

        # Mock metadata server token response
        mock_token_response = Mock()
        mock_token_response.status_code = 200
        mock_token_response.json.return_value = {"access_token": "test-access-token"}
        mock_token_response.raise_for_status = Mock()
        mock_get.return_value = mock_token_response

        # Mock Secret Manager addVersion response
        mock_secret_response = Mock()
        mock_secret_response.status_code = 200
        mock_secret_response.json.return_value = {
            "name": "projects/github-chatgpt-ggcloud/secrets/qdrant_idle_marker/versions/42"
        }
        mock_post.return_value = mock_secret_response

        # Import and test the update_secret_manager function
        sys.path.append(os.path.join(project_root, "functions", "manage_qdrant"))
        from functions.manage_qdrant.main import update_secret_manager

        result = update_secret_manager("qdrant_idle_marker", "1234567890")

        # Verify the result
        assert result is True

        # Verify Secret Manager API call
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        # Check positional arguments (URL) and keyword arguments (headers)
        assert "secrets/qdrant_idle_marker:addVersion" in call_args[0][0]
        assert call_args[1]["headers"]["Authorization"] == "Bearer test-access-token"

    @patch("functions.manage_qdrant.main.requests.request")
    @patch("functions.manage_qdrant.main.os.getenv")
    def test_dynamic_auth_header_configuration(self, mock_getenv, mock_request):
        """Test dynamic authentication header configuration."""
        # Test with Authorization header
        env_vars = {
            "PROJECT_ID": "github-chatgpt-ggcloud",
            "QDRANT_ACCOUNT_ID": "b7093834-20e9-4206-8ea0-025b6994b319",
            "QDRANT_CLUSTER_ID": "529a17a6-01b8-4304-bc5c-b936aec8fca9",
            "AUTO_STOP_MINUTES": "60",
            "QDRANT_MGMT_KEY": "test-mgmt-key-12345",
            "QDRANT_API_BASE": "https://api.cloud.qdrant.io/pa/v1",
            "QDRANT_AUTH_HEADER": "Authorization",
        }
        mock_getenv.side_effect = lambda key, default=None: env_vars.get(key, default)

        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "clusters": [
                {
                    "id": "529a17a6-01b8-4304-bc5c-b936aec8fca9",
                    "phase": "HEALTHY",
                    "endpoint": "https://test-cluster.cloud.qdrant.io",
                }
            ]
        }
        mock_request.return_value = mock_response

        # Mock Flask request
        mock_flask_request = Mock()
        mock_flask_request.args.get.return_value = "status"

        # Import and test the handle function
        sys.path.append(os.path.join(project_root, "functions", "manage_qdrant"))
        from functions.manage_qdrant.main import handle

        handle(mock_flask_request)

        # Verify the Authorization header format
        mock_request.assert_called_once()
        call_args = mock_request.call_args
        assert call_args[1]["headers"]["Authorization"] == "apikey test-mgmt-key-12345"
        assert call_args[1]["url"].startswith("https://api.cloud.qdrant.io/pa/v1")

    def test_import_manage_qdrant_module(self):
        """Test that manage_qdrant module can be imported."""
        sys.path.append(os.path.join(project_root, "functions", "manage_qdrant"))

        try:
            from functions.manage_qdrant import main

            assert hasattr(main, "handle")
            assert hasattr(main, "update_secret_manager")
            assert callable(main.handle)
            assert callable(main.update_secret_manager)
        except ImportError as e:
            pytest.fail(f"Failed to import manage_qdrant module: {e}")
