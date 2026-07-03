import type { APIRoute } from 'astro';
import { saveBeneficiaire } from '@emela/shared/rh-data';

export const prerender = false;

const TYPES = new Set(['Vacataire', 'Prestataire']);

/** Création / mise à jour d'un bénéficiaire externe (REST `Beneficiaire Externe` + CSRF).
 *  Le back reste l'autorité : DocPerm (HR User c/w, Director lecture) + validate()
 *  (nom requis ; IFU requis si Prestataire ; composante requise si Vacataire).
 *  Ici on ne fait que relayer avec la session — AUCUNE identité client-fournie,
 *  AUCUN champ d'accès/compte (frontière O2, DEC-40). */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!cookies.get('sid')?.value) return json({ error: 'Non authentifié.' }, 401);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }

  if (!TYPES.has(body?.type_beneficiaire)) return json({ error: 'Type de bénéficiaire invalide.' }, 400);
  if (!String(body?.nom_complet ?? '').trim()) return json({ error: 'Le nom / la raison sociale est requis.' }, 400);

  // Allowlist stricte des champs relayés — jamais statut_beneficiaire à la création
  // (défaut back = Actif), jamais reference_supplier_uf (peuplée par la transmission),
  // jamais un champ d'accès/compte (inexistant sur le doctype).
  const input = {
    name: body.name ? String(body.name) : undefined,
    type_beneficiaire: body.type_beneficiaire as 'Vacataire' | 'Prestataire',
    nom_complet: String(body.nom_complet).trim(),
    ifu: String(body.ifu ?? '').trim(),
    npi: String(body.npi ?? '').trim(),
    contact_email: String(body.contact_email ?? '').trim(),
    contact_tel: String(body.contact_tel ?? '').trim(),
    composante: String(body.composante ?? '').trim(),
    discipline: String(body.discipline ?? '').trim(),
  };

  try {
    const res = await saveBeneficiaire(input);
    return json(res, 200);
  } catch (e) {
    console.error('[api/beneficiaires/save]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : "Échec de l'enregistrement." }, denied ? 403 : 400);
  }
};

const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
