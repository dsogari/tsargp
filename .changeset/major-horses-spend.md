---
'tsargp': minor
---

Add base style for error messages.

**Breaking changes**:

- the `WarnMessage` class has been removed in favor of the unified `ErrorMessage` class
- the `ErrorMessage` class constructor has been removed

**Other changes**:

- an `error` field has been added to `config.styles` to specify the base style for error messages
- an `add` method has been added to `AnsiMessage` to append ANSI strings with a trailing line feed

**Usage notes**:

Error messages can now be created with a list of ANSI strings, e.g.:

```ts
throw new ErrorMessage(ansi`Error with arguments: ${'abc'}: ${123}`);
```

Alternatively, the `add` method can be called to append new strings, e.g.:

```ts
throw new ErrorMessage().add('Error with arguments: #0: #1', {}, 'abc', 123);
```
