"""Compile original, edited vocabulary into source-traceable word batches.

Author glosses and bilingual examples in curated/*.json. IPA is read only from
active, checksum-verified pronunciation batches, never invented or accent-copied.
The command makes no database or network calls and never marks a word reviewed.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile


ROOT = Path(__file__).resolve().parents[2]
VOCAB = ROOT / 'content' / 'vocab'
IPA = ROOT / 'scripts' / 'vocab' / 'ipa'
MANIFEST = ROOT / 'scripts' / 'vocab' / 'coverage-ipa.json'
DEFAULT_CURATED = ROOT / 'scripts' / 'vocab' / 'curated' / 'it-core-001.json'
DEFAULT_OUTPUT = VOCAB / 'words' / 'words-it-core-001.json'
POS = {'n', 'v', 'adj', 'adv', 'prep', 'conj', 'pron', 'det', 'num', 'interj', 'phr'}


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def sha256(content):
    return hashlib.sha256(content).hexdigest()


def sourced_pronunciations():
    report = read_json(MANIFEST)
    if sha256((VOCAB / 'headwords.json').read_bytes()) != report['input_sha256']:
        raise ValueError('Headword checksum differs from the IPA manifest; regenerate IPA first')
    catalog = {source['key']: source for source in read_json(ROOT / 'content/sources/sources.json')}
    pronunciations = {'us': {}, 'uk': {}}
    for batch in report['batches']:
        path = IPA / batch['file']
        if not path.is_file() or sha256(path.read_bytes()) != batch['sha256']:
            raise ValueError(f'IPA manifest checksum mismatch: {batch["file"]}')
        if batch['source'] not in catalog or not catalog[batch['source']].get('license_evidence'):
            raise ValueError(f'Missing verified license for {batch["source"]}')
        dialect = batch['dialect']
        rows = read_json(path)
        if len(rows) != batch['rows']:
            raise ValueError(f'IPA batch count mismatch: {batch["file"]}')
        for record in rows:
            lemma = record['lemma']
            if lemma in pronunciations[dialect] or record['source'] != batch['source']:
                raise ValueError(f'Duplicate or mismatched IPA source: {lemma} ({dialect})')
            provenance = {
                'source': batch['source'],
                'license': catalog[batch['source']]['license'],
                'batch_file': 'scripts/vocab/ipa/' + batch['file'],
                'batch_sha256': batch['sha256'],
            }
            if record.get('pronunciation_spelling'):
                provenance['pronunciation_spelling'] = record['pronunciation_spelling']
            pronunciation = record['ipa_' + dialect]
            # The word schema stores one IPA transcription. Preserve the
            # source's alternatives when selecting the first listed variant.
            if pronunciation.startswith('/') and pronunciation.endswith('/') and ', ' in pronunciation:
                provenance['source_transcription'] = pronunciation
                pronunciation = '/' + pronunciation[1:-1].split(', ', 1)[0] + '/'
            pronunciations[dialect][lemma] = (pronunciation, provenance)
    return pronunciations, report


def existing_legacy_lemmas():
    seen = set()
    for file in VOCAB.glob('*.json'):
        if file.name == 'headwords.json':
            continue
        for lesson in read_json(file).get('lessons', []):
            for word in lesson.get('words', []):
                seen.add(word['word'].lower().strip())
    return seen


def validate_original(item, seen_sentences):
    lemma = item['lemma']
    if item.get('pos') not in POS or not re.fullmatch(r'[a-z]+(?:-[a-z]+)*', lemma):
        raise ValueError(f'Invalid lemma/POS: {lemma}')
    if not 1 <= len(item.get('meaning_vi', '')) <= 120:
        raise ValueError(f'Missing or long Vietnamese meaning: {lemma}')
    definition = item.get('definition_en', '')
    if not 1 <= len(definition.split()) <= 20:
        raise ValueError(f'English definition must contain 1–20 words: {lemma}')
    examples = item.get('examples')
    if not isinstance(examples, list) or len(examples) != 2:
        raise ValueError(f'Exactly two authored examples required: {lemma}')
    for example in examples:
        en, vi = example['en'].strip(), example['vi'].strip()
        if not 1 <= len(en.split()) <= 18 or not vi:
            raise ValueError(f'Example is empty or exceeds 18 English words: {lemma}')
        if not re.search(r'(?<!\w)' + re.escape(lemma) + r'(?:s|es|ed|ing)?(?!\w)', en, re.I):
            raise ValueError(f'Example lacks explicit lemma: {lemma}: {en}')
        normalized = re.sub(r'\W+', ' ', en.casefold()).strip()
        if normalized in seen_sentences:
            raise ValueError(f'Duplicate example sentence: {en}')
        seen_sentences.add(normalized)
    if not isinstance(item.get('topics'), list) or not item['topics']:
        raise ValueError(f'At least one topic required: {lemma}')
    for collocation in item.get('collocations', []):
        if not collocation.get('en') or not collocation.get('vi'):
            raise ValueError(f'Incomplete collocation: {lemma}')


def compile_batch(curated, output):
    heads = {row['lemma']: row for row in read_json(VOCAB / 'headwords.json')}
    ipa, report = sourced_pronunciations()
    source = read_json(curated)
    if not isinstance(source, list) or not 1 <= len(source) <= 500:
        raise ValueError('A curated file must have 1–500 records')
    used = existing_legacy_lemmas()
    for file in (VOCAB / 'words').glob('*.json'):
        if file.resolve() == output.resolve():
            continue
        used.update((row.get('lemma') or row['word']).lower() for row in read_json(file))
    records = []
    sentences = set()
    for item in source:
        lemma = item['lemma']
        validate_original(item, sentences)
        if lemma in used:
            raise ValueError(f'Duplicate lemma with existing vocabulary: {lemma}')
        used.add(lemma)
        head = heads.get(lemma)
        if head is None or item['pos'] not in head['pos_candidates']:
            raise ValueError(f'Headword or dictionary POS evidence missing: {lemma}/{item["pos"]}')
        missing = [accent for accent in ('us', 'uk') if lemma not in ipa[accent]]
        if missing:
            raise ValueError(f'Missing sourced IPA {"/".join(missing)}: {lemma}')
        us, us_source = ipa['us'][lemma]
        uk, uk_source = ipa['uk'][lemma]
        record = {
            'word': lemma,
            'lemma': lemma,
            'pos': item['pos'],
            'ipa': us,
            'ipa_us': us,
            'ipa_uk': uk,
            'ipa_provenance': {'us': us_source, 'uk': uk_source},
            'meaning_vi': item['meaning_vi'],
            'definition_en': item['definition_en'],
            'examples': [{**example, 'source': 'original'} for example in item['examples']],
            'collocations': item.get('collocations', []),
            'word_family': item.get('word_family', []),
            'synonyms': item.get('synonyms', []),
            'antonyms': item.get('antonyms', []),
            'cefr': head['cefr'],
            'cefr_basis': 'cefrj-1.6' if 'cefrj-1.6' in head['lists'] else 'rank-estimate',
            'frequency_rank': head['rank'],
            'lists': head['lists'],
            'topics': item['topics'],
            'source': 'original',
            'reviewed': False,
        }
        if item.get('register'):
            record['register'] = item['register']
        records.append(record)
    payload = (json.dumps(records, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    if len(payload) > 2_000_000:
        raise ValueError('Batch exceeds 2 MB')
    return payload, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--curated', type=Path, default=DEFAULT_CURATED)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--check', action='store_true', help='Verify generated output; do not write')
    args = parser.parse_args()
    curated, output = args.curated.resolve(), args.output.resolve()
    if not curated.is_relative_to(ROOT / 'scripts' / 'vocab'):
        parser.error('Curated input must be inside scripts/vocab')
    if not output.is_relative_to(VOCAB / 'words'):
        parser.error('Output must be inside content/vocab/words')
    payload, report = compile_batch(curated, output)
    if args.check:
        if not output.exists() or output.read_bytes() != payload:
            raise SystemExit('Compiled word batch differs from curated input or IPA evidence')
    elif not output.exists() or output.read_bytes() != payload:
        output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=output.parent, delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(payload)
        try:
            os.replace(temporary, output)
        finally:
            temporary.unlink(missing_ok=True)
    compiled = json.loads(payload)
    print(json.dumps({
        'authored_words_with_dual_ipa': len(compiled),
        'words_with_two_bilingual_examples': sum(len(row['examples']) == 2 for row in compiled),
        'human_reviewed_words': sum(row['reviewed'] for row in compiled),
        'words_with_audio_us': sum(bool(row.get('audio_us_url')) for row in compiled),
        'words_with_audio_uk': sum(bool(row.get('audio_uk_url')) for row in compiled),
        'headwords_missing_ipa_us': len(report['missing']['us']),
        'headwords_missing_ipa_uk': len(report['missing']['uk']),
        'output': str(output),
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
