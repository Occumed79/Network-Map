import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lib.official_source_fallback import wayback_snapshot_url


class GreenlandSourceFallbackTest(unittest.TestCase):
    def test_builds_replay_url_for_successful_official_capture(self):
        self.assertEqual(
            wayback_snapshot_url(
                "https://peqqik.gl/Kontakt/Sundhedscentre", "20250112212246"
            ),
            "https://web.archive.org/web/20250112212246id_/https://peqqik.gl/Kontakt/Sundhedscentre",
        )

    def test_rejects_invalid_urls_and_timestamps(self):
        self.assertEqual(wayback_snapshot_url("file:///etc/passwd", "20250112212246"), "")
        self.assertEqual(wayback_snapshot_url("https://peqqik.gl/Kontakt", "invalid"), "")


if __name__ == "__main__":
    unittest.main()
