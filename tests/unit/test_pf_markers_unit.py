import re
from pathlib import Path
import pytest

@pytest.mark.unit
def test_pf_markers_cover_all_ids():
    root = Path(__file__).resolve().parents[2]
    pf = root / 'specs/grouped/PF.a2a-spec.yml'
    txt = pf.read_text(encoding='utf-8')
    ids = [m.group(1) for m in re.finditer(r'^\s*-\s*id:\s*([A-Z0-9\-_.]+)', txt, flags=re.M)]
    marker_file = root / 'agent_data' / 'pf_marker_comments.py'
    mt = marker_file.read_text(encoding='utf-8')
    missing = [i for i in ids if f'@req:{i}' not in mt]
    assert not missing, f"Missing markers for IDs: {missing}"
