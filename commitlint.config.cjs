module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Dependabot bodies contain long release-note URLs that exceed
  // body-max-line-length; its subjects are already conventional.
  ignores: [(message) => /^Signed-off-by: dependabot\[bot\]/m.test(message)],
};
