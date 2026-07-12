/// <reference types="vite/client" />
// Gives TypeScript the Vite ambient types — notably import.meta.env.BASE_URL,
// which loadSite/loadBeds use so runtime data resolves under the Pages subpath.
// An explicit reference directive is honored even though tsconfig pins
// "types": ["node"] (that pin only governs automatic @types inclusion).
