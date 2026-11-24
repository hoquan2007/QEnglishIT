import importlib.util
import json
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))


def module(filename):
    spec = importlib.util.spec_from_file_location(filename, HERE / filename)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


build = module('build-wordlist.py')
ipa = module('enrich-ipa.py')
curated = module('compile-curated.py')


class PipelineTest(unittest.TestCase):
    def test_actual_headword_contract(self):
        path = build.ROOT / 'content/vocab/headwords.json'
        rows = json.loads(path.read_text(encoding='utf-8'))
        self.assertGreaterEqual(len(rows), 10500)
        self.assertLessEqual(path.stat().st_size, 2_000_000)
        words = {r['lemma'] for r in rows}
        self.assertEqual(len(words), len(rows))
        self.assertTrue(all(build.eligible(w) and build.normalize(w) == w for w in words))
        self.assertNotIn('founds', words)
        self.assertNotIn('colour', words)
        self.assertNotIn('criticise', words)
        self.assertIn('color', words)
        self.assertIn('criticize', words)
        self.assertTrue(all(not {'meaning_vi', 'definition_en', 'examples'} & set(r) for r in rows))

    def test_source_evidence_and_real_notices(self):
        sources = json.loads((build.ROOT / 'content/sources/sources.json').read_text(encoding='utf-8'))
        self.assertEqual(sources[0]['key'], 'original')
        by_key = {s['key']: s for s in sources}
        self.assertIn('GPL-3.0', by_key['ipa-dict-uk']['license'])
        self.assertIn('Robyn Speer', by_key['wordfreq']['attribution'])
        for path in (HERE / 'notices').glob('*'):
            text = path.read_text(encoding='utf-8')
            self.assertNotIn('<!doctype html', text.lower())
            self.assertNotIn('<html', text.lower())

    def test_actual_ipa_manifest_counts_and_hashes(self):
        report = json.loads((HERE / 'coverage-ipa.json').read_text(encoding='utf-8'))
        heads = json.loads((build.ROOT / 'content/vocab/headwords.json').read_text(encoding='utf-8'))
        words = {w['lemma'] for w in heads}
        covered = {'us': set(), 'uk': set()}
        self.assertEqual(report['input_sha256'], build.digest((build.ROOT / 'content/vocab/headwords.json').read_bytes()))
        for batch in report['batches']:
            path = HERE / 'ipa' / batch['file']
            self.assertEqual(build.digest(path.read_bytes()), batch['sha256'])
            rows = json.loads(path.read_text(encoding='utf-8'))
            self.assertEqual(len(rows), batch['rows'])
            self.assertLessEqual(len(rows), 500)
            for row in rows:
                dialect = batch['dialect']
                self.assertTrue(ipa.valid_ipa(row['ipa_' + dialect]))
                self.assertFalse(row['reviewed'])
                self.assertEqual(row['source'], batch['source'])
                self.assertIn(row['lemma'], words)
                self.assertNotIn(row['lemma'], covered[dialect])
                covered[dialect].add(row['lemma'])
        for dialect in covered:
            self.assertEqual(len(covered[dialect]), report['counts'][dialect])
            self.assertEqual(words - covered[dialect], set(report['missing'][dialect]))
        self.assertEqual(len(covered['us'] & covered['uk']), report['both'])
        self.assertFalse(report['complete'])

    def test_conversion_no_unknown_phonemes_or_fake_stress(self):
        self.assertEqual(ipa.convert_arpabet(['AH0']), '/ə/')
        self.assertEqual(ipa.convert_arpabet(['B', 'AE1', 'T']), '/bˈæt/')
        with self.assertRaises(ValueError):
            ipa.convert_arpabet(['UNKNOWN'])
        self.assertFalse(ipa.valid_ipa('/AE1/'))

    def test_spelling_pairs_backed_by_sources(self):
        records = build.spelling_records()
        self.assertEqual(records['criticise']['canonical'], 'criticize')
        self.assertEqual(records['ageing']['canonical'], 'aging')
        self.assertEqual(records['programer']['canonical'], 'programmer')
        self.assertNotIn('shorts', records)
        self.assertNotIn('savings', records)

    def test_uk_variant_requires_explicit_source_evidence(self):
        tagged = {'furore': {'uk': ['/fjʊəˈrɔːri/']}}
        variants, spelling = ipa.tagged_uk_spelling_variant(
            'furor', tagged, {'furore': 'furor'}
        )
        self.assertEqual(variants, ['/fjʊəˈrɔːri/'])
        self.assertEqual(spelling, 'furore')
        self.assertEqual(ipa.tagged_uk_spelling_variant('furor', tagged, {}), ([], None))
        self.assertEqual(ipa.tagged_uk_spelling_variant('furor', {'furore': {'us': ['/x/']}},
                                                       {'furore': 'furor'}), ([], None))

    def test_curated_word_batch_has_verifiable_ipa_and_original_examples(self):
        payload, _ = curated.compile_batch(curated.DEFAULT_CURATED, curated.DEFAULT_OUTPUT)
        self.assertEqual(payload, curated.DEFAULT_OUTPUT.read_bytes())
        rows = json.loads(payload)
        self.assertGreaterEqual(len(rows), 30)
        self.assertEqual(len({row['lemma'] for row in rows}), len(rows))
        for row in rows:
            self.assertEqual(row['word'], row['lemma'])
            self.assertEqual(row['ipa'], row['ipa_us'])
            self.assertFalse(row['reviewed'])
            self.assertEqual(row['source'], 'original')
            self.assertEqual(len(row['examples']), 2)
            for example in row['examples']:
                self.assertEqual(example['source'], 'original')
                self.assertTrue(example['en'].strip())
                self.assertTrue(example['vi'].strip())
            for dialect in ('us', 'uk'):
                self.assertTrue(ipa.valid_ipa(row['ipa_' + dialect]))
                provenance = row['ipa_provenance'][dialect]
                self.assertIn('source', provenance)
                self.assertIn('license', provenance)
                self.assertIn('batch_file', provenance)
                self.assertEqual(len(provenance['batch_sha256']), 64)
            if row['ipa_provenance']['uk']['source'] == 'ipa-dict-uk':
                self.assertIn('GPL-3.0', row['ipa_provenance']['uk']['license'])


if __name__ == '__main__':
    unittest.main()
