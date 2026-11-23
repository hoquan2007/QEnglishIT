"""Build real headwords from verified downloads, without third-party dependencies."""
import argparse
import collections
import csv
import gzip
import io
import json
from pathlib import Path
import re
import struct
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from fetch_sources_import import CACHE, ROOT, digest, write_json, atomic

POS = {'noun': 'n', 'verb': 'v', 'adjective': 'adj', 'adj': 'adj', 'adverb': 'adv', 'adv': 'adv',
       'preposition': 'prep', 'prep': 'prep', 'conjunction': 'conj', 'conj': 'conj', 'pronoun': 'pron',
       'pron': 'pron', 'determiner': 'det', 'det': 'det', 'number': 'num', 'numeral': 'num',
       'interjection': 'interj', 'intj': 'interj'}
LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
# Editorial exclusions are explicit and extendable, not a claim of complete moderation.
BLOCK = set('fuck fucking fucked fucker motherfucker shit shitty bullshit asshole arsehole cunt bitch bastard dick cock pussy porn pornography porno nigger nigga faggot rape rapist suicide nazi hitler'.split())
SPELLINGS = {}  # Populated only from verified source-backed equivalence records.


def normalize(word):
    return unicodedata.normalize('NFKC', word).replace('’', "'").strip().lower()


def eligible(word):
    return bool(re.fullmatch(r"[a-z]+(?:['-][a-z]+)*", word)) and word not in BLOCK and (len(word) > 1 or word in {'a', 'i'})


def verified_file(name, key):
    path = CACHE / name
    if not path.exists():
        raise RuntimeError(f'Missing {name}; run python scripts/vocab/fetch-sources.py first')
    receipt = json.loads((CACHE / (name + '.receipt.json')).read_text())
    registry = json.loads((ROOT / 'content/sources/sources.json').read_text(encoding='utf-8-sig'))
    source = next((s for s in registry if s['key'] == key), None)
    if not source or not source.get('license_evidence') or receipt not in source.get('downloads', []):
        raise RuntimeError(f'{name}: missing verified source/receipt in registry')
    if digest(path.read_bytes()) != receipt['sha256']:
        raise RuntimeError(f'{name}: checksum mismatch; re-fetch source')
    return path


def unpack_cbpack(data):
    """Only the documented cBpack types; reject unsupported or truncated data."""
    offset = 0

    def take(n):
        nonlocal offset
        if offset + n > len(data):
            raise ValueError('Truncated msgpack')
        part = data[offset:offset + n]
        offset += n
        return part

    def integer(n):
        return int.from_bytes(take(n), 'big')

    def value():
        tag = integer(1)
        if tag < 128:
            return tag
        if 160 <= tag <= 191:
            return take(tag & 31).decode()
        if 144 <= tag <= 159:
            return [value() for _ in range(tag & 15)]
        if 128 <= tag <= 143:
            return {value(): value() for _ in range(tag & 15)}
        if tag in (217, 218, 219):
            return take(integer({217: 1, 218: 2, 219: 4}[tag])).decode()
        if tag in (220, 221):
            return [value() for _ in range(integer(2 if tag == 220 else 4))]
        if tag in (204, 205, 206):
            return integer({204: 1, 205: 2, 206: 4}[tag])
        raise ValueError(f'Unsupported cBpack tag {tag}')

    result = value()
    if offset != len(data) or result[0] != {'format': 'cB', 'version': 1}:
        raise ValueError('Unexpected cBpack format/header/trailing data')
    return result[1:]


