import type { APIRoute } from 'astro';
import { transmettreFacture } from '@emela/shared/rh-data';

export const prerender = false;

/** Transmission d'une facture « A transmettre » vers UF (DEC-38). Le back crée
 *  la Purchase Invoice en BROUILLON et s'arrête (STOP avant paiement) ; en cas
 *  d'échec/UF indisponible il renvoie ok:false et la facture reste rejouable —
 *  on relaie tel quel pour que l'UI affiche la dégradation propre. */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corps de requête invalide.' }, 400);
  }
  if (!body?.name) return json({ error: 'name est requis.' }, 400);
  try {
    const res = await transmettreFacture(String(body.name));
    return json(res, 200);
  } catch (e) {
    console.error('[api/factures/transmission]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec de la transmission.' }, denied ? 403 : 400);
  }
};

const json = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
