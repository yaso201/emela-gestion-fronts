import type { APIRoute } from 'astro';
import { decideFacture } from '@emela/shared/rh-data';

export const prerender = false;

/** Validation (→ « A transmettre ») ou rejet d'une facture externe (DEC-38).
 *  Le back gate le rôle (HR_APPROVER_ROLES) + la séparation des tâches dans le
 *  contrôleur (jamais sa propre facture) ; ici on ne fait que relayer la session. */
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
    const res = await decideFacture(String(body.name), body.approve);
    return json(res, 200);
  } catch (e) {
    console.error('[api/factures/decision]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec de la validation.' }, denied ? 403 : 400);
  }
};

const json = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
