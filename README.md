## TODO

- [ ] Support for additional context members
  - [x] context.services (safe to assume only mongodb)
  - [x] context.values
  - [ ] context.app
  - [ ] context.functions
  - [ ] context.environment
  - [ ] context.request
  - [ ] context.user
  - ~~[ ] context.http (pushing for dependencies instead, no need to support this)~~
- [ ] Demo repo
  - Uses codedeploy
  - Uses github actions to run unit tests
  - Uses multiple data sources with mongodb containers for CI
  - Automatically populates babel options from file structure
