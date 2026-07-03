import type { APIRoute } from 'astro';
import { setBeneficiaireStatut } from '@emela/shared/rh-data';

export const prerender = false;

const STATUTS = new Set(['Actif', 'Archive']);

/** Archivage / réactivation d'un bénéficiaire externe = bascule du cycle de vie RH
 *  local `statut_beneficiaire` (Actif ⇄ Archive) via REST + CSRF. PAS de suppression
 *  (DocPerm delete=0 pour HR User) et PAS un statut d'accès (frontière O2, DEC-40).
 *  Le back reste l'autorité (DocPerm write). */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!cookies.get('sid')?.value) return json({ error: 'Non authentifié.' }, 401);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }

  if (!body?.name) return json({ error: 'name est requis.' }, 400);
  if (!STATUTS.has(body?.statut_beneficiaire)) return json({ error: 'Statut invalide.' }, 400);

  try {
    const res = await setBeneficiaireStatut(String(body.name), body.statut_beneficiaire as 'Actif' | 'Archive');
    return json(res, 200);
  } catch (e) {
    console.error('[api/beneficiaires/archive]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec de la mise à jour du statut.' }, denied ? 403 : 400);
  }
};

const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
