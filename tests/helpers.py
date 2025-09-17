from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import contextmanager


@contextmanager
def temporary_env(**overrides: str | None) -> Iterator[None]:
    original = {}
    try:
        for key, value in overrides.items():
            if key in os.environ:
                original[key] = os.environ[key]
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        yield
    finally:
        for key in overrides:
            if key in original:
                os.environ[key] = original[key]
            else:
                os.environ.pop(key, None)
