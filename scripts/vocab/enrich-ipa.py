"""Persist real pronunciation batches, preserving source-specific licenses.

No definitions/examples are generated. Missing IPA remains missing; there is no
LLM, spelling-to-IPA guess, accent copy, or fabricated completion fallback.
"""
import argparse
import collections
import importlib.util
import json
from pathlib import Path
import re
from fetch_sources_import import ROOT, digest, write_json

spec = importlib.util.spec_from_file_location('wordlist', Path(__file__).with_name('build-wordlist.py'))
wordlist = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wordlist)
verified_file = wordlist.verified_file

ARPABET = dict(pair.split(':') for pair in '''AA:ɑ AE:æ AH:ʌ AO:ɔ AW:aʊ AY:aɪ B:b CH:tʃ D:d DH:ð EH:ɛ ER:ɝ EY:eɪ F:f G:ɡ HH:h IH:ɪ IY:i JH:dʒ K:k L:l M:m N:n NG:ŋ OW:oʊ OY:ɔɪ P:p R:ɹ S:s SH:ʃ T:t TH:θ UH:ʊ UW:u V:v W:w Y:j Z:z ZH:ʒ'''.split())


def convert_arpabet(tokens):
    output = []
    for token in tokens:
        match = re.fullmatch(r'([A-Z]+)([012]?)', token)
        if not match or match[1] not in ARPABET:
            raise ValueError(f'Unsupported ARPAbet token {token}')
        base, stress = match.groups()
        symbol = 'ə' if base == 'AH' and stress == '0' else 'ɚ' if base == 'ER' and stress == '0' else ARPABET[base]
        output.append(('ˈ' if stress == '1' else 'ˌ' if stress == '2' else '') + symbol)
    return '/' + ''.join(output) + '/'


def valid_ipa(ipa):
    return bool(re.fullmatch(r'/[^/\d\n]+/', ipa)) and not re.search(r'[A-Z]', ipa)


def read_ipa(path):
    result = {}
    with path.open(encoding='utf-8') as infile:
        for line in infile:
            if '\t' not in line:
                continue
            word, raw = line.rstrip().split('\t', 1)
            variants = list(dict.fromkeys(v for v in re.findall(r'/[^/]+/', raw) if valid_ipa(v)))
            if variants:
                result[wordlist.normalize(word)] = variants
    return result


