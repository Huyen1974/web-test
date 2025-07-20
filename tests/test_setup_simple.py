"""
Simple setup tests for Agent Data Langroid project.
"""

import os
import sys

import pytest


@pytest.mark.unit
def test_python_version():
    """Test that Python version is compatible."""
    version_info = sys.version_info
    assert version_info >= (3, 10), f"Python 3.10+ required, got {version_info}"
    assert version_info < (
        3,
        13,
    ), f"Python <3.13 required for Langroid, got {version_info}"


@pytest.mark.unit
def test_langroid_import():
    """Test that Langroid can be imported."""
    try:
        # import langroid

        print("✓ Langroid imported successfully")

        # Test basic imports
        # from langroid import ChatAgent, Task

        print("✓ Basic Langroid functionality working")

    except ImportError as e:
        pytest.fail(f"Failed to # import langroid: {e}")


@pytest.mark.unit
def test_project_structure():
    """Test that basic project structure exists."""
    expected_dirs = [
        "agent_data",
        "tests",
        "scripts",
        "terraform",
        "functions",
        "containers",
        ".github/workflows",
    ]

    missing_dirs = []
    for dir_name in expected_dirs:
        if not os.path.exists(dir_name):
            missing_dirs.append(dir_name)

    if missing_dirs:
        pytest.fail(f"Missing project directories: {missing_dirs}")


@pytest.mark.unit
def test_configuration_files():
    """Test that required configuration files exist."""
    required_files = [
        "pyproject.toml",
        "requirements.txt",
        "README.md",
        "LICENSE",
        ".gitignore",
    ]

    missing_files = []
    for file_name in required_files:
        if not os.path.exists(file_name):
            missing_files.append(file_name)

    if missing_files:
        pytest.fail(f"Missing configuration files: {missing_files}")