def cefr_rows(path, sheet=7):
    ns = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(path) as outer:
        with zipfile.ZipFile(io.BytesIO(outer.read('CEFR-J Wordlist Ver1.6.xlsx'))) as book:
            # itertext would also include phonetic annotations; use only text runs.
            strings = [''.join(t.text or '' for t in si.findall('.//x:t', ns)) for si in ET.fromstring(book.read('xl/sharedStrings.xml')).findall('x:si', ns)]
            # ALL_sep: one spelling per row, unlike ALL's combined variants.
            for row in ET.fromstring(book.read(f'xl/worksheets/sheet{sheet}.xml')).findall('.//x:row', ns):
                cells = {}
                for cell in row:
                    v = cell.findtext('x:v', default='', namespaces=ns)
                    cells[re.sub(r'\d', '', cell.attrib['r'])] = strings[int(v)] if cell.attrib.get('t') == 's' and v else v
                if cells.get('C', '')[:2] in LEVELS:
                    yield cells.get('A', ''), cells.get('B', ''), cells['C'][:2]


def spelling_records():
    records = {}
    path = verified_file('cefrj-1.6.zip', 'cefrj-1.6')
    # ALL groups explicit variants. Exclude number/meaning distinctions rather
    # than treating every slash as spelling equivalence.
    for raw, _, _ in cefr_rows(path, sheet=2):
        variants = raw.split('/')
        if len(variants) < 2 or raw in {'saving/savings', 'short/shorts'}:
            continue
        us = variants[0]
        if us != us.lower() or not eligible(us):
            continue
        for variant in variants[1:]:
            if variant != variant.lower() or not eligible(variant):
                continue
            records[variant] = {'canonical': us, 'source': 'cefrj-1.6', 'evidence': 'ALL headword: ' + raw}
    # These exact pairs co-occur in the official US-headed teaching rows.
    for key, first, second in [('ngsl-1.2', 'aging', 'ageing'), ('ngsl-1.2', 'centered', 'centred'),
                               ('nawl-1.2', 'globalization', 'globalisation')]:
        text = verified_file(key + '.csv', key).read_bytes().decode('cp1252')
        row = next((r for r in csv.reader(text.splitlines()) if first in r and second in r), None)
        if not row:
            raise RuntimeError(f'Spelling-pair evidence changed: {first}/{second}')
        records[second] = {'canonical': first, 'source': key, 'evidence': 'US-headed teaching row: ' + ','.join(row)}
    return records


def load_kaikki(path):
    roots = collections.defaultdict(set)
    forms = collections.defaultdict(set)
    rejected = set()
    tagged_ipa = collections.defaultdict(lambda: collections.defaultdict(list))
    pure_forms = set()
    with gzip.open(path, 'rt', encoding='utf-8') as infile:
        for line in infile:
            entry = json.loads(line)
            raw = entry.get('word', '')
            word = normalize(raw)
            if entry.get('lang_code') != 'en' or not eligible(word):
                continue
            senses = entry.get('senses', [])
            labels = ' '.join(str(s.get(k, [])) for s in senses for k in ('tags', 'raw_tags', 'categories')).lower()
            if any(t in labels for t in ('vulgar', 'offensive', 'derogatory', 'slur', 'profanity', 'abbreviation', 'initialism', 'acronym')):
                rejected.add(word)
            # Case filtering occurs BEFORE lowercase. Names never become headwords.
            if raw != raw.lower() or entry.get('pos') not in POS:
                continue
            base_forms = [f['form'] for f in entry.get('forms', []) if
                          set(f.get('tags', []) + f.get('raw_tags', [])) & {'canonical', 'positive', 'Singular'}]
            is_form = any(normalize(f) != word for f in base_forms)
            form_categories = ('plural', 'past tense', 'participle', 'third-person', 'comparative form', 'superlative form')
            only_form = bool(senses) and all(s.get('form_of') or s.get('alt_of') or any(t in str(s.get('categories', [])).lower() for t in form_categories) for s in senses)
            if only_form:
                pure_forms.add(word)
            if not is_form and not only_form:
                roots[word].add(POS[entry['pos']])
                for f in entry.get('forms', []):
                    variant = normalize(f.get('form', ''))
                    if eligible(variant) and variant != word:
                        forms[variant].add(word)
            for base in base_forms:
                base = normalize(base)
                if base != word and eligible(base):
                    forms[word].add(base)
            for sound in entry.get('sounds', []):
                ipa = sound.get('ipa', '')
                for dialect, tag in [('us', 'US'), ('uk', 'UK')]:
                    if tag in sound.get('tags', []) and re.fullmatch(r'/[^/]+/', ipa):
                        tagged_ipa[word][dialect].append(ipa)
    return roots, forms, rejected, tagged_ipa, pure_forms - set(roots)


