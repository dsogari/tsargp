# Regression tests

This folder is reserved for test cases that assert the fixed state of reported issues. The following rules apply:

- every issue with the `bug` label should have test case(s) inside this folder;
- every file should reference a single issue by its number (e.g., `123.spec.ts`);
- when a test fails in consequence of subsequent changes:
  - if it can be amended, then please do so; else
  - if it has become obsolete, it must be removed;
  - if the file becomes empty, it must be removed.

The reason for removing obsolete tests is twofold:

- ensure the test procedure runs as _fast_ as possible; and
- keep the test procedure as _clean_ as possible.

The alternative would be to `skip` them, but this would gradually make the skipped tests meaningless. Instead, we want to know which tests are skipped, so we can fix them eventually.
