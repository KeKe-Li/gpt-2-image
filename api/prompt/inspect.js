import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js';

const MAX_PROMPT_LENGTH = 8000;
const TYPE_SAFE_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

function configured() {
  return Boolean(String(process.env.TYPESAFE_API_KEY || '').trim());
}

export function buildInspectionRequest(prompt) {
  return {
    state: { prompt },
    model: 'jev-latest',
    questions: {
      category: {
        type: 'choice',
        instructions: 'Which visual direction best describes this image prompt?',
        criteria: {
          poster: 'Poster, typography, editorial layout, or graphic design',
          product: 'Product, packaging, branding, or commercial object',
          photo: 'Photography, portrait, documentary, or photorealistic scene',
          illustration: 'Illustration, concept art, 3D art, or painterly artwork',
          space: 'Architecture, interior, landscape, or spatial design',
          narrative: 'Character, story, historical, or cinematic scene',
          other: 'Does not clearly fit the categories above'
        }
      },
      completeness: {
        type: 'score',
        instructions: 'How complete and actionable is this image prompt for a generation model?',
        criteria: [
          'Vague idea with little usable visual direction',
          'Has a subject and some style or setting, but important controls are missing',
          'Clearly describes subject, composition, style, and key visual constraints',
          'Production-ready brief with precise subject, composition, materials, lighting, and output constraints'
        ]
      },
      needs_reference: {
        type: 'noul',
        instructions: 'Would a reference image materially improve the result described by this prompt?',
        criteria: {
          true: 'The prompt depends on preserving a person, product, layout, or visual identity',
          false: 'The prompt can be fulfilled from text alone'
        }
      }
    }
  };
}

function normalizeInspection(body) {
  const answers = body?.answers || {};
  const category = answers.category?.choice || 'other';
  const completeness = answers.completeness?.score;
  const completenessConfidence = answers.completeness?.confidence;
  const referenceProbability = Number(answers.needs_reference?.noul);
  return {
    category,
    completeness: Number.isFinite(Number(completeness)) ? Number(completeness) : null,
    completenessConfidence: Number.isFinite(Number(completenessConfidence)) ? Number(completenessConfidence) : null,
    needsReference: Number.isFinite(referenceProbability) ? referenceProbability >= 0.6 : null
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
  if (!configured()) return json(res, 503, { ok: false, error: 'INSPECTION_NOT_CONFIGURED' });

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'INVALID_PROMPT' });
  }
  const prompt = String(body?.prompt || '').trim();
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    return json(res, 400, { ok: false, error: 'INVALID_PROMPT' });
  }

  try {
    const response = await fetch(TYPE_SAFE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(buildInspectionRequest(prompt))
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('TypeSafe prompt inspection failed', { status: response.status });
      return json(res, 502, { ok: false, error: 'INSPECTION_FAILED' });
    }
    return json(res, 200, { ok: true, inspection: normalizeInspection(payload) });
  } catch (error) {
    console.warn('TypeSafe prompt inspection unavailable', { message: String(error?.message || 'unknown').slice(0, 200) });
    return json(res, 502, { ok: false, error: 'INSPECTION_FAILED' });
  }
}

export { MAX_PROMPT_LENGTH, normalizeInspection };
