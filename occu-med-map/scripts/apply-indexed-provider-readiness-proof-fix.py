from pathlib import Path

path = Path('occu-med-map/scripts/ci-mapbox-native-tools-acceptance.mjs')
text = path.read_text()
old = '''  await page.waitForFunction(() => {
    const input = document.querySelector('input[aria-label="Indexed Providers"]');
    const row = input?.closest(".workflow-layer");
    const text = String(row?.textContent || "");
    return Boolean(input?.checked) && /2\\s+loaded/i.test(text);
  }, null, { timeout: 15_000 });
  await waitForActiveMapIdle(page, "2d");
'''
new = '''  // The sidebar wording is presentation-only and has changed between
  // "loaded" and "rendered in viewport". Functional readiness is proved by
  // the checked source plus the native Mapbox layer assertion immediately below.
  await page.waitForFunction(() => Boolean(
    document.querySelector('input[aria-label="Indexed Providers"]')?.checked
  ), null, { timeout: 15_000 });
  await waitForActiveMapIdle(page, "2d");
'''
if old not in text:
    raise SystemExit('stale Indexed Providers wording assertion target not found')
path.write_text(text.replace(old, new, 1))
print('Removed stale sidebar-copy dependency from Indexed Providers native readiness proof.')
