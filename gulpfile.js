/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

'use strict';

const path = require('path');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const uglify = require('gulp-uglify');
const cssSlam = require('css-slam').gulp;
const htmlMinifier = require('gulp-html-minifier');
const stylemod = require('gulp-style-modules');
const eslint = require('gulp-eslint');

// Got problems? Try logging 'em
// const logging = require('plylog');
// logging.setVerbose();

// !!! IMPORTANT !!! //
// Keep the global.config above any of the gulp-tasks that depend on it
global.config = {
  polymerJsonPath: path.join(process.cwd(), 'polymer.json'),
  build: {
    rootDirectory: 'build',
    bundledDirectory: 'bundled',
    unbundledDirectory: 'unbundled',
    // Accepts either 'bundled', 'unbundled', or 'both'
    // A bundled version will be vulcanized and sharded. An unbundled version
    // will not have its files combined (this is for projects using HTTP/2
    // server push). Using the 'both' option will create two output projects,
    // one for bundled and one for unbundled
    bundleType: 'both'
  },
  // Path to your service worker, relative to the build root directory
  serviceWorkerPath: 'service-worker.js',
  // Service Worker precache options based on
  // https://github.com/GoogleChrome/sw-precache#options-parameter
  swPrecacheConfig: require('./sw-precache-config.js')
};

// Add your own custom gulp tasks to the gulp-tasks directory
// A few sample tasks are provided for you
// A task should return either a WriteableStream or a Promise
const clean = require('./gulp-tasks/clean.js');
const images = require('./gulp-tasks/images.js');
const project = require('./gulp-tasks/project.js');

function minify() {
  return htmlMinifier({
    collapseWhitespace: true,
    removeComments: true,
    removeAttributeQuotes: true,
    removeRedundantAttributes: true,
    useShortDoctype: true,
    removeEmptyAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    removeOptionalTags: true
  });
}

// The source task will split all of your source files into one
// big ReadableStream. Source files are those in src/** as well as anything
// added to the sourceGlobs property of polymer.json.
// Because most HTML Imports contain inline CSS and JS, those inline resources
// will be split out into temporary files. You can use gulpif to filter files
// out of the stream and run them through specific tasks. An example is provided
// which filters all images and runs them through imagemin
function source() {
  return project.splitSource()
    // Add your own build tasks here!
    .pipe(gulpif('**/*.{png,gif,jpg,svg}', images.minify()))
    .pipe(gulpif(/\.js$/, uglify()))
    .pipe(gulpif(/\.css$/, cssSlam()))
    .pipe(gulpif(/\.html$/, cssSlam()))
    .pipe(gulpif(/\.html$/, minify()))
    .pipe(project.rejoin());
}

// The dependencies task will split all of your bower_components files into one
// big ReadableStream
// You probably don't need to do anything to your dependencies but it's here in
// case you need it :)
function dependencies() {
  return project.splitDependencies()
    .pipe(gulpif(/\.js$/, uglify()))
    .pipe(gulpif(/\.css$/, cssSlam()))
    .pipe(gulpif(/\.html$/, cssSlam()))
    .pipe(gulpif(/\.html$/, minify()))
    .pipe(project.rejoin());
}

function lint() {
  return gulp.src(['src/**/*.html', '!bower_components/**/*.html', 'test/**/*.html'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}

// Clean the build directory, split all source and dependency files into streams
// and process them, and output bundled and unbundled versions of the project
// with their own service workers
gulp.task('default', gulp.series([
  clean([global.config.build.rootDirectory]),
  lint,
  project.merge(source, dependencies),
  project.serviceWorker
]));

gulp.task('lint', lint);
