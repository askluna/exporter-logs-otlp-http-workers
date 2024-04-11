import { resolve } from 'node:path';

import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

import { defineConfig } from 'vite';
// https://vitejs.dev/guide/build.html#library-mode
export default defineConfig({
	build: {
		sourcemap: true,
		lib: {
			entry: resolve(__dirname, './src/index.ts'),
			formats: ['es'],
			fileName: 'index',
		},

		rollupOptions: {
			output: {
				esModule: true,
			},
			external: [],
		},
	},
	plugins: [
		tsconfigPaths(),
		dts({
			outDir: 'dist',
			rollupTypes: true,
		}),
	],
});
