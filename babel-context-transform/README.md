## Usage

1. Generate options for app structure

```bash
yarn && yarn generate-options /path/to/app/root/
```

2. Copy options into a babel config

```js
module.exports = {
  // other settings...

  plugins: [
    [
      "/path/to/babel-context-transform/dist/index.js",
      // paste options object here:
      {
        datasources: {},
        values: {},
      },
    ],
  ],
};
```

3. Run babel to transpile your functions

```bash
npx babel -d dist/ /path/to/app/root/functions/*
```

## TODO

- [ ] Support for additional context members
  - [x] context.services (only mongodb, no support for third party services)
  - [x] context.values
  - [ ] context.app
  - [ ] context.functions
  - [ ] context.environment
  - [ ] context.request
  - [ ] context.user
  - ~~[ ] context.http (pushing for dependencies instead, no need to support this)~~
