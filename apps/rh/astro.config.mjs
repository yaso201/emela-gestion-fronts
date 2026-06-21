import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Back-office RH & Paie (SIRH). Audience : équipe RH multi-profils
// (manager, gestionnaire RH, paie, finance, direction, admin).
// La nav et le contenu s'adaptent au rôle actif.
//
// SSR (output: 'server') : frontmatter exécuté PAR REQUÊTE (session propagée au
// back benin_hr, cf. DEPLOYMENT.md). Adapter Cloudflare (déploiement Worker).
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
