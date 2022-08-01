# Releasing the wallet-headless

Follow these steps to create a new release of hathor-wallet-headless:

1. Make sure the API Docs in `src/api-docs.js` were updated in case any change in the API is made in this release.

1. Create a PR to the `dev` branch to bump the versions in `package.json`, `package-lock.json` and `src/api-docs.js`. We follow the [semantic versioning](https://semver.org/) directives when assigning versions.

1. Create a Release PR from `dev` to `master` and merge it.

1. Test the new version before creating the tag by following [this guide](https://github.com/HathorNetwork/ops-tools/blob/master/docs/sops/hathor-wallet-headless.md#testing-new-versions-with-wallets-monitor)

1. Create a new Release in Github, and tag it with the same version as in step 2. It will trigger a build of the new Docker image to Dockerhub.
