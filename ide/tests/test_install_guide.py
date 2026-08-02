import re
from pathlib import Path
import unittest


WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
INSTALL_PATH = WORKSPACE_ROOT / "INSTALL.md"


class InstallGuideTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.guide = INSTALL_PATH.read_text(encoding="utf-8")

    def test_guide_exists_at_repository_root_and_has_complete_sequence(self):
        self.assertTrue(self.guide.startswith("# Install Tang FPGA Studio on Windows"))
        steps = re.findall(r"^## Step (\d+) —", self.guide, flags=re.MULTILINE)
        self.assertEqual([str(number) for number in range(1, 17)], steps)

    def test_every_first_run_checkpoint_is_documented(self):
        required_commands = (
            "TangPrimerFPGAStudio-Setup-X.Y.Z.exe",
            "git --version",
            ".\\fpga.ps1 setup",
            ".\\fpga.ps1 doctor -Project projects/01_button_led_pwm",
            ".\\fpga.ps1 sim -Project projects/01_button_led_pwm",
            ".\\fpga.ps1 wave -Project projects/01_button_led_pwm",
            ".\\fpga.ps1 detect -Project projects/01_button_led_pwm",
            ".\\fpga.ps1 build -Project projects/01_button_led_pwm",
            ".\\fpga.ps1 upload -NoBuild -Project projects/01_button_led_pwm",
            "npm run desktop",
        )
        for command in required_commands:
            with self.subTest(command=command):
                self.assertIn(command, self.guide)

    def test_hardware_safety_boundaries_are_explicit(self):
        for phrase in (
            "Converter A / Interface 0 / `MI_00`",
            "Converter B / `MI_01`",
            "DIP switch **1 DOWN**",
            "SRAM is the safest first hardware test",
            "Do not continue to programming if detection fails",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.guide)

    def test_local_markdown_links_resolve(self):
        local_targets = re.findall(r"\[[^]]+\]\((?!https?://)([^)#]+)(?:#[^)]+)?\)", self.guide)
        for target in local_targets:
            path = (WORKSPACE_ROOT / target).resolve()
            with self.subTest(target=target):
                self.assertTrue(path.exists(), f"Broken INSTALL.md link: {target}")

    def test_current_repository_url_is_used(self):
        self.assertIn("atmarachchige0081/Tang-FPGA-Studio", self.guide)
        self.assertNotIn("User-Firendly-Programming", self.guide)

    def test_markdown_code_fences_are_balanced(self):
        self.assertEqual(0, self.guide.count("```") % 2)


if __name__ == "__main__":
    unittest.main()
