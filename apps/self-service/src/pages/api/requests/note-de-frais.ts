import type { APIRoute } from 'astro';
import { createNoteDeFrais } from '@emela/shared/data';

export const prerender = false;

/** Dépôt d'une note de frais par le salarié connecté (employee résolu serveur). */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corps de requête invalide.' }, 400);
  }
  if (!body?.category || !body?.amount || !body?.expense_date) {
    return json({ error: 'Catégorie, montant et date sont requis.' }, 400);
  }
  try {
    const res = await createNoteDeFrais({
      category: String(body.category),
      amount: Number(body.amount),
      expense_date: String(body.expense_date),
      description: body.description ? String(body.description) : undefined,
    });
    return json(res, 200);
  } catch (e) {
    console.error('[api/requests/note-de-frais]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec du dépôt de la note de frais.' }, denied ? 403 : 400);
  }
};

const json = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
