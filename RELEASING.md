# Releasing

Releases are staged on npm by GitHub Actions
([`.github/workflows/release.yml`](.github/workflows/release.yml)) using npm
trusted publishing, so every version ships with a
[provenance attestation](https://docs.npmjs.com/generating-provenance-statements).
The workflow is only allowed to *stage* a version: a maintainer approves it,
with 2FA, before it goes live. Nobody needs to run `npm publish` locally.

`master` only accepts changes through pull requests, so the version bump is
a PR, and the tag is created with the GitHub release.

1. On a branch from an up-to-date `master`, bump the version without
   committing or tagging, and date the version's `CHANGELOG.md` entry:

   ```sh
   git switch -c release/vX.Y.Z origin/master
   npm version <patch|minor|major> --no-git-tag-version
   ```

   Commit `package.json`, `package-lock.json` and `CHANGELOG.md` as
   `chore(release): X.Y.Z`, open a pull request and merge it once CI passes.

2. On GitHub, [create a release](https://github.com/jasonsims/aws-cloudfront-sign/releases/new):
   choose **Create new tag** `vX.Y.Z` on `master` (the merge commit from step
   1), paste the version's `CHANGELOG.md` entry as the notes, and publish it.
   Only repository admins can create tags.

3. The **Release** workflow runs lint, typecheck, tests, build and package
   checks, verifies the tag matches `package.json`'s version, packs the
   tarball, runs the integration tests and the CloudFront smoke tests against
   it, then stages that exact tarball with `npm stage publish --provenance`.
   The smoke tests are required here: if the `CF_URL`, `CF_KEYPAIR_ID` or
   `CF_PRIVATE_KEY` repository secrets are missing, the release fails. Watch
   it under
   [Actions](https://github.com/jasonsims/aws-cloudfront-sign/actions/workflows/release.yml).

4. Approve the staged version on
   [npmjs.com](https://www.npmjs.com/package/aws-cloudfront-sign) (you will be
   asked for 2FA), or from a terminal logged in to npm:

   ```sh
   npm stage list aws-cloudfront-sign
   npm stage approve <stage-id>
   ```

   To inspect it first, `npm stage download <stage-id>`; to discard it,
   `npm stage reject <stage-id>`.

If the workflow fails, or a staged version is rejected, nothing was
published. Fix the problem in a pull request, delete the failed release and
its tag, and publish the release again from step 2 (the version bump from
step 1 can stay).
