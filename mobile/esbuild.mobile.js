const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['./App.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: '../public/main.mobile.js',
  platform: 'browser',
  target: ['es2017'],
  jsx: 'automatic',
  loader: { '.js': 'jsx' },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  external: ['react', 'react-dom'],
}).catch(() => process.exit(1));
