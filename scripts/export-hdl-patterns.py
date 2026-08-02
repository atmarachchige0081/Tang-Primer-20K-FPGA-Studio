"""Export the reviewed Python HDL pattern catalog for the packaged v2 UI."""

from __future__ import annotations

from dataclasses import asdict
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ide.hdl_patterns import PATTERNS, validate_patterns  # noqa: E402


def main() -> int:
    problems = validate_patterns()
    if problems:
        raise RuntimeError("Invalid HDL pattern library:\n" + "\n".join(problems))
    destination = ROOT / "ip" / "catalog.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schemaVersion": 1,
        "patterns": [asdict(pattern) for pattern in PATTERNS],
    }
    temporary = destination.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(destination)
    print(f"Exported {len(PATTERNS)} verified HDL patterns to {destination.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
