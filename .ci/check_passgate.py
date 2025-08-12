#!/usr/bin/env python3
import sys

import yaml


def check_passgate():
    p = ".github/workflows/pass-gate.yml"
    d = yaml.safe_load(open(p, encoding="utf-8")) or {}
    jobs = d.get("jobs") or {}
    has_always = False
    gate_names = []

    for k, v in jobs.items():
        if isinstance(v, dict):
            if str(v.get("if", "")).strip() == "${{ always() }}":
                has_always = True
                gate_names.append(v.get("name", k))

    if not has_always:
        print("❌ pass-gate.yml: no job with if: ${{ always() }}")
        sys.exit(1)

    print("Gate-like job names:", gate_names)


if __name__ == "__main__":
    check_passgate()