def build(args):
    spellings = spelling_records()
    SPELLINGS.update({variant: item['canonical'] for variant, item in spellings.items()})
    write_json(ROOT / 'scripts/vocab/spelling-map.json', spellings)
    ranks = {}
    buckets = unpack_cbpack(gzip.decompress(verified_file('wordfreq-en.msgpack.gz', 'wordfreq').read_bytes()))
    for bucket in buckets:
        for token in bucket:
            if token not in ranks:
                ranks[token] = len(ranks) + 1
    roots, forms, rejected, _, pure_forms = load_kaikki(verified_file('kaikki-simple.jsonl.gz', 'kaikki-simple'))
    lists = collections.defaultdict(set)
    pos = collections.defaultdict(set)
    cefr = {}
    for key in ['ngsl-1.2', 'nawl-1.2', 'tsl-1.2', 'bsl-1.20']:
        path = verified_file(key + '.csv', key)
        raw_csv = path.read_bytes()
        try:
            decoded = raw_csv.decode('utf-8-sig')
        except UnicodeDecodeError:
            decoded = raw_csv.decode('cp1252')  # official teaching files contain legacy accented spellings
        with io.StringIO(decoded, newline='') as infile:
            for row in csv.reader(line for line in infile if not line.startswith('##')):
                if not row:
                    continue
                root = normalize(row[0])
                if not eligible(root):
                    continue
                lists[root].add(key)
                for form in row[1:]:
                    if eligible(normalize(form)):
                        forms[normalize(form)].add(root)
    for raw, part, level in cefr_rows(verified_file('cefrj-1.6.zip', 'cefrj-1.6')):
        root = normalize(raw)
        if raw != raw.lower() or not eligible(root):
            continue
        lists[root].add('cefrj-1.6')
        if part in POS:
            pos[root].add(POS[part])
        if root not in cefr or LEVELS.index(level) < LEVELS.index(cefr[root]):
            cefr[root] = level
    established = set(roots) | set(lists)
    existing_count = 0
    for file in sorted((ROOT / 'content/vocab').glob('*.json')):
        if file.name == 'headwords.json':
            continue
        collection = json.loads(file.read_text(encoding='utf-8-sig'))
        for lesson in collection.get('lessons', []) if isinstance(collection, dict) else []:
            for entry in lesson.get('words', []):
                existing_count += 1
                raw = entry.get('lemma') or entry['word']
                word = normalize(raw)
                if raw != raw.lower() or not eligible(word):
                    continue
                # Unverified existing phrases/inflections are not promoted as lemmas.
                if word not in established:
                    continue
                lists[word].add('original')
                if entry.get('pos') in set(POS.values()):
                    pos[word].add(entry['pos'])
    if args.exclude:
        rejected.update(normalize(w) for w in Path(args.exclude).read_text(encoding='utf-8').splitlines() if w and not w.startswith('#'))
    candidates = set(lists) | {w for w in roots if ranks.get(w, 10**9) <= args.top}
    result = {}
    corrections = {}
    for word in sorted(candidates):
        canonical = SPELLINGS.get(word, word)
        if word in rejected or canonical in rejected or not eligible(canonical):
            continue
        # A listed spelling remains a legitimate lexicalized headword (e.g. left,
        # meeting); pure forms without independent lemma evidence are collapsed.
        bases = {base for base in forms.get(word, []) if base in established and base != word}
        if word in pure_forms and word not in cefr and len(bases) == 1:
            canonical = SPELLINGS.get(next(iter(bases)), next(iter(bases)))
            corrections[word] = canonical
        item = result.setdefault(canonical, {'lemma': canonical, 'pos_candidates': set(), 'rank': ranks.get(canonical),
                                            'cefr': None, 'lists': set()})
        item['lists'].update(lists.get(word, set()))
        if word in SPELLINGS:
            item.setdefault('spelling_variants', set()).add(word)
        if word in roots:
            item['lists'].add('kaikki-simple')
        item['pos_candidates'].update(roots.get(word, set()) | pos.get(word, set()))
        if ranks.get(canonical):
            item['lists'].add('wordfreq')
        if word in cefr and (item['cefr'] is None or LEVELS.index(cefr[word]) < LEVELS.index(item['cefr'])):
            item['cefr'] = cefr[word]
    ordered = sorted(result.values(), key=lambda w: (w['rank'] is None, w['rank'] or 0, w['lemma']))
    # Retain all core-list entries even when target is smaller than their union.
    core = [w for w in ordered if set(w['lists']) & {'ngsl-1.2', 'nawl-1.2', 'tsl-1.2', 'bsl-1.20', 'cefrj-1.6', 'original'}]
    extra = [w for w in ordered if w not in core]
    selected = sorted(core + extra[:max(0, args.target - len(core))], key=lambda w: (w['rank'] is None, w['rank'] or 0, w['lemma']))
    for item in selected:
        if 'spelling_variants' in item:
            item['spelling_variants'] = sorted(item['spelling_variants'])
        item['pos_candidates'] = sorted(item['pos_candidates'])
        item['lists'] = sorted(item['lists'])
        if item['cefr'] is None and item['rank'] is not None:
            r = item['rank']
            item['cefr'] = 'A1' if r <= 1000 else 'A2' if r <= 2000 else 'B1' if r <= 4000 else 'B2' if r <= 7000 else 'C1'
        item['source'] = 'wordfreq' if 'wordfreq' in item['lists'] else item['lists'][0]
    data = ('[\n' + ',\n'.join(json.dumps(w, ensure_ascii=False, separators=(',', ':')) for w in selected) + '\n]\n').encode()
    if len(data) > 2_000_000:
        raise RuntimeError(f'Headwords exceed 2 MB: {len(data)} bytes; do not silently violate plan')
    atomic(Path(args.output), data)
    report = {'lemmas': len(selected), 'target': args.target, 'target_met': len(selected) >= args.target,
              'bytes': len(data), 'existing_local_rows_scanned': existing_count, 'remote_baseline_rows_reported_by_user': 1553,
              'cefrj': sum('cefrj-1.6' in w['lists'] for w in selected),
              'cefr_estimated': sum('cefrj-1.6' not in w['lists'] and w['cefr'] is not None for w in selected),
              'no_rank': sum(w['rank'] is None for w in selected), 'no_pos': sum(not w['pos_candidates'] for w in selected),
              'by_list': dict(collections.Counter(k for w in selected for k in w['lists'])),
              'by_cefr': dict(collections.Counter(w['cefr'] for w in selected)),
              'inflection_corrections': corrections,
              'spelling_pairs': len(spellings),
              'notes': ['CEFR without cefrj-1.6 membership is rank-estimated, not certified.',
                        'Case-sensitive dictionary and verified teaching headwords only; no suffix-only lemmatization.',
                        'Editorial blocklist/tag checks are not complete human moderation.',
                        'Definitions/examples/audio are not generated by this stage.']}
    write_json(Path(args.report), report)
    print(json.dumps(report, indent=2))
    if len(selected) < args.target:
        raise SystemExit('Coverage below requested target; partial real list saved, no fabricated padding.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', type=int, default=10500)
    parser.add_argument('--top', type=int, default=20000, help='Maximum raw wordfreq rank for supplemental dictionary lemmas')
    parser.add_argument('--output', default=str(ROOT / 'content/vocab/headwords.json'))
    parser.add_argument('--report', default=str(ROOT / 'scripts/vocab/coverage-wordlist.json'))
    parser.add_argument('--exclude', help='UTF-8 one-word-per-line editorial exclusions')
    args = parser.parse_args()
    if args.target < 1 or args.top < 1:
        parser.error('target/top must be positive')
    build(args)


if __name__ == '__main__':
    main()