def tagged_uk_spelling_variant(word, tagged, spellings):
    """Use only an attested UK pronunciation of an explicitly mapped UK spelling."""
    for spelling, canonical in spellings.items():
        if canonical != word:
            continue
        variants = list(dict.fromkeys(
            v for v in tagged.get(spelling, {}).get('uk', []) if valid_ipa(v)
        ))
        if variants:
            return variants, spelling
    return [], None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', default=str(ROOT / 'content/vocab/headwords.json'))
    parser.add_argument('--output-dir', default=str(ROOT / 'scripts/vocab/ipa'))
    parser.add_argument('--report', default=str(ROOT / 'scripts/vocab/coverage-ipa.json'))
    parser.add_argument('--batch-size', type=int, default=500)
    parser.add_argument('--require-complete', action='store_true', help='Fail after saving coverage if either dialect is missing')
    parser.add_argument('--without-gpl-uk', action='store_true', help='Only use explicitly UK-tagged Kaikki fallback; do not read GPL dataset')
    args = parser.parse_args()
    if not 1 <= args.batch_size <= 500:
        parser.error('batch-size must be between 1 and 500')
    heads = json.loads(Path(args.input).read_text(encoding='utf-8-sig'))
    wordlist.SPELLINGS.update({variant: item['canonical'] for variant, item in wordlist.spelling_records().items()})
    dictionaries = {'us': read_ipa(verified_file('ipa-dict-us.txt', 'ipa-dict-us')),
                    'uk': {} if args.without_gpl_uk else read_ipa(verified_file('ipa-dict-uk.txt', 'ipa-dict-uk'))}
    cmu = collections.defaultdict(list)
    for line in verified_file('cmudict.dict', 'cmudict').read_text(encoding='utf-8').splitlines():
        fields = line.split('#')[0].split()
        if len(fields) < 2:
            continue
        word = re.sub(r'\(\d+\)$', '', fields[0]).lower()
        try:
            ipa = convert_arpabet(fields[1:])
        except ValueError:
            continue
        if ipa not in cmu[word]:
            cmu[word].append(ipa)
    _, _, _, tagged, _ = wordlist.load_kaikki(verified_file('kaikki-simple.jsonl.gz', 'kaikki-simple'))
    by_source = collections.defaultdict(list)
    missing = {'us': [], 'uk': []}
    counts = collections.Counter()
    both = 0
    for head in heads:
        word = head['lemma']
        dialects = 0
        for dialect in ['us', 'uk']:
            # US/UK spelling variants may differ: use only explicit editorial mappings.
            variants = dictionaries[dialect].get(word)
            source = 'ipa-dict-' + dialect
            pronunciation_spelling = None
            if not variants and dialect == 'uk':
                for british, american in wordlist.SPELLINGS.items():
                    if american == word and british in dictionaries[dialect]:
                        variants = dictionaries[dialect][british]
                        break
            if not variants and dialect == 'us' and word in cmu:
                variants, source = cmu[word], 'cmudict'
            if not variants:
                variants = list(dict.fromkeys(v for v in tagged.get(word, {}).get(dialect, []) if valid_ipa(v)))
                source = 'kaikki-simple'
            if not variants and dialect == 'uk':
                # Example: furor (US headword) has an attested UK furore entry.
                # Keep the actual spelling used as evidence; never synthesize IPA.
                variants, pronunciation_spelling = tagged_uk_spelling_variant(
                    word, tagged, wordlist.SPELLINGS
                )
                source = 'kaikki-simple'
            if not variants:
                missing[dialect].append(word)
                continue
            field = 'ipa_' + dialect
            record = {'lemma': word, field: variants[0], 'source': source, 'reviewed': False}
            if pronunciation_spelling:
                record['pronunciation_spelling'] = pronunciation_spelling
            if len(variants) > 1:
                record[field + '_variants'] = variants
            by_source[(source, dialect)].append(record)
            counts[dialect] += 1
            counts[source + ':' + dialect] += 1
            dialects += 1
        both += dialects == 2
    output = Path(args.output_dir)
    manifest = []
    for (source, dialect), records in sorted(by_source.items()):
        for start in range(0, len(records), args.batch_size):
            path = output / source / f'{dialect}-{start + 1:05d}-{min(start + args.batch_size, len(records)):05d}.json'
            batch = records[start:start + args.batch_size]
            data = (json.dumps(batch, ensure_ascii=False, indent=2) + '\n').encode()
            if len(data) > 2_000_000:
                raise RuntimeError('IPA batch exceeds 2 MB')
            # Resume is content-addressed, not merely existence-based.
            if not path.exists() or digest(path.read_bytes()) != digest(data):
                write_json(path, batch)
            manifest.append({'file': path.relative_to(output).as_posix(), 'sha256': digest(data), 'rows': len(batch), 'source': source, 'dialect': dialect})
    active = {row['file'] for row in manifest}
    for source in ['ipa-dict-us', 'ipa-dict-uk', 'cmudict', 'kaikki-simple']:
        for old in (output / source).glob('*.json'):
            if re.fullmatch(r'(us|uk)-\d{5}-\d{5}\.json', old.name) and old.relative_to(output).as_posix() not in active:
                old.unlink()  # Only stale files in this script's exact generated naming scheme.
    report = {'headwords': len(heads), 'both': both, 'counts': dict(counts), 'missing': missing,
              'complete': not any(missing.values()), 'batches': manifest,
              'input_sha256': digest(Path(args.input).read_bytes()),
              'notes': ['UK ipacards-derived data retains GPL-3.0, separate from MIT/BSD US data.',
                        'Only files named in this manifest are active; stale batches from prior runs must not be imported.',
                        'First sourced pronunciation selected; alternatives preserved, heteronyms need POS/sense review.',
                        'All reviewed=false; no invented IPA or US-to-UK accent copying.']}
    write_json(Path(args.report), report)
    print(json.dumps({k: v for k, v in report.items() if k not in {'batches', 'missing'}}, indent=2))
    print('Missing US:', len(missing['us']), '; UK:', len(missing['uk']))
    if args.require_complete and not report['complete']:
        raise SystemExit('Incomplete IPA coverage; see report missing lists.')


if __name__ == '__main__':
    main()
