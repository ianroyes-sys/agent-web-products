import copy
from datetime import date
import unittest
from operations_report import snapshot_issues, tables_only


class SnapshotTest(unittest.TestCase):
    def setUp(self):
        self.data = {
            'meta.json': {'generated': '2026-09-14', 'firm_count': 1, 'recompete_count': 1, 'market_value': 10, 'recompete_value': 10, 'raw_awards': 1},
            'firms.json': [{'id': 'sample', 'key': 'SAMPLE', 'total_value': 10, 'award_count': 1}],
            'recompetes.json': [{'award_id': 'a1', 'incumbent_key': 'SAMPLE', 'url': 'https://example.com/award/a1', 'value': 10, 'end_date': '2026-09-15', 'days_out': 1}],
            'agencies.json': [], 'naics.json': [],
        }

    def test_fresh_and_stale_are_distinct(self):
        self.assertEqual(snapshot_issues(self.data, date(2026, 9, 14)), ([], 0))
        issues, age = snapshot_issues(self.data, date(2026, 9, 29))
        self.assertEqual(age, 15)
        self.assertIn('15 days old', issues[0])

    def test_duplicate_and_date_corruption_are_visible(self):
        data = copy.deepcopy(self.data)
        data['recompetes.json'].append(dict(data['recompetes.json'][0]))
        data['recompetes.json'][0]['days_out'] = 5
        issues, _ = snapshot_issues(data, date(2026, 9, 14))
        self.assertTrue(any('Duplicate award' in issue for issue in issues))
        self.assertTrue(any('date offsets' in issue for issue in issues))
        self.assertTrue(any('recompete_value' in issue for issue in issues))

    def test_exports_do_not_repeat_generator_sales_claims(self):
        self.assertEqual(tables_only('Guaranteed upcoming work\n| Firm |\n|---|\n| Example |\nBuy now'), '| Firm |\n|---|\n| Example |\n')


if __name__ == '__main__':
    unittest.main()
