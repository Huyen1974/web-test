from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from tools.specrunner import main as specrunner


def _write_spec(dir_: Path, name: str, content: str) -> Path:
    path = dir_ / name
    path.write_text(content, encoding="utf-8")
    return path


@pytest.mark.unit
def test_duplicate_ids_fails(tmp_path: Path):
    # Arrange
    specs_dir = tmp_path / "specs"
    specs_dir.mkdir(parents=True)
    schema_path = Path("specs/a2a-spec.schema.json").resolve()
    assert schema_path.exists(), "Schema file must exist"

    acc = "tests/test_server.py"  # existing path in repo
    _write_spec(
        specs_dir,
        "a.a2a-spec.yml",
        f"""
id: REQ.DUP
title: Duplicate ID example A
doc_cite: DOC:ABC
acceptance:
  - {acc}
""".strip()
    )
    _write_spec(
        specs_dir,
        "b.a2a-spec.yml",
        f"""
id: REQ.DUP
title: Duplicate ID example B
doc_cite: DOC:ABC
acceptance:
  - {acc}
""".strip()
    )

    rtm_json = tmp_path / "rtm.json"
    orphans_csv = tmp_path / "orphans.csv"
    speclint_json = tmp_path / "speclint.json"

    # Act
    rc = specrunner.main(
        [
            "--specs-dir",
            str(specs_dir),
            "--schema",
            str(schema_path),
            "--rtm-json",
            str(rtm_json),
            "--orphans",
            str(orphans_csv),
            "--speclint",
            str(speclint_json),
        ]
    )

    # Assert
    assert rc != 0
    data = json.loads(speclint_json.read_text(encoding="utf-8"))
    dups = {sid for sid, _paths in data.get("duplicate_ids", [])}
    assert "REQ.DUP" in dups


@pytest.mark.unit
def test_invalid_doc_cite_fails(tmp_path: Path):
    specs_dir = tmp_path / "specs"
    specs_dir.mkdir(parents=True)
    schema_path = Path("specs/a2a-spec.schema.json").resolve()
    acc = "tests/test_server.py"

    _write_spec(
        specs_dir,
        "invalid_doc.a2a-spec.yml",
        f"""
id: REQ.DOC
title: Invalid doc cite
doc_cite: not_a_valid_cite
acceptance:
  - {acc}
""".strip()
    )

    speclint_json = tmp_path / "speclint.json"
    rc = specrunner.main(
        [
            "--specs-dir",
            str(specs_dir),
            "--schema",
            str(schema_path),
            "--speclint",
            str(speclint_json),
        ]
    )
    assert rc != 0
    data = json.loads(speclint_json.read_text(encoding="utf-8"))
    msgs = {msg for _p, msg in data.get("invalid_specs", [])}
    assert any("doc_cite does not match pattern" in m for m in msgs)


@pytest.mark.unit
def test_orphan_missing_doc_cite_fails(tmp_path: Path):
    specs_dir = tmp_path / "specs"
    specs_dir.mkdir(parents=True)
    schema_path = Path("specs/a2a-spec.schema.json").resolve()
    acc = "tests/test_server.py"

    _write_spec(
        specs_dir,
        "orphan.a2a-spec.yml",
        f"""
id: REQ.ORPH
title: Missing doc cite
acceptance:
  - {acc}
""".strip()
    )

    speclint_json = tmp_path / "speclint.json"
    rc = specrunner.main(
        [
            "--specs-dir",
            str(specs_dir),
            "--schema",
            str(schema_path),
            "--speclint",
            str(speclint_json),
        ]
    )
    assert rc != 0
    data = json.loads(speclint_json.read_text(encoding="utf-8"))
    ids = {sid for _p, sid, _reason in data.get("orphans", [])}
    assert "REQ.ORPH" in ids

