import type { APIRoute } from 'astro';
import { decideHeuresSup } from '@emela/shared/rh-data';

export const prerender = false;

/** Validation/refus d'une saisie d'heures supplémentaires (autorisation + SoD back). */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corps de requête invalide.' }, 400);
  }
  if (!body?.name || typeof body.approve !== 'boolean') {
    return json({ error: 'name et approve (booléen) sont requis.' }, 400);
  }
  try {
    return json(await decideHeuresSup(String(body.name), body.approve), 200);
  } catch (e) {
    console.error('[api/validations/heures-sup]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec de la validation.' }, denied ? 403 : 400);
  }
};

const json = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
