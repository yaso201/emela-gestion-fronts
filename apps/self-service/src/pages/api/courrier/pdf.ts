import type { APIRoute } from 'astro';

export const prerender = false;

// Courrier RH reçu (M2b) : le back gate le scope (salarié concerné + Diffuse).
const BASE = (import.meta as any).env?.PUBLIC_FRAPPE_URL ?? '';

export const GET: APIRoute = async ({ url, cookies }) => {
  const sid = cookies.get('sid')?.value;
  if (!sid) return json({ error: 'Non authentifié.' }, 401);
  const id = url.searchParams.get('id');
  if (!id || !/^[A-Za-z0-9._-]{1,64}$/.test(id)) return json({ error: 'Courrier requis.' }, 400);
  try {
    const res = await fetch(`${BASE}/api/method/benin_hr.api.courriers_rh.download_hr_letter_pdf?name=${encodeURIComponent(id)}`, {
      headers: { Cookie: `sid=${sid}`, Accept: 'application/pdf' },
    });
    if (!res.ok) {
      const denied = res.status === 403;
      return json({ error: denied ? 'Non autorisé.' : 'Courrier indisponible.' }, denied ? 403 : 404);
    }
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="courrier-${id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[api/courrier/pdf]', e);
    return json({ error: 'Erreur réseau.' }, 502);
  }
};

const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
