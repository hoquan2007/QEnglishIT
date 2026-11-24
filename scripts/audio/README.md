# Local audio pipeline

Requires Node.js, a local TTS command, FFmpeg with libmp3lame, and FFprobe.
Set up the tools explicitly before running these scripts. Audio generation
runs on the local machine.

Copy `config.example.json` to ignored `local.config.json`, configure actual
executable paths and replace all voice/license fields with verified values.
The example is rejected until those terms are supplied. `command` runs directly
with `shell:false`; `args` substitutes `{voice}`, `{output}` and optional `{text}`.
Text is also sent to stdin as UTF-8. The command must write RIFF/WAVE at
`{output}`. Credentials belong in the process environment, never config/argv.
With Piper an adapter commonly uses `command: "piper"`, arguments
`["--model","{voice}","--output_file","{output}"]`, and voice IDs pointing to
licensed local ONNX files. Verify that installed CLI's own help and each model's
license before use. The adapter also supports installed Kokoro wrappers meeting
the same stdin/WAV contract. Locale and voice terms must be explicit; they are
operator assertions, not automatically validated voice-model licenses.

For Kokoro, install `kokoro-onnx==0.6.1` in a local virtual environment and
point `command` to that interpreter. Use `scripts/audio/kokoro-wav.py`
with these `args`, replacing the two asset paths with local paths from the
[official ONNX release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0).

```json
["scripts/audio/kokoro-wav.py", "--model", "kokoro-v1.0.int8.onnx", "--voices", "voices-v1.0.bin", "--voice", "{voice}", "--output", "{output}"]
```

The batch generated on 24/11/2026 uses `af_heart` and `am_michael` for
US English and `bf_emma` and `bm_george` for UK English. See the
[Kokoro model card](https://huggingface.co/hexgrad/Kokoro-82M) and
[voice list](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md).

```powershell
node scripts/audio/tts-words.mjs --help
node scripts/audio/tts-words.mjs --config scripts/audio/local.config.json --only agreement --dialect both
node scripts/audio/tts-words.mjs --config scripts/audio/local.config.json --limit 500
node scripts/audio/tts-listening.mjs --config scripts/audio/local.config.json --input content/listening/lessons.json --limit 1
node --test scripts/audio/pipeline.test.mjs
```

Words default to `content/vocab/headwords.json`. `us` must declare `en-US`, `uk`
must declare `en-GB`. Output defaults to ignored `scripts/audio/.cache/media`:
`words/us/<lemma>.mp3`, `words/uk/<lemma>.mp3`,
`tests/<slug>/g<group_order>.mp3`, `listening/<slug>.mp3`.
An explicit `--output` overrides the local media directory. No content JSON is
modified. Mono MP3 is encoded at 24 kHz / 48 kbps. Word silence is trimmed;
FFprobe verifies 0.3–3 seconds and <=25,000 bytes. A command exit without a valid
WAV, missing binary, bad MP3, timeout or failed QA exits nonzero, without a
completion entry. Temporary files are cleaned; earlier successful files remain.

Listening input supports existing lesson `segments` or test `groups`. Speaker
labels (`M`, `W`, `M1`, `M2`, `N`, `Q`, etc.) require explicit `speakers` mappings
to configured voices. Per-test/group/lesson `speaker_voices` can override them.
Configure separate voices and `en-US/GB/AU/CA` locales to author the plan's accent
matrix; the script reports actual locale counts and does **not** claim the
35/25/20/20 target automatically. Continuation lines stay with their speaker.
Part 3/4 questions and options are read after the transcript. Pauses: 0.6s after
turns, 5s after questions (8s for difficulty 1–2). Input JSON's group ordering
must match the seed owner's `group_order` convention. Generated duration/URLs
are carried in manifests for later source updates.

Per-file manifests contain input/config signatures and output hashes. Reruns
skip only exact matches; changing text, voices, encoder settings or a file's
bytes regenerates it. Listening also checkpoints each successful turn, so a
later failure does not repeat earlier synthesis. Reusing a voice ID with a
different model requires changing config/generator to invalidate its signature.
Keep simultaneous runs on distinct output directories.

```powershell
node scripts/audio/upload-media.mjs --input scripts/audio/.cache/media/words-manifest.json --dry-run
```

The uploader is **offline by default**, validates completed file hashes, and
loads no credentials in dry-run mode. Future explicit `--execute` uses the
repository's existing `@supabase/supabase-js`, `SUPABASE_URL` (or
`NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SECRET_KEY` from the environment. It
does not read `.env.local` implicitly. Uploads use bucket `media`,
`cacheControl: "31536000"`, `upsert:true`; source rows are resolved before any
write, source URL/duration updated, and `media_assets` upserted by `bucket,path`.
Reruns safely retry partial operations; receipts record completion only after
all stages pass. Source resolution must be unique except vocabulary, where the
same lemma's multiple POS rows receive the same headword audio.

Migration `0005_listening_media.sql` adds `audio_url` and duration to the legacy
`listening_lessons` table; the uploader probes required columns before uploading.
Bucket/table/schema/policy setup must already exist. Standard uploads buffer files; official Supabase guidance recommends TUS
for files >6 MB, so very long lessons need a future resumable-upload adapter.
Stable overwritten URLs may remain stale at CDN edges despite successful upsert.

To import a new batch of listening lessons, stage its verified MP3 files in
Storage before running the strict importer. The staging command adds the
resulting URLs and durations to the batch JSON after every upload succeeds.
Seed the batch, then run the uploader normally to record `media_assets`.
For lessons already in the database, run the uploader normally.

```powershell
node --env-file-if-exists=.env.local scripts/audio/upload-media.mjs --input <manifest> --execute --prepare-listening content/listening/lessons-003.json
npm run seed -- listening --strict --file content/listening/lessons-003.json
node --env-file-if-exists=.env.local scripts/audio/upload-media.mjs --input <manifest> --execute
```
