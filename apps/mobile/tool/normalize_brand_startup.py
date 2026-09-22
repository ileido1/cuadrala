#!/usr/bin/env python3
"""Keep platform startup fallbacks navy after flutter_native_splash runs."""

from pathlib import Path


NAVY = "#12203A"
ROOT = Path(__file__).resolve().parents[1]


def replace(path: Path, old: str, new: str) -> None:
    content = path.read_text(encoding="utf-8")
    updated = content.replace(old, new)
    if updated != content:
        path.write_text(updated, encoding="utf-8")


for styles in (ROOT / "android/app/src/main/res").glob("values*/styles.xml"):
    replace(
        styles,
        '<item name="android:windowBackground">?android:colorBackground</item>',
        f'<item name="android:windowBackground">{NAVY}</item>',
    )

storyboard = ROOT / "ios/Runner/Base.lproj/LaunchScreen.storyboard"
replace(
    storyboard,
    '<color key="backgroundColor" red="1" green="1" blue="1" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>',
    '<color key="backgroundColor" red="0.07058823529" green="0.1254901961" blue="0.2274509804" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>',
)

web_index = ROOT / "web/index.html"
web_content = web_index.read_text(encoding="utf-8")
if '<meta name="theme-color" content="#12203A">' not in web_content:
    replace(
        web_index,
        '<meta name="description" content="Cuádrala — tu comunidad deportiva para armar partidas y torneos.">',
        '<meta name="description" content="Cuádrala — tu comunidad deportiva para armar partidas y torneos.">\n  <meta name="theme-color" content="#12203A">',
    )
replace(web_index, 'href="icons/Icon-192.png"', 'href="icons/Icon-192.png?v=20260922"')
replace(web_index, 'href="favicon.ico"', 'href="favicon.ico?v=20260922"')
replace(web_index, 'href="favicon.png"', 'href="favicon.png?v=20260922"')
web_content = web_index.read_text(encoding="utf-8")
web_index.write_text(
    "\n".join(line.rstrip() for line in web_content.splitlines()) + "\n",
    encoding="utf-8",
)

print("Normalized Android, iOS, and Flutter web startup fallbacks to canonical navy.")
