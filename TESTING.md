# Testing the Wallet Headless
The tests on this application use the [`jest`](https://jestjs.io/) tool and are divided in two contexts:
- One with a mocked connection to the infrastructure **(unit tests)**
- One with a live private network environment **(integration tests)**

To run the mocked tests, use the command:
```sh
npm run test
```

To run the integration tests:
```sh
npm run test_integration
```

# Mocked Context
The configuration for the unit tests are on the [`./jest.config.js` file](https://github.com/HathorNetwork/hathor-wallet-headless/blob/master/jest.config.js). The resulting test coverage is stored on the `./coverage/` folder.

Its mocked connections with the infrastructure are initialized on the [`./setupTests.js` file](https://github.com/HathorNetwork/hathor-wallet-headless/blob/master/setupTests.js). The application config file, the HTTP responses from the mocked network are stored on the [`./__tests__/__fixtures__/`](https://github.com/HathorNetwork/hathor-wallet-headless/tree/master/__tests__/__fixtures__) folder.

## Known Issues
### Static state
The responses from the blockchain infrastructure are static and do not change with any manipulations made via HTTP requests. So, all of the blockchain's current state has to be hardcoded on the `http-fixtures.js` and `ws-fixtures.js` files.

### Single wallet-id
Because of the static response received from the mocks, it is only possible to initialize a single wallet `seed` + `walletId`.

On the test suite for `/start`, multiple tests end up conflicting for the use of the same wallet id and fail consistently.

Some dynamic response (or other solution) should be built to avoid this situation.

# Integration Tests
The configuration for the integration tests are on the [`./jest-integration.config.js` file](https://github.com/HathorNetwork/hathor-wallet-headless/blob/master/jest.config.js). The resulting test coverage is stored on the `./coverage-integration/` folder. The private network is fully instantiated following the integration test's [`./__tests__/integration/docker-compose.yml` file](https://github.com/HathorNetwork/hathor-wallet-headless/blob/master/__tests__/integration/docker-compose.yml).

On the [`./setupTests-integration.js` file](https://github.com/HathorNetwork/hathor-wallet-headless/blob/master/setupTests.js):
- The application `config.js` file is retrieved from a fixtures folder
- All benchmarks files are handled to measure test times
- The precalculated wallets persistent file is handled between test suites

## Persistent data
Unlike the mocked tests, these integration tests have many places where state is stored between and after tests and suites. This demands an extra caution when developing the tests to avoid some pitfalls.

### The Blockchain
On its default configuration, the test privatenet's fullnode stores blockchain information only on memory. This means that state is kept between each instance of `test_network_up` and `test_network_down`.

When calling `npm run test_integration`, in case the test is fully successful, the private network containers will be taken down and the blockchain state is destroyed. In case the test has any failures, the `test_network_down` script will not be executed and will keep the `fullnode`, the `tx-mining-service` and the `cpuminer` running on background for further investigation from the developer.

#### On services' versions
In case new images for the infrastructure services become available and are needed for testing new features, it is important to check if Docker is updating the local images to instantiate them.

This can be done using:
```sh
# List all docker images currently available on the developer environment
docker image ls

# If a version is obsolete, update it with
docker image pull hathornetwork/service-name:latest
```

### The pre-calculated wallets file
On `test_network_up` the `precalculated-wallets.json` file is copied to the `./tmp/wallets.json` file to be used by the tests, saving time on the calculation of wallet addresses.

On `test_network_down` this file is destroyed. But, just like the private network described above, in case the test run fails this step will not be executed and the `wallets.json` file will be available for debugging.

### Re-using existing state for new test runs
The `test_network_up` and `test_network_down` scripts, when run in isolated, build and destroy the test environment. The `test_network_integration` script is the one actually responsible for executing the tests.

So, if a developer wants to reuse existing blockchain / wallets file, this is possible by running
```sh
npm run test_network_integration
```
