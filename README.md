# pdf-annotate

This is the README for the VS Code extension "pdf-annotate".

## Planned Features

- annotate PDFs, saving the annotations locally to `.paj` files
- reference the annotations in Markdown for use in personal knowledge management systems (e.g., [wikibonsai](https://wikibonsai.io))

## Requirements

None

<!--
## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.-->

## Known Issues

Text layer for highlighting is not aligned properly with rendered text. To mitigate this issue, the
text layer is visible on top of the rendered text.

<!--## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.
-->

## Testing framework

This package uses ExTester, with 2 packages as (dev)Dependencies:

- `vscode-extension-tester` - the extension testing framework itself
- `mocha` - Mocha test framework is required, as the ExTester uses it for writing and running its tests

This extension also uses `chai` as the assertion framework of choice.

Also note that the folder `test-resources` (which stores all the required binaries for testing) is excluded from typescript compiler and ESLint. This is necessary for both to work when building the project. 

## Running the Tests

- Run `npm install` in terminal to install dependencies
- Run `npm run test` in terminal to run the unit tests.
- Run `npm run ui-test` in terminal. This will:
  - Compile the code
  - Download the latest version of VS Code
  - Download the adequate version of ChromeDriver
  - Run the downloaded VS Code binary using ChromeDriver
  - Run the integration tests located in `src/ui-test`

To check the `ui-test` script, see the `script` section inside `package.json`.
To check the integration test code, see the `src/ui-test/*-test.ts` files.