import { defineConfig } from 'vite';

// The game plays two ways:
//   • locally, `npm run dev` (play.cmd) serves at the site root — base '/'
//   • published, GitHub Pages serves under the repo name — base '/freestone/'
// `command` is 'serve' for dev and 'build' for the Pages artifact. Runtime data
// fetches must use import.meta.env.BASE_URL so they resolve under either root
// (see loadSite/loadBeds in src/render/main.ts).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/freestone/' : '/',
}));
