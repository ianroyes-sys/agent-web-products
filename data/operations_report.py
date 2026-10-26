#!/usr/bin/env python3
"""Read-only snapshot verification and private report exports for Omega."""
import argparse
from datetime import date, datetime, timezone
from decimal import Decimal
import hashlib
import importlib.util
import json
from pathlib import Path
import runpy

HERE = Path(__file__).resolve().parent
SOURCE_FILES = ('meta.json', 'firms.json', 'recompetes.json', 'naics.json', 'agencies.json')
MAX_AGE_DAYS = 7


def snapshot_issues(data, today):
    """Check recorded snapshot consistency, never infer live awards or revenue."""
    meta, firms, rows = data['meta.json'], data['firms.json'], data['recompetes.json']
    issues = []
    generated = date.fromisoformat(meta['generated'])
    age = (today - generated).days
    if age < 0:
        issues.append('Source generation date is in the future.')
    elif age > MAX_AGE_DAYS:
        issues.append(f'Source is {age} days old; the operational freshness bound is {MAX_AGE_DAYS} days. Refresh and reverify before describing this as current.')
    for filename in SOURCE_FILES[1:]:
        if not isinstance(data[filename], list) or not all(isinstance(row, dict) for row in data[filename]):
            raise ValueError(f'{filename} is not a table of records.')
    if len(firms) != meta['firm_count'] or len(rows) != meta['recompete_count']:
        issues.append('Metadata counts do not match source rows.')
    if len({f['id'] for f in firms}) != len(firms):
        issues.append('Duplicate firm identifiers.')
    if len({(r['award_id'], r['incumbent_key'], r['url']) for r in rows}) != len(rows):
        issues.append('Duplicate award records.')
    keys = {f['key'] for f in firms}
    invalid_dates = 0
    invalid_values = 0
    for row in rows:
        if row['incumbent_key'] not in keys:
            issues.append('Award record references an unknown firm.'); break
    for row in rows:
        if (date.fromisoformat(row['end_date']) - generated).days != row['days_out']:
            invalid_dates += 1
        value = Decimal(str(row['value']))
        if not value.is_finite() or value < 0:
            invalid_values += 1
    if invalid_dates:
        issues.append(f'{invalid_dates} award date offsets do not reconcile to the generation date.')
    if invalid_values:
        issues.append(f'{invalid_values} award values are invalid.')
    for table, field, aggregate in ((firms, 'total_value', 'market_value'), (rows, 'value', 'recompete_value')):
        total = sum((Decimal(str(row[field])) for row in table), Decimal(0))
        expected = Decimal(str(meta[aggregate]))
        if not total.is_finite() or not expected.is_finite() or abs(total - expected) > Decimal('.05'):
            issues.append(f'{aggregate} does not reconcile to source rows.')
    if sum(f['award_count'] for f in firms) != meta['raw_awards']:
        issues.append('Firm award counts do not reconcile to raw award count.')
    return issues, age


def tables_only(markdown):
    """Reuse existing generator tables while omitting its sales interpretation."""
    result = []
    previous_table = False
    for line in markdown.splitlines():
        if line.startswith('|'):
            if not previous_table and result:
                result.append('')
            result.append(line)
            previous_table = True
        else:
            previous_table = False
    return '\n'.join(result) + '\n'


