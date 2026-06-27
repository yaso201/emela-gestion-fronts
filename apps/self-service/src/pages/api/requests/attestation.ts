import type { APIRoute } from 'astro';
import { createAttestation } from '@emela/shared/data';

export const prerender = false;

const TYPES = new Set(['Travail', 'Assiduite', 'Mission enseignement']);

/** Demande d'attestation par le salarié connecté (employee résolu serveur). */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corps de requête invalide.' }, 400);
  }
  if (!TYPES.has(body?.attestation_type)) {
    return json({ error: "Type d'attestation invalide." }, 400);
  }
  try {
    const res = await createAttestation({
      attestation_type: String(body.attestation_type),
      reason: body.reason ? String(body.reason) : undefined,
    });
    return json(res, 200);
  } catch (e) {
    console.error('[api/requests/attestation]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : "Échec de la demande d'attestation." }, denied ? 403 : 400);
  }
};

const json = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
