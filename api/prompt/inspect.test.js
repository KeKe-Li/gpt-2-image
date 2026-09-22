import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInspectionRequest, normalizeInspection } from './inspect.js';

test('TypeSafe inspection request keeps questions narrow and typed', () => {
  const request = buildInspectionRequest('a product photo');
  assert.equal(request.model, 'jev-latest');
  assert.equal(request.questions.category.type, 'choice');
  assert.equal(request.questions.completeness.type, 'score');
  assert.equal(request.questions.needs_reference.type, 'noul');
});

test('inspection answers normalize missing or malformed values safely', () => {
  assert.deepEqual(normalizeInspection({ answers: {
    category: { choice: 'product' },
    completeness: { score: 3, confidence: 0.8 },
    needs_reference: { noul: 0.75 }
  }}), {
    category: 'product', completeness: 3, completenessConfidence: 0.8, needsReference: true
  });
  assert.deepEqual(normalizeInspection({}), {
    category: 'other', completeness: null, completenessConfidence: null, needsReference: null
  });
});