def create_report(output, today=None):
    today = today or datetime.now(timezone.utc).date()
    source = HERE / 'out'
    raw = {name: (source / name).read_bytes() for name in SOURCE_FILES}
    data = {name: json.loads(content) for name, content in raw.items()}
    hashes = {name: hashlib.sha256(content).hexdigest() for name, content in raw.items()}
    issues, age = snapshot_issues(data, today)
    # Existing verifier is imported without __main__: reads claims, never sends or
    # emits its historical "Safe to send" message. Its fixed marketing claims are
    # additional checks; they do not establish current source freshness.
    checked = 0
    failed_claims = []
    try:
        verifier = runpy.run_path(str(HERE / 'verify.py'))
        for label, actual, expected, tolerance in verifier['CLAIMS']:
            checked += 1
            valid = actual == expected if tolerance == 0 else expected != 0 and abs(actual - expected) / abs(expected) <= tolerance
            if not valid:
                failed_claims.append(label)
        if failed_claims:
            issues.append(f'{len(failed_claims)} existing published-claim checks failed; revise the old sales material before reuse.')
    except Exception as error:
        issues.append(f'Existing claim verifier could not complete: {type(error).__name__}.')
    if any(hashlib.sha256((source / name).read_bytes()).hexdigest() != hashes[name] for name in SOURCE_FILES):
        raise ValueError('Source changed during verification; rerun against one stable snapshot.')
    spec = importlib.util.spec_from_file_location('arsenal_report_generator', HERE / 'reports/generate.py')
    generator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator)
    meta = data['meta.json']
    exports = {
        'snapshot-expiry-records-180d.md': generator.recompete_radar(meta, data['recompetes.json'], days=180),
        'snapshot-small-firm-records.md': generator.prospect_list(meta, data['firms.json']),
        'snapshot-agency-capability-records.md': generator.agency_map(meta, data['agencies.json'], data['naics.json']),
    }
    report = {
        'schemaVersion': 1, 'businessId': 'arsenal-index',
        'status': 'needs_review' if issues else 'ready',
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'sourceGenerated': meta['generated'], 'sourceAgeDays': age,
        'freshnessBoundDays': MAX_AGE_DAYS, 'issues': issues,
        'summary': f"Verified local snapshot dated {meta['generated']}: {len(data['firms.json'])} firm rows and {len(data['recompetes.json'])} recorded expiry rows. No live source refresh or customer delivery performed.",
        'counts': {'firms': len(data['firms.json']), 'recordedExpiryRows': len(data['recompetes.json']), 'rawAwards': meta['raw_awards']},
        'publishedClaimChecks': {'checked': checked, 'failed': failed_claims},
        'sourceHashes': hashes, 'artifacts': list(exports),
        'limitations': [
            'Snapshot is a value-sorted, capped pull of public prime-award records; it is not full market coverage.',
            'Award values are recorded contract values, not revenue, payment, or guaranteed spend.',
            'Recorded end dates and historical days-out fields are not confirmed procurement openings or bid deadlines.',
            'No network refresh, source-authority revalidation, outreach, payment or publication occurred.',
            'Exports reuse existing bounded tables (60 expiry rows, 75 small-firm rows, 15 agencies and 20 capability codes). They are historical excerpts, not exhaustive lists.',
        ],
    }
    output = Path(output)
    if not output.is_absolute():
        raise ValueError('Output must be an absolute new directory.')
    output.mkdir(mode=0o700, parents=False, exist_ok=False)
    (output / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
    (output / 'report.md').write_text('# Arsenal Index snapshot operations\n\n' + report['summary'] + '\n\nStatus: ' + report['status'] + '\n\n' + '\n'.join('- ' + text for text in issues + report['limitations']) + '\n', encoding='utf8')
    preface = f"# Historical Arsenal Index table export\n\nSource snapshot: {meta['generated']}. Verification date: {today.isoformat()}. Status: {report['status']}.\n\nDays and expiry categories are relative to the source snapshot date, not today. Values are recorded award values, not revenue or guaranteed competitions. This is a truncated historical excerpt requiring source review before customer use.\n\n"
    for name, content in exports.items():
        (output / name).write_text(preface + tables_only(content), encoding='utf8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    try:
        result = create_report(args.out)
        print(json.dumps({'status': result['status'], 'outputDirectory': args.out, 'counts': result['counts']}))
        raise SystemExit(0 if result['status'] == 'ready' else 2)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f'Operations report failed: {error}\n')
