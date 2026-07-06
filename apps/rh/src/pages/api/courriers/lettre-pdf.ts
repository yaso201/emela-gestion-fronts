import type { APIRoute } from 'astro';

export const prerender = false;

// Proxy de téléchargement du PDF d'un courrier RH (M2b) — miroir du proxy
// attestation : back `download_hr_letter_pdf` (scope RH / salarié si Diffuse),
// session forwardée, aucune URL de fichier privé exposée.
const ROOT = (import.meta as any).env?.PUBLIC_FRAPPE_URL ?? '';

export const GET: APIRoute = async ({ url, cookies }) => {
  const sid = cookies.get('sid')?.value;
  if (!sid) return new Response('Non authentifié.', { status: 401 });
  const name = url.searchParams.get('name');
  if (!name) return new Response('name requis.', { status: 400 });
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(name)) return new Response('name invalide.', { status: 400 });
  try {
    const res = await fetch(
      `${ROOT}/api/method/benin_hr.api.courriers_rh.download_hr_letter_pdf?name=${encodeURIComponent(name)}`,
      { headers: { Cookie: `sid=${sid}` } },
    );
    if (!res.ok) return new Response(res.status === 403 ? 'Non autorisé.' : 'Document indisponible.', { status: res.status });
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="courrier-${name}.pdf"` },
    });
  } catch (e) {
    console.error('[api/courriers/lettre-pdf]', e);
    return new Response('Erreur réseau.', { status: 502 });
  }
};
