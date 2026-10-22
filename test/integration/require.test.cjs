'use strict';

const { defineSuite, definePackageSuite } = require('./suite.cjs');

defineSuite('require()', require('aws-cloudfront-sign'));
definePackageSuite(require.resolve('aws-cloudfront-sign/package.json'));
