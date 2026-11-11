# Contributing

Thanks for helping improve `aws-cloudfront-sign`!

## Setup

```sh
npm install
```

Installing dependencies also points Git at the hooks in `.githooks/` (via
`git config core.hooksPath .githooks`):

- `pre-commit` runs lint, format check, typecheck and tests
- `commit-msg` checks your message with [commitlint](https://commitlint.js.org/)

Skip them for a single commit with `git commit --no-verify`; CI runs the same checks.

Development tooling requires Node.js 22.12 or newer.

## Common tasks

```sh
npm run lint   # lint the source
npm test       # run the test suite
npm run build  # compile to dist/
npm run test:integration  # pack, install into a temp project, test as a consumer
```

`test:integration` installs only the packed tarball into an empty project and
checks it through `require()`, named `import` and default `import` against a
reference implementation of CloudFront signing. It can also target other
builds, so you can confirm a change produces identical output to an existing
version:

```sh
npm run test:integration -- master npm:aws-cloudfront-sign@latest .
```

Targets: `.` (working tree, the default), any git ref, a `.tgz` path, or
`npm:<spec>`.

## Commit messages

This project requires [Conventional Commits](https://www.conventionalcommits.org/),
enforced by `@commitlint/config-conventional`. Messages take the form:

```
<type>(<optional scope>): <short summary>
```

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`,
`refactor`, `revert`, `style`, `test`.

Examples:

```
feat: add support for custom policy statements
fix(sign): handle URLs with existing query strings
docs: clarify private key options
chore(deps): bump typescript
feat!: drop support for Node.js 18
```

Mark breaking changes with `!` after the type or a `BREAKING CHANGE:` footer.

## Pull requests

CI lints every commit in a pull request. The **pull request title** must also
be a conventional commit message, because it becomes the commit message when a
PR is squash-merged.
