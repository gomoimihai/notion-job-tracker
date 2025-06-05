"use strict";

const { merge } = require("webpack-merge");

const common = require("./webpack.common.js");
const PATHS = require("./paths");

// Merge webpack configuration files
const config = (env, argv) =>
	merge(common, {
		entry: {
			sidebar: PATHS.src + "/sidebar.ts",
			sidebarInjector: PATHS.src + "/sidebarInjector.ts",
			background: PATHS.src + "/background.ts",
		},
		resolve: {
			extensions: [".tsx", ".ts", ".js"],
			fallback: {
				process: false,
			},
		},
		devtool: argv.mode === "production" ? false : "source-map",
	});

module.exports = config;
