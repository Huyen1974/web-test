from pathlib import Path

import pytest

from tools.speclint import load_canonical, parse_doc_ref


@pytest.mark.unit
def test_parse_doc_ref_width_and_format():
    p, s, e = parse_doc_ref("MD:docs/agent-a2a-constitution-v5.md#L10-L20")
    assert str(p).endswith("docs/agent-a2a-constitution-v5.md")
    assert s == 10 and e == 20
    p2, s2, e2 = parse_doc_ref("MD:docs/agent-a2a-constitution-v5.md#L42")
    assert s2 == e2 == 42


@pytest.mark.unit
def test_load_canonical_collects_ids(tmp_path: Path):
    data = {
        "items": [
            {"cid": "ENV.version"},
            {"cid": "ENV.request_id"},
        ]
    }
    path = tmp_path / "canonical_index.json"
    import json

    path.write_text(json.dumps(data), encoding="utf-8")
    out = load_canonical(path)
    assert out.get("_ids") == {"ENV.version", "ENV.request_id"}
