import type { APIRoute } from 'astro';
import { createNoteDeFrais } from '@emela/shared/data';
import { getSid } from '@emela/shared/session';

export const prerender = false;

const BASE = (import.meta as any).env?.PUBLIC_FRAPPE_URL ?? '';
const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo (hint du champ)
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

/** Dépôt d'une note de frais par le salarié connecté (employee résolu serveur).
 *  M0-② : accepte AUSSI multipart/form-data avec un reçu (`justificatif`) —
 *  uploadé en fichier privé Frappe (session + CSRF forwardés) puis passé en
 *  file_url à create_note_de_frais. Le JSON existant reste inchangé (additif). */
export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  let fileUrl: string | undefined;

  const ctype = request.headers.get('content-type') || '';
  try {
    if (ctype.includes('multipart/form-data')) {
      const form = await request.formData();
      body = {
        category: form.get('category'),
        amount: form.get('amount'),
        expense_date: form.get('expense_date'),
        description: form.get('description'),
      };
      const file = form.get('justificatif');
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_BYTES) return json({ error: 'Justificatif trop lourd (5 Mo max).' }, 400);
        if (!ALLOWED_TYPES.has(file.type)) return json({ error: 'Justificatif : PDF, JPG ou PNG attendu.' }, 400);
        fileUrl = await uploadPrivate(file);
        if (!fileUrl) return json({ error: "Échec de l'envoi du justificatif." }, 502);
      }
    } else {
      body = await request.json();
    }
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
      justificatif: fileUrl,
    });
    return json(res, 200);
  } catch (e) {
    console.error('[api/requests/note-de-frais]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec du dépôt de la note de frais.' }, denied ? 403 : 400);
  }
};

/** Upload du reçu en fichier PRIVÉ Frappe (`upload_file`) avec la session du
 *  salarié — le back applique ses propres contrôles ; on renvoie le file_url. */
async function uploadPrivate(file: File): Promise<string | undefined> {
  const sid = getSid();
  if (!sid) return undefined;
  const csrfRes = await fetch(`${BASE}/api/method/benin_hr.api.cockpit.get_csrf_token`, {
    headers: { Cookie: `sid=${sid}`, Accept: 'application/json' },
  });
  if (!csrfRes.ok) return undefined;
  const csrf = (await csrfRes.json())?.message?.csrf_token ?? '';
  // Re-matérialiser le contenu (un File Astro re-passé tel quel à undici perd son
  // corps → le back reçoit un fichier vide). On renvoie un Blob depuis les octets.
  const bytes = await file.arrayBuffer();
  const fd = new FormData();
  fd.set('file', new Blob([bytes], { type: file.type || 'application/octet-stream' }), file.name);
  fd.set('is_private', '1');
  const up = await fetch(`${BASE}/api/method/upload_file`, {
    method: 'POST',
    headers: { Cookie: `sid=${sid}`, 'X-Frappe-CSRF-Token': csrf, Accept: 'application/json' },
    body: fd,
  });
  if (!up.ok) {
    console.error('[note-de-frais] upload_file →', up.status);
    return undefined;
  }
  return (await up.json())?.message?.file_url ?? undefined;
}

const json = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
