from __future__ import annotations

import pytest
from click.testing import CliRunner

import agent_data as pkg
from agent_data import cli


@pytest.mark.unit
def test_cli_info_prints_metadata():
    runner = CliRunner()
    res = runner.invoke(cli.main, ["info"])
    assert res.exit_code == 0
    assert "Agent Data Langroid Information" in res.output
    assert "Langroid Available" in res.output


@pytest.mark.unit
def test_cli_test_command_success(monkeypatch):
    # Force dependencies to all True to avoid env differences
    monkeypatch.setattr(
        pkg, "check_dependencies", lambda: {"langroid": True, "fastapi": True}
    )
    runner = CliRunner()
    res = runner.invoke(cli.main, ["test"])
    assert res.exit_code == 0
    assert "All dependencies available" in res.output
