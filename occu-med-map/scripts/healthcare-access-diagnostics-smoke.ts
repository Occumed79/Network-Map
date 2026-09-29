import assert from "node:assert/strict";
import { healthcareAccessStateStyle } from "../src/healthcareAccessDiagnostics";

const easy=healthcareAccessStateStyle(1,true,null);
const critical=healthcareAccessStateStyle(5,true,null);
assert.notEqual(easy.fillColor,critical.fillColor,"Easy and Critical states must use different colors");
const matching=healthcareAccessStateStyle(4,true,4);
const filtered=healthcareAccessStateStyle(2,true,4);
assert.ok(matching.fillOpacity>filtered.fillOpacity,"difficulty filter must affect state geography opacity");
assert.ok(matching.lineOpacity>filtered.lineOpacity,"difficulty filter must affect state geography outline");
assert.equal(healthcareAccessStateStyle(null,true,null).fillColor,"#0a1830","missing score must remain neutral");
console.log(JSON.stringify({easy,critical,matching,filtered}));
console.log("Healthcare-access diagnostics behavior passed.");
