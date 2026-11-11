# Releasing

Releases are published to npm by GitHub Actions
([`.github/workflows/release.yml`](.github/workflows/release.yml)) using npm
trusted publishing, so every version ships with a
[provenance attestation](https://docs.npmjs.com/generating-provenance-statements).
Nobody needs to run `npm publish` locally.

1. On an up-to-date `master` with a clean working tree, bump the version. This
   updates `package.json`/`package-lock.json`, commits, and creates a `vX.Y.Z`
   tag:

   ```sh
   npm version <patch|minor|major>
   ```

2. Push the commit and the tag:

   ```sh
   git push --follow-tags
   ```

3. On GitHub, [create a release](https://github.com/jasonsims/aws-cloudfront-sign/releases/new)
   from the new tag and publish it.

4. The **Release** workflow runs lint, typecheck, tests, build and package
   checks, verifies the tag matches `package.json`'s version, packs the
   tarball, runs the integration tests against it, then publishes that exact
   tarball with `npm publish --provenance`. Watch it under
   [Actions](https://github.com/jasonsims/aws-cloudfront-sign/actions/workflows/release.yml).

If the workflow fails, nothing was published. Fix the problem on `master` and
release again from step 1 (deleting the failed release and tag first if you
want to reuse the version number).
