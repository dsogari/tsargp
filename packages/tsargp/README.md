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

## Usage

Let's say your CLI name is `cli`. Then, your folder structure could look like this:

- lib
  - cli.ts
  - cli.options.ts
  - cli.options.spec.ts

Define your command-line options:

```ts
// cli.options.ts
import { type Options, ... } from 'tsargp';

export default {
  // define the options' attributes...
} as const satisfies Options;
```

Import them in your main script:

```ts
#!/usr/bin/env node
import { ArgumentParser } from 'tsargp';
import options from './cli.options.js';

try {
  const parser = new ArgumentParser(options);
  const values = await parser.parse(); // use this to get the options' values
  // await parser.parseInto(myValues); // use this to fill an existing object or class instance
} catch (err) {
  if (err instanceof Error) {
    console.error(`${err}`); // genuine errors
    process.exitCode = 1;
  } else {
    console.log(`${err}`); // help message, version or completion words
  }
}
```

Validate them in your test script:

```ts
import { OptionValidator } from 'tsargp';
import options from './cli.options.js';

describe('cli', () => {
  it('should have valid options', async () => {
    const validator = new OptionValidator(options);
    const { warning } = await validator.validate();
    expect(warning).toBeUndefined(); // or check warnings that are important to your application
  });
});
```

Optionally, enable word completion for your shell:

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
