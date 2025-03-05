# tsargp

**tsargp** is a command-line argument parsing library that helps you write clean code.

Get started with the [documentation](https://dsogari.github.io/tsargp/docs).

## Demo

Test it [online](https://dsogari.github.io/tsargp/demo) or install it locally:

```sh
npm i -g tsargp && complete -C tsargp tsargp

tsargp -h         # print the help message
tsargp -v         # print the package version
tsargp            # view the options' default values
tsargp ...        # play with option values
tsargp hello ...  # test the hello command
```

See the [source](examples/demo.options.ts).

## Quick Start

### Define folder structure

By convention, we keep command-line options separate from the main script which uses them. Assuming your application name is `cli`, here's a possible folder structure for the related source code:

- lib
  - cli.options.spec.ts
  - cli.options.ts
  - cli.ts

### Define command-line options

You should define the options and export them by default as a single object. Below is an example.

```ts
import { type Options /*...*/ } from 'tsargp';

export default {
  // definitions go here...
} as const satisfies Options;
```

In the documentation, you will learn about the different option types and their attributes.

### Parse arguments in main script

There are multiple ways to parse the command-line arguments. Below is an example.

```ts
#!/usr/bin/env node
import { parse } from 'tsargp';
import options from './cli.options.js';

try {
  const values = await parse(options);
  // do something with the options' values...
} catch (err) {
  if (err instanceof Error) {
    console.error(`${err}`); // genuine errors
    process.exitCode = 1;
  } else {
    console.log(`${err}`); // help message, version or completion words
  }
}
```

The documentation also shows how to parse them into an existing object or class instance, specify parsing flags, and emit warnings.

### Validate options in test script

You should check the validity of command-line options during development. Below is an example.

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

### Enable word completion (optional)

You can configure shell completion to use the main script as a source of completion words. This is handled automatically by the library. You just need to register it with the completion builtins.

```sh
complete -o default -C <path_to_main_script> cli
```

## Build

```sh
curl -fsSL https://bun.sh/install | bash
bun install   # install dependencies
bun test      # run unit tests
bun publish   # publish to npm registry
```
