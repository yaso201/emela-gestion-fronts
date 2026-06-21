import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Espace personnel RH (self-service salarié).
// Audience : un employé connecté qui gère ses propres congés, bulletins,
// documents et demandes. Distinct de `management` (back-office 3 rôles).
//
// SSR (output: 'server') : le frontmatter `await getX()` s'exécute PAR REQUÊTE,
// propageant la session de l'utilisateur au back benin_hr (cf. DEPLOYMENT.md).
// Adapter Cloudflare (déploiement Worker au push, convention LaNEM).
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
