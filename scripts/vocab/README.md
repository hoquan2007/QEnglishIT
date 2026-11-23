# Vocabulary pipeline

Run from the repository root. Requires Node.js and Python 3 stdlib only; no new
npm/pip dependencies. `VOCAB_PYTHON` overrides the Python executable used by the
`.mjs` entry points. No database access, credentials or cloud mutations.

```powershell
python scripts/vocab/fetch-sources.py
node scripts/vocab/build-wordlist.mjs
node scripts/vocab/enrich-ipa.mjs
python -m unittest discover -s scripts/vocab -p 'test_*.py'
```

External downloads require network-enabled execution; in Codex's restricted
sandbox use the authorized `exec_command require_escalated` route. Each source's
official license evidence is verified before downloading. GitHub URLs are pinned
to a commit. Cached download receipts contain URL, byte count and SHA256;
interrupted downloads use Range plus If-Range and restart if unsupported.
Reruns validate hashes and reuse matching downloads. `--only ngsl-1.2,wordfreq`
selects source keys. Registry updates preserve other agents' records and keep
`original` first. A failed fetch never records that source as complete.

`content/vocab/headwords.json` is the actual 10,500-entry stage, under 2 MB.
Sources overlap; the 1,930 local rows scanned are not the remote baseline, which
the user reports as 1,553. Headwords are case-filtered before lowercasing; names,
abbreviations, explicit editorial exclusions and dictionary profanity labels
are filtered. Supplemental words need independent dictionary lemma evidence,
not just wordfreq/CMU tokens. Pure inflections are not counted as extra lemmas.
Lexicalized separate POS entries can remain (e.g. `meeting`). This is automated
screening, not a claim that every lemma has been reviewed by a human.

CEFR-J `ALL` explicitly groups spelling alternatives. `spelling-map.json`
records those equivalences and source evidence; additional exact pairs come from
US-headed teaching CSV rows. No blanket `-ise` conversion is used. Canonical
headwords retain `spelling_variants`; the union is deduplicated and refilled from
dictionary-attested, wordfreq-ranked candidates. `founds` is corrected to `found`
using Kaikki inflection metadata plus NGSL's `found` row, despite NAWL's teaching
header. CEFR-J levels are authoritative for membership in `cefrj-1.6`; other
non-null levels are only the plan's rank-based estimates. Null ranks, POS and
levels are preserved where unavailable. No fabricated definitions/examples.

`--target N`, `--top N` and `--exclude file.txt` control selection. A shortfall
saves real partial data and exits nonzero. Do not raise `--top` just to hide a
shortfall without reviewing vocabulary usefulness.

IPA is stored in `scripts/vocab/ipa/<source>/*.json`, at most 500 rows per file.
`coverage-ipa.json` is the active-file manifest, with checksums, coverage and
explicit missing lemma lists. Import only named batches, match by `lemma` and
copy `ipa_us`/`ipa_uk` plus source provenance into the owning agent's word batches.
They are pronunciation supplements, not full vocabulary seed records. The first
sourced pronunciation is selected and other variants retained. Heteronyms need
POS/sense review; every row is `reviewed:false`. US: ipa-dict → mechanical CMU
ARPAbet conversion → explicitly US-tagged Kaikki. UK: ipa-dict → explicitly
UK-tagged Kaikki. No inferred accent conversion or fabricated IPA. Unstressed
monosyllables are not forced to have stress marks. Regeneration compares bytes
and removes only stale files bearing this script's exact batch naming scheme.

```powershell
node scripts/vocab/enrich-ipa.mjs --require-complete
# Expected nonzero while IPA remains missing; batches/report are still saved.
node scripts/vocab/enrich-ipa.mjs --without-gpl-uk --output-dir scripts/vocab/generated/no-gpl --report scripts/vocab/generated/no-gpl-report.json
```

License findings are in `content/sources/sources.json`:

- NGSL/NAWL/TSL/BSL: CC BY-SA 4.0, credited to the named authors.
- wordfreq: data CC BY-SA 4.0; code Apache-2.0. Full Robyn Speer, SUBTLEX,
  OpenSubtitles and other upstream notices retained. Derived list/rank data must
  retain share-alike terms. This project does not relabel it as original content.
- CEFR-J: TUFS Tono Laboratory's own terms allow research/commercial use with
  citation; this is not a Creative Commons license.
- Kaikki explicitly says CC-BY-SA and GFDL, without specifying versions on its
  license page. Versions are not invented; per-entry Wiktionary attribution and
  history URLs are documented in the registry.
- ipa-dict US: MIT notices plus underlying CMUdict notice retained.
- ipa-dict UK: **GPL-3.0**, derived from ipacards, separately distributed from US
  supplements. ipacards credits trace its IPA to automated eSpeak transcriptions;
  Google Translate audio mentioned there is not used. Keep the GPL license and
  pinned corresponding-source URL when distributing. The plan's blanket MIT
  assumption is incorrect. `--without-gpl-uk` provides a separate reduced-coverage
  alternative.

Only actual license/attribution notices are tracked in `notices/`. Full website
HTML, README evidence, raw datasets and download receipts live in ignored
`.cache/`. Registry evidence records URL, checked date, SHA256 and cache location;
use the fetch script to reconstruct the cache. Retain notices and applicable
source licenses when distributing derived data. Other agents must explicitly
consume the registry and pronunciation manifest; no seeding has been done here.

Coverage files are measured build artifacts. 10,500 headwords does not mean S1
is complete: IPA gaps, missing POS, estimated CEFR and manual review remain.
