import { defineConfig } from 'vite';

// Relative asset paths, so the built game also opens from a file (the Steam/desktop build loads it that way).
export default defineConfig({ base: './' });
