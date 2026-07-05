import assert from 'node:assert/strict';
import { classifyProvider } from '../src/lib/providerClassifier';

assert.equal(classifyProvider({ name: 'AFC Urgent Care' }), 'urgentCare');
assert.equal(classifyProvider({ services: ['Audiogram testing'] }), 'audiogram');

console.log('provider explorer smoke tests passed');
