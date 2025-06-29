module.exports = {
	globDirectory: 'dist',
	globPatterns: [
	  '*.{html,js,css,ico,png}',
	  'assets/**/*',
	  'images/**/*',
	  'manifest.json',
	  'favicon.png'
	],
	swSrc: 'src/sw.js',
	swDest: 'dist/sw.js'
};
  