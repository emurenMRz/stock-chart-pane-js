const path = require('path');

module.exports = {
	// devtool: 'inline-source-map',
	entry: {
		'stock-chart-pane': path.resolve(__dirname, 'src/chart-pane.js'),
	},
	output: {
		path: path.resolve(__dirname, 'docs'),
		publicPath: '/',
		filename: '[name].js',
		module: true,
		library: {
			"type": 'module'
		},
	},
	experiments: {
		outputModule: true,
	},
}