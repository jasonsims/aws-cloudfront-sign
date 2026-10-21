[jasonsims]: https://github.com/jasonsims
[mpalmerlee]: https://github.com/mpalmerlee
[gregt590]: https://github.com/gregt590
[tbuchok]: https://github.com/tbuchok
[alexsaves]: https://github.com/alexsaves
[fponticelli]: https://github.com/fponticelli
[darrendao]: https://github.com/darrendao
[benburkhart1]: https://github.com/benburkhart1
[dnjohnson]: https://github.com/dnjohnson
[clarkie]: https://github.com/clarkie
[caub]: https://github.com/caub
[joelwass]: https://github.com/joelwass

## 3.1.0 (Unreleased)
* feature: ES Modules now work (`import { getSignedUrl } from 'aws-cloudfront-sign'`); the 3.0.x ESM build was unreachable. A default export is also provided. CommonJS is unchanged
* feature: public types (`SignatureOptions`, `ExpireTime`) are exported from the package entry, and the `aws-cloudfront-sign/types` subpath now resolves
* feature: added `privateKeyPassphrase` option for encrypted private keys [#60](https://github.com/jasonsims/aws-cloudfront-sign/issues/60)
* bugfix: `expireTime` type now accepts a number (ms), numeric string, `Date`, or any object with `valueOf()` (e.g. moment, dayjs)
* bugfix: a missing private key now throws `Missing param: privateKeyString or privateKeyPath`
* note: an `exports` map now restricts imports to the package entry, `aws-cloudfront-sign/types` and `aws-cloudfront-sign/dist/*`; deep imports into `dist/` must include the file extension
* development: migrated test suite to Vitest
* development: migrated to ESLint flat config and added Prettier
* development: added GitHub Actions CI and npm publishing with provenance
* development: enforce conventional commits on pull requests
* development: added Dependabot
* development: refreshed README (trusted key groups, Origin Access Control, ESM/CommonJS examples) and examples
* development: removed obsolete RunKit `tonicExampleFilename` from package.json

## 3.0.2 (2023-07-12)
* bugfix: fix empty package
## ~~3.0.1 (2023-07-12)~~ deprecated
* bugfix: remove leftover debug log [#73](https://github.com/jasonsims/aws-cloudfront-sign/issues/73)
## 3.0.0 (2023-07-10)
* feature: added support for TypeScript
* feature: added support for ES Modules
* development: engines updated to current LTS (v18)
* development: added commit lint
* development: migrated test suite to jest
* development: added funding URL
* development: removed lodash dependency
* development: added .nvmrc

## 2.2.0 (2016-11-09)
* development: [@caub][caub]: Simplified expiry and normalization logic
* development: [@joelwass][joelwass]: Added additional error handling for private key string

## 2.1.2 (2016-02-26)
* bugfix: [@clarkie][clarkie]: Fix undeclared variable
* development: [@jasonsims][jasonsims]: Update jshintrc to error on undeclared variables

## 2.1.1 (2016-02-24)
* feature: [@jasonsims][jasonsims]: Added support for NPM tonic examples

## 2.1.0 (2016-02-24)
* feature: [@benburkhart1][benburkhart1]: Added `ipRange` option to support source IP restrictions
* feature: [@darrendao][darrendao]: Added `getSignedCookies` API
* feature: [@dnjohnson][dnjohnson]: Updated the signed URL to also include the policy

## 2.0.1 (2015-04-21)
* develop: [@fponticelli][fponticelli]: Fix typo in usage examples
* develop: [@jasonsims][jasonsims]: Switch to TravisCI
* develop: [@jasonsims][jasonsims]: Add more descriptive usage examples

## 2.0.0 (2015-03-29)
* feature: [@jasonsims][jasonsims]: Add support for momentjs
* bugfix: [@jasonsims][jasonsims]: Fix malformed query param issue
* develop: [@jasonsims][jasonsims]: Misc API refactors
* develop: [@jasonsims][jasonsims]: Refactor of the test suite
* develop: [@jasonsims][jasonsims]: Add more description to API options in README.md

## 1.2.0 (2014-12-31)
* development: [@alexsaves][alexsaves]: Supporting JavaScript dates for expireTime
* development: [@alexsaves][alexsaves]: Added range and type checking
* development: [@alexsaves][alexsaves]: Added `getSignedRTMPUrl` for conveniently generating RTMP style urls

## 1.1.0 (2014-11-26)
* bugfix: [@gregt590][gregt590]: Normalize AWS signature strings
* development: [@tbuchok][tbuchok]: Add initial unit tests
* development: [@jasonsims][jasonsims]: Add tests for AWS signature
* development: [@jasonsims][jasonsims]: Cleanup code style

## 1.0.0 (2014-06-07)
* bugfix: [@mpalmerlee][mpalmerlee]: Fix issue with `expireTime` param
* development: [@mpalmerlee][mpalmerlee]: Make `gitSignedUrl` synchronous
* development: [@mpalmerlee][mpalmerlee]: Remove moment dependency
