# tsargp

[![CodeQL]](https://github.com/dsogari/tsargp/actions/workflows/github-code-scanning/codeql)
[![codecov]](https://codecov.io/gh/dsogari/tsargp)

**tsargp** is a command-line argument parsing library that helps you write clean code.

Get started with the [documentation].

## Demo

Test the [online demo] or install it locally:

```sh
npm i -g tsargp && complete -C tsargp tsargp

tsargp -h         # print the help message
tsargp -v         # print the package version
tsargp            # view the options' default values
tsargp ...        # play with option values
tsargp hello ...  # test the hello command
```

See the [demo source].

## Quick Start

### Define folder structure

For best modularity, you should keep command-line options separate from the main script. Below is a possible folder structure for the related source code:

- lib
  - cli.options.spec.ts
  - cli.options.ts
  - cli.ts

### Define command-line options

Here we define the available options and export them by default as a single object:

```ts
import { type Options /*...*/ } from 'tsargp';

export default {
  help: {
    type: 'help'
    names: ['-h', '--help'],
    synopsis: 'Prints this help message',
  }
  // more definitions go here...
} as const satisfies Options;
```

Since we want value types to be inferred from option definitions, we do not give the object an _explicit_ type. Instead, we declare it as `const`. On the other hand, we use the `satisfies` keyword to ensure that the object conforms to a valid set of option definitions.

In the documentation, you will learn about the different option types and their attributes.

### Parse arguments in main script

There are multiple ways to parse the command-line arguments. Below is an example:

```ts
#!/usr/bin/env node
import { parse, handleError } from 'tsargp';
import options from './cli.options.js';

try {
  const values = await parse(options);
  // do something with the option values...
} catch (err) {
  // do your own handling here, if necessary, or...
  // handle expected/internal error or help/version/completion message
  handleError(err);
}
```

Notice how we include the option definitions from the sibling file. We also capture any error raised by the library and handle it based on its type. Usually, it will be either a help, version or completion message.

The documentation also shows how to _return_ (not throw) the help and version messages, how to parse arguments into an existing object, specify parsing flags, emit warnings, and much more.

### Validate options in test script

Do not forget to sanity-check the option definitions during development. Below is an example:

```ts
import { validate } from 'tsargp';
import options from './cli.options.js';

describe('cli', () => {
  it('should have valid options', () => {
    expect(validate(options)).resolves.toEqual({}); // no errors or warnings
    // ...or you can ignore warnings that are not important to your application
  });
});
```

The documentation also shows how to check for inconsistencies in option naming, among other things.

### Enable completion (optional)

You can configure the user's terminal to use the main script as a source of completion words or suggestions. This is handled automatically by the library. You just need to register your application with the native completion engine:

```sh
complete -o default -C <path_to_main_script> <cli_name>
```

When users install through a package manager, the latter will probably create a [shim] for the script, so you should take that into account when writing documentation for your application.

## Build

```sh
curl -fsSL https://bun.sh/install | bash
bun install   # install dependencies
bun test      # run unit tests
bun publish   # publish to npm registry
```

[documentation]: https://dsogari.github.io/tsargp/docs
[online demo]: https://dsogari.github.io/tsargp/demo
[demo source]: src/examples/demo.options.ts
[shim]: https://en.wikipedia.org/wiki/Shim_(computing)
[CodeQL]: https://github.com/dsogari/tsargp/actions/workflows/github-code-scanning/codeql/badge.svg
[codecov]: https://codecov.io/gh/dsogari/tsargp/graph/badge.svg?token=W2AA8M1L87
