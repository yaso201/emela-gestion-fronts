import type { APIRoute } from 'astro';
import { createHrLetter, transitionHrLetter } from '@emela/shared/rh-data';

export const prerender = false;

const ACTIONS = new Set(['creer', 'valider', 'signer', 'diffuser']);

/** Cycle DEC-30 des courriers RH (M2b). Le back gate chaque transition avec le
 *  vrai rôle (contrôleur HR Letter) — ici on relaie avec la session. */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
  const action = String(body?.action ?? '');
  if (!ACTIONS.has(action)) return json({ error: 'Action invalide.' }, 400);
  try {
    if (action === 'creer') {
      if (!body?.template || !body?.employee) return json({ error: 'Modèle et salarié requis.' }, 400);
      return json(await createHrLetter(String(body.template), String(body.employee)), 200);
    }
    if (!body?.name) return json({ error: 'name requis.' }, 400);
    return json(await transitionHrLetter(String(body.name), action as any), 200);
  } catch (e) {
    console.error('[api/courriers/lettres]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé pour cette transition.' : "Échec de l'opération." }, denied ? 403 : 400);
  }
};

const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
