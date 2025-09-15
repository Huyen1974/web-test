import textwrap
from pathlib import Path

import pytest

from tools.extract_canonical_index import extract


@pytest.mark.unit
def test_extractor_parses_env_fields(tmp_path: Path):
    md = tmp_path / "constitution.md"
    md.write_text(
        textwrap.dedent(
            """
            ## Message Envelope v2.2 - BẮT BUỘC

            JSON
            {
              "version": "1.0",
              "request_id": "<uuid>",
              "principal": {"sub": "sa", "roles": ["agent"]},
              "action": "x.y",
              "timestamp": "<RFC3339>"
            }
            """
        ).strip(),
        encoding="utf-8",
    )
    payload = extract(md)
    ids = {it["cid"] for it in payload["items"]}
    # Basic ENV coverage
    assert "ENV.version" in ids
    assert "ENV.request_id" in ids
    assert "ENV.action" in ids
    assert any(
        "BẮT BUỘC" in str(it.get("text", "")) for it in payload["normative_lines"]
    )  # normative detection (VI)
