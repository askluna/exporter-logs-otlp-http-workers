import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	splitting: true,
	treeshake: true,
	minify: true,
	sourcemap: true,
	clean: true,
	dts: true,
	format: ['esm'],
	platform: 'node',
	outDir: 'dist',
});
