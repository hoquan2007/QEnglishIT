"""Verified public linguistic downloads. Python stdlib only; no package installation.

Run from any directory. License pages are fetched and checked BEFORE dataset requests.
Receipts bind cached bytes to SHA256 and URL. Interrupted transfers resume only with
the same ETag/Last-Modified validator; servers ignoring Range trigger a clean restart.
"""
import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CACHE = HERE / '.cache'
NOTICES = HERE / 'notices'
REGISTRY = ROOT / 'content/sources/sources.json'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.tmp')
    tmp.write_bytes(data)
    os.replace(tmp, path)


def write_json(path, value):
    atomic(path, (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode())


def request(url, headers=None):
    return urllib.request.urlopen(urllib.request.Request(url, headers={
        'User-Agent': 'QEnglishIT-vocab/1.0 (public linguistic data)', **(headers or {})
    }), timeout=90)


def read(url):
    for attempt in range(3):
        try:
            with request(url) as response:
                return response.read()
        except (OSError, urllib.error.URLError):
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def github(repo):
    # Freeze dataset and notices to the same public upstream commit.
    # Reuse previously verified pins on later runs; avoid moving HEAD/API calls.
    if REGISTRY.exists():
        import re
        for source in json.loads(REGISTRY.read_text(encoding='utf-8-sig')):
            if source.get('url') == f'https://github.com/{repo}' and source.get('revision'):
                commit = source['revision']
                return f'https://raw.githubusercontent.com/{repo}/{commit}', commit
            for evidence in source.get('license_evidence', []):
                match = re.fullmatch(re.escape(f'https://raw.githubusercontent.com/{repo}/') + r'([0-9a-f]{40})/.*', evidence['url'])
                if match:
                    return f'https://raw.githubusercontent.com/{repo}/{match[1]}', match[1]
    commit = json.loads(read(f'https://api.github.com/repos/{repo}/commits/HEAD'))['sha']
    return f'https://raw.githubusercontent.com/{repo}/{commit}', commit


def verified(key, title, url, license_name, attribution, notes, evidence):
    records = []
    for index, (page, required) in enumerate(evidence):
        data = read(page)
        text = data.decode('utf-8')
        for phrase in required:
            if phrase not in text:
                raise RuntimeError(f'{key}: license evidence changed/missing {phrase!r}: {page}')
        # Website/README evidence is cached, never distributed as a license notice.
        is_license = page.rsplit('/', 1)[-1] in {'LICENSE', 'LICENSE.txt', 'COPYING', 'NOTICE.md', 'CREDITS'}
        path = (NOTICES if is_license else CACHE / 'evidence') / f'{key}-{index + 1}.txt'
        atomic(path, data)
        records.append({'url': page, 'sha256': digest(data),
                        'notice_path': path.relative_to(ROOT).as_posix()})
    return {'key': key, 'title': title, 'url': url, 'license': license_name,
            'attribution': attribution, 'notes': notes,
            'verified_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'license_evidence': records}


def download(url, name):
    path = CACHE / name
    receipt = CACHE / (name + '.receipt.json')
    if path.exists() and receipt.exists():
        prior = json.loads(receipt.read_text(encoding='utf-8'))
        if prior['url'] == url and digest(path.read_bytes()) == prior['sha256']:
            print(f'cached {name}', flush=True)
            return prior
    part = path.with_name(path.name + '.part')
    state = path.with_name(path.name + '.part.json')
    for attempt in range(3):
        try:
            offset = part.stat().st_size if part.exists() else 0
            previous = json.loads(state.read_text()) if state.exists() else {}
            validator = previous.get('validator') if previous.get('url') == url else None
            headers = {'Range': f'bytes={offset}-', 'If-Range': validator} if offset and validator else {}
            with request(url, headers) as response:
                append = response.status == 206 and bool(headers)
                if append and not response.headers.get('Content-Range', '').startswith(f'bytes {offset}-'):
                    raise RuntimeError('Invalid Content-Range')
                write_json(state, {'url': url, 'validator': response.headers.get('ETag') or response.headers.get('Last-Modified')})
                received = 0
                with part.open('ab' if append else 'wb') as out:
                    while chunk := response.read(1024 * 1024):
                        out.write(chunk)
                        received += len(chunk)
                expected = response.headers.get('Content-Length')
                if expected and received != int(expected):
                    raise RuntimeError(f'{name}: incomplete transfer')
            os.replace(part, path)
            record = {'url': url, 'sha256': digest(path.read_bytes()), 'bytes': path.stat().st_size, 'file': name}
            write_json(receipt, record)
            state.unlink(missing_ok=True)
            print(f'downloaded {name}: {record["bytes"]} bytes', flush=True)
            return record
        except (OSError, RuntimeError, urllib.error.URLError):
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only', help='Comma-separated source keys; default all')
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    sources = []
    choices = set(args.only.split(',')) if args.only else None

    def add(key, title, url, license_name, attribution, notes, evidence, files, revision=None):
        if choices and key not in choices:
            return
        entry = verified(key, title, url, license_name, attribution, notes, evidence)
        entry['downloads'] = [download(link, name) for link, name in files]
        if revision:
            entry['revision'] = revision
        sources.append(entry)

    for key, slug, filename, authors in [
        ('ngsl-1.2', 'new-general-service-list', 'NGSL_12', 'Browne, C., Culligan, B., and Phillips, J.'),
        ('nawl-1.2', 'new-academic-word-list', 'NAWL_12', 'Browne, C., Culligan, B., and Phillips, J.'),
        ('tsl-1.2', 'toeic-service-list', 'TSL_12', 'Browne, C. and Culligan, B.'),
        ('bsl-1.20', 'business-service-list', 'BSL_120', 'Browne, C. and Culligan, B.'),
    ]:
        page = 'https://www.newgeneralservicelist.com/' + slug
        add(key, slug.replace('-', ' ').title(), page, 'CC BY-SA 4.0', authors,
            'Headwords and inflection mappings adapted from teaching CSV; retain attribution and CC BY-SA 4.0 for derived list data.',
            [(page, ['Creative Commons Attribution-ShareAlike 4.0 International License'])],
            [('https://www.newgeneralservicelist.com/s/' + filename + '_lemmatized_for_teaching.csv', key + '.csv')])

    if not choices or 'wordfreq' in choices:
        base, rev = github('rspeer/wordfreq')
        add('wordfreq', 'wordfreq English frequency data', 'https://github.com/rspeer/wordfreq', 'CC BY-SA 4.0 (data); Apache-2.0 (code)',
            'Robyn Speer; SUBTLEX authors Marc Brysbaert et al. (freely available data); OpenSubtitles; Google Books Ngram Viewer; Leeds Internet Corpus; Wikipedia; ParaCrawl.',
            'Derived ranks/list data remain CC BY-SA 4.0. Full upstream attribution retained in notices/wordfreq-2.txt. Original rank is the position in flattened cB buckets, not a CEFR certification.',
            [(base + '/LICENSE.txt', ['Apache License', 'code only']), (base + '/NOTICE.md', ['Attribution-ShareAlike 4.0', 'SUBTLEX authors'])],
            [(base + '/wordfreq/data/large_en.msgpack.gz', 'wordfreq-en.msgpack.gz')], rev)
    if not choices or 'kaikki-simple' in choices:
        add('kaikki-simple', 'Simple English Wiktionary via Kaikki / Wiktextract', 'https://kaikki.org/dictionary/rawdata.html',
            'CC-BY-SA and GFDL (versions not stated on Kaikki license page)',
            'Simple English Wiktionary contributors; extraction by Tatu Ylonen / Wiktextract and Kaikki.org.',
            'Only lemma/POS/form/label metadata used; no copied definitions/examples. Per-word attribution: https://simple.wiktionary.org/wiki/<lemma> and its page history. Kaikki explicitly retains Wiktionary licenses; do not relabel as MIT or invent a version. Redistribution must retain applicable upstream share-alike terms.',
            [('https://kaikki.org/dictionary/', ['same licenses as Wiktionary', 'CC-BY-SA and GFDL'])],
            [('https://kaikki.org/dictionary/downloads/simple/simple-extract.jsonl.gz', 'kaikki-simple.jsonl.gz')])
    if not choices or 'cefrj-1.6' in choices:
        page = 'https://www.cefr-j.org/download.html'
        add('cefrj-1.6', 'CEFR-J Wordlist Version 1.6', page, 'TUFS Tono Laboratory terms: free research/educational/commercial use with citation',
            'The CEFR-J Wordlist Version 1.6. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Retrieved from https://www.cefr-j.org/download.html on ' + time.strftime('%Y-%m-%d') + '.',
            'Not a Creative Commons license. Full terms archived; preserve citation. Commercial supervision/consultation is separately chargeable. A1/A2 subdivisions collapsed to their major level.',
            [(page, ['The copyright of this wordlist belongs to Tono Laboratory at TUFS', 'research and commercial'])],
            [('https://www.cefr-j.org/data/CEFRJ_wordlist_ver1.6.zip', 'cefrj-1.6.zip')])
    if not choices or 'ipa-dict-us' in choices or 'ipa-dict-uk' in choices:
        base, rev = github('open-dict-data/ipa-dict')
        ling, _ = github('lingz/cmudict-ipa')
        uk, _ = github('leoboiko/ipacards')
        for key, dialect, license_name, attribution, evidence in [
            ('ipa-dict-us', 'en_US', 'MIT; CMUdict BSD-style notice retained', 'dohliam; Lingliang Zhang; Carnegie Mellon University; Kyle Gorman (syllabify).',
             [(base + '/LICENSE', ['MIT License']), (base + '/README.md', ['third-party datasets retain their original licenses', 'English (US)']), (ling + '/LICENSE', ['Copyright (c) 2016 Lingliang Zhang'])]),
            ('ipa-dict-uk', 'en_UK', 'GPL-3.0 (ipacards-derived data)', 'dohliam; Leonardo Boiko / ipacards contributors.',
             [(base + '/README.md', ['English (UK) IPA data derived from', 'GPL 3.0', 'third-party datasets retain their original licenses']), (uk + '/LICENSE', ['GNU GENERAL PUBLIC LICENSE', 'Version 3, 29 June 2007']),
              (uk + '/CREDITS', ['Espeak', 'Sublex-UK']), (uk + '/deck_description.md', ['Espeak (IPA transcriptions)', 'automatically generated'])]),
        ]:
            add(key, 'ipa-dict ' + dialect, 'https://github.com/open-dict-data/ipa-dict', license_name, attribution,
                'Pronunciation data kept in separate generated IPA batches with per-field provenance. UK is not MIT; retain GPL terms, full license and corresponding source URL. ipacards credits trace UK IPA to eSpeak-generated transcriptions (not a licensed commercial dictionary); automated source, not manually reviewed. Google Translate audio mentioned upstream is NOT downloaded or reused.',
                evidence, [(base + '/data/' + dialect + '.txt', key + '.txt')], rev)
    if not choices or 'cmudict' in choices:
        base, rev = github('cmusphinx/cmudict')
        add('cmudict', 'Carnegie Mellon Pronouncing Dictionary', 'https://github.com/cmusphinx/cmudict', 'BSD-2-Clause-style CMUdict license',
            'Copyright (C) 1993-2015 Carnegie Mellon University. All rights reserved.',
            'Full exact copyright/conditions/disclaimer retained. ARPAbet-to-IPA is a mechanical broad US transcription, not syllabification or UK inference.',
            [(base + '/LICENSE', ['Redistribution and use in source and binary forms', 'Carnegie Mellon University'])],
            [(base + '/cmudict.dict', 'cmudict.dict')], rev)
    prior = json.loads(REGISTRY.read_text(encoding='utf-8-sig')) if REGISTRY.exists() else []
    by_key = {entry['key']: entry for entry in prior}
    by_key.setdefault('original', {'key': 'original', 'title': 'QEnglishIT original content', 'url': None,
                                'license': 'Original (QEnglishIT)', 'attribution': 'QEnglishIT',
                                'notes': 'Original authored content only; this record does not relicense third-party datasets.'})
    for entry in sources:
        by_key[entry['key']] = entry
    write_json(REGISTRY, sorted(by_key.values(), key=lambda entry: (entry['key'] != 'original', entry['key'])))
    print(f'Verified/downloaded {len(sources)} sources; registry merged with existing records.')


if __name__ == '__main__':
    main()
