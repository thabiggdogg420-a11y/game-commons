# Reversi: a bounded source-to-browser example

An assistant-authored adaptation of **Regi Ellis’s Reversi teaching demonstration**, not an independent community contribution, endorsed upstream release, or production-ready game. Upstream expressly describes the original as a teaching artifact, not a maintained game accepting feature requests. This example does not contact upstream or imply otherwise.

The patch adds optional **12 or 24 total legal placements across both players**, keeping unlimited play the default. The player with more discs wins at the limit. Illegal moves/passes do not consume the limit; replay/restart reset correctly; short games do not enter standard CPU statistics. It changes four scripts and adds `tests/acceptance.gd`.

## Credit and rights

Original code/scenes: Regi Ellis, MIT, copyright 2026; the original `LICENSE` is included unchanged. Adaptation and harness: Games4Free assistant-authored demonstration, under MIT. Preserve the original copyright and permission notice.

Sound: Kenney, CC0, `assets/audio/sfx/LICENSE.txt`. Bungee font: David Jonathan Ross, SIL OFL 1.1, `assets/fonts/OFL.txt`. The complete parent contains those assets/notices; this text-only package does not redistribute the assets. `UPSTREAM-NOTICE.txt` retains the original no-endorsement statement and Miisan UI-kit design-influence acknowledgment (not copied source). The repository’s MIT label does **not** relicense third-party assets.

## Recreate the exact source

Requires Git and an existing official **Godot 4.7.2 stable** installation with matching non-threaded Web export templates. Do not downgrade the declared project requirement or install anything automatically. Set `EXAMPLE` to the absolute directory containing this README and patch. In a new disposable working directory:

```sh
git clone https://github.com/regiellis/godot-reversi.git original
cd original
git checkout --detach 70586efafbc762efa16f5680ca0b90366eccc698
git rev-parse HEAD
git rev-parse HEAD^{tree}
git apply --check "$EXAMPLE/move-limit.patch"
git apply "$EXAMPLE/move-limit.patch"
```

Expected commit/tree and the SHA-256 of all five patched files are in `source.json`. Verify them before running. All 114 other original tracked files must remain unchanged. The acceptance harness is already part of the patch; do not add it twice.

## Isolate saves before any engine run

Keep this exact variant untouched. Copy it to a separate disposable `test-copy` (without any existing `.godot` cache). Generate a new random identifier, and first verify its intended custom userdata directory does not exist. In only `test-copy/project.godot`, add beneath `[application]`:

```ini
config/use_custom_user_dir=true
config/custom_user_dir_name="Reversi-Example-UNIQUE-RANDOM-ID"
```

Replace the placeholder with that fresh identifier; do not reuse an existing save directory. Record this two-setting diff separately. On Windows the directory is under `%APPDATA%`; on Linux under `$XDG_DATA_HOME` or `~/.local/share`; on macOS under `~/Library/Application Support`. See [Godot data paths](https://docs.godotengine.org/en/stable/tutorials/io/data_paths.html). No global settings change is required. If isolation cannot be established, stop before running.

Return to the disposable parent directory (`cd ..` if still inside `original`). With `test-copy` beside `original`, use the existing 4.7.2 executable as `godot`:

```sh
godot --headless --path test-copy --editor --import --quit
godot --headless --path test-copy --script res://tests/acceptance.gd
mkdir web-export
godot --headless --path test-copy --export-release Web ../web-export/index.html
```

The expected harness result is **22 checks, 0 failures**. Preserve `LICENSE`, `NOTICE`, `assets/audio/sfx/LICENSE.txt` and `assets/fonts/OFL.txt` with any distributed build; redistribution of the Godot runtime also requires its MIT and bundled third-party notices. No compiled build is supplied here. A fresh export is not claimed byte-identical: the random isolation configuration differs.

For local browser testing, bind a temporary server only to loopback and use an entirely new browser profile/storage origin. Do not change or clear existing browser storage. Close only the owned tab/process afterward. No public server or deployment is part of reproduction.

## What was actually checked

On 2 November 2026, assistant-operated isolated Godot 4.7.2 import, 22 native checks and non-threaded export passed. Actual desktop browser play completed a 12-placement hotseat match, Black 9–7, with “Move limit reached”. Legal turns, invalid/repeated input, replay, restart, pause and a reduced-motion setting across reload were checked. Export files remained unchanged during play.

The test sequence was D3, C3, B3, B2, B1, A1, C4, C1, C2, D2, D1, E1. An initial A1 click is illegal and must leave 2–2, Black to move, 0/12. Replaying resets to 2–2 and 0/12 while retaining the chosen limit.

Not accepted: CPU browser journey, complete 24-placement/unlimited games, keyboard-only board input, mobile touch usability, public hosting or an independent person recreating the example. Portrait inspection found small targets/text. These are bounded assistant checks, not a claim of human success.

## Share a next adaptation

Preserve the parent pin and all notices; describe your change and actual tests. The Games4Free [return form](https://games.free4allhub.com/remix-return) requests **public HTTPS source and playable-build or release references**, immutable source revision, pinned parents, credits, separate code/asset terms, reproduction steps, validation limits and rights confirmation. It sends a private review brief, not an automatic publication. Do not submit private links, credentials, screenshots or local paths. A source-only example is not a hosted playable release.
