import unittest
from dataclasses import asdict
import json
from pathlib import Path

from ide.hdl_patterns import (
    CATEGORIES,
    HDL_SNIPPETS,
    HDL_SNIPPET_ALIASES,
    PATTERN_BY_TITLE,
    PATTERNS,
    search_patterns,
    validate_patterns,
)


class HDLPatternLibraryTests(unittest.TestCase):
    def test_library_size_categories_and_scope(self):
        self.assertGreaterEqual(len(PATTERNS), 50)
        self.assertLessEqual(len(PATTERNS), 100)
        self.assertGreaterEqual(len(CATEGORIES), 8)
        for category in CATEGORIES:
            self.assertGreaterEqual(
                sum(pattern.category == category for pattern in PATTERNS),
                5,
                category,
            )
        self.assertGreaterEqual(sum(pattern.synthesizable for pattern in PATTERNS), 50)
        self.assertGreaterEqual(sum(not pattern.synthesizable for pattern in PATTERNS), 5)

    def test_metadata_and_aliases_are_valid_and_unique(self):
        self.assertEqual([], validate_patterns())
        self.assertEqual(len(PATTERNS), len(PATTERN_BY_TITLE))
        self.assertEqual(len(PATTERNS), len(HDL_SNIPPETS))
        self.assertEqual(len(PATTERNS), len(HDL_SNIPPET_ALIASES))
        for alias, title in HDL_SNIPPET_ALIASES.items():
            self.assertIn(title, PATTERN_BY_TITLE, alias)
            self.assertEqual(PATTERN_BY_TITLE[title].code, HDL_SNIPPETS[title])

    def test_expected_beginner_aliases_remain_available(self):
        for alias in ("ffreg", "comb", "counter", "sync2", "fsm", "fifo", "pwm", "assertx"):
            self.assertIn(alias, HDL_SNIPPET_ALIASES)

    def test_search_matches_alias_summary_and_filters(self):
        self.assertTrue(any(pattern.title == "Synchronous FIFO core"
                            for pattern in search_patterns("fifo")))
        self.assertTrue(any(pattern.title == "Two-flop bit synchronizer"
                            for pattern in search_patterns("metastability")))
        self.assertEqual(8, len(search_patterns("simulation only")))
        verification = search_patterns(category="Verification", difficulty="Beginner")
        self.assertTrue(verification)
        self.assertTrue(all(pattern.category == "Verification" for pattern in verification))
        self.assertTrue(all(pattern.difficulty == "Beginner" for pattern in verification))
        self.assertTrue(all(not pattern.synthesizable for pattern in verification))

    def test_synthesizable_entries_exclude_testbench_only_constructs(self):
        forbidden = ("$fatal", "$error", "$urandom", "@(negedge clk);", "#(")
        for pattern in PATTERNS:
            if pattern.synthesizable:
                for token in forbidden:
                    self.assertNotIn(token, pattern.code, pattern.title)

    def test_packaged_v2_catalog_matches_source_library(self):
        root = Path(__file__).resolve().parents[2]
        payload = json.loads((root / "ip" / "catalog.json").read_text(encoding="utf-8"))
        self.assertEqual(1, payload["schemaVersion"])
        expected = json.loads(json.dumps([asdict(pattern) for pattern in PATTERNS]))
        self.assertEqual(expected, payload["patterns"])


if __name__ == "__main__":
    unittest.main()
