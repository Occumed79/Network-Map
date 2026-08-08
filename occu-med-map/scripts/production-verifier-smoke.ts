import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, './production-exact-revision-acceptance.mjs'), 'utf8');

assert.match(source, /const deployed = String\(revision \|\| ""\)\.trim\(\);/);
assert.match(source, /if \(deployed\.length < 7\) return false;/, 'empty or tiny revision strings must never match');
assert.match(source, /result\.body && revisionMatches\(result\.body\.revision\)/, 'a parsed JSON body with an explicit revision is required');
assert.match(source, /const contentType = response\.headers\.get\("content-type"\)/, 'endpoint content type must be captured');
assert.match(source, /const text = await response\.text\(\);/, 'raw endpoint response must be retained for diagnostics');
assert.match(source, /JSON\.parse\(text\)/, 'JSON parsing must be explicit and detectable');
assert.match(source, /revision-last-response\.json/, 'failed revision probes must persist evidence');
assert.match(source, /ready\.json/, 'readiness responses must persist evidence');
assert.match(source, /assert\.match\(ready\.contentType, \/application\\\/json\/i/, 'readiness must reject an HTML SPA fallback');
assert.match(source, /ready\.body\?\.ok, true/, 'readiness must require the explicit ready signal');
assert.match(source, /PRODUCTION_REVISION_ATTEMPTS/, 'revision polling must be bounded and configurable');
assert.match(source, /PRODUCTION_REVISION_DELAY_MS/, 'revision polling delay must be configurable');
assert.doesNotMatch(source, /expectedSha\.startsWith\(revision\)/, 'an unguarded empty revision prefix check must never return');

console.log('Production exact-revision verifier hardening smoke passed.');
