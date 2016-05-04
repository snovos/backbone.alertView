
"use strict";

module.exports = function (grunt) {

grunt.initConfig({

	pkg: grunt.file.readJSON("package.json"),

	uglify: {
		options: {
			mangle: true,
			compress: {},
			preserveComments: "some"
		},
		"default": {
			files: {
				"backbone.alertView.min.js": ["backbone.alertView.js"]
			}
		}
	},

	connect: {
		server: {
			options: {
				keepalive: true
			}
		}
	}
});

grunt.loadNpmTasks("grunt-contrib-uglify");
grunt.loadNpmTasks("grunt-contrib-connect");


grunt.registerTask("default", ["uglify", 'connect']);

};