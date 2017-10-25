# tex-unicode

<!-- [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] -->

This is a Chrome Extension which converts TeX-like strings in text areas to corresponding Unicode symbols as much as possible.

- **Real-time**: it watches all modifications to textareas and performs the conversion whenever a convertible TeX-like command appears.

## Development
The following gulp tasks are useful:

- **default**: compile the TypeScript source codes, lint them and bundle them into a single JavaScript file.
- **watch**: watch the source codes.

These tasks minimise the result when the `NODE_ENV` environment variable is set to `production`.

The following npm script is also useful:

- **package**: pack generated files and other items into `chrome-extension/app` directory and zip it into `chrome-extension/app.zip`. This directory should be able to be loaded into Chrome.

## Contributors
Be the first contributor!

## License

MIT © [uhyo]()
