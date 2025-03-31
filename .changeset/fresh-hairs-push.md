---
'tsargp': minor
---

Refactor the `ErrorMessage` class to use `WarnMessage` as base.

- Due to the introduction of the `handleError` function, inheriting from `Error` is no longer needed.
