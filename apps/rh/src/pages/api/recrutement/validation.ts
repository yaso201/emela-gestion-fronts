import type { APIRoute } from 'astro';
import { decideOnboardingRequest } from '@emela/shared/rh-data';

export const prerender = false;

/** Validation/refus d'une demande (back : Directeur uniquement, validateur ≠ demandeur). */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!cookies.get('sid')?.value) return json({ error: 'Non authentifié.' }, 401);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
  if (!body?.name || typeof body.approve !== 'boolean') return json({ error: 'Demande et décision requises.' }, 400);
  try {
    return json(await decideOnboardingRequest(
      String(body.name), body.approve, body.rejection_reason ? String(body.rejection_reason).trim() : undefined,
    ), 200);
  } catch (e) {
    console.error('[api/recrutement/validation]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé (séparation des tâches).' : 'Échec de la validation.' }, denied ? 403 : 400);
  }
};
const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
