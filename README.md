# Hathor headless wallet

[![codecov](https://codecov.io/gh/HathorNetwork/hathor-wallet-headless/branch/master/graph/badge.svg?token=NZ3BPUX9V7)](https://codecov.io/gh/HathorNetwork/hathor-wallet-headless)

## Description

A **headless wallet** is a wallet application whose interface is an API.

**Hathor headless wallet** is the official headless wallet of Hathor. It is intended for use by external systems that integrate with Hathor Network, specifically for managing their wallets.

## Operation and usage

To know how to operate and use Hathor headless wallet, see [Hathor headless wallet at Hathor docs — official technical documentation of Hathor](https://docs.hathor.network/pathways/components/headless-wallet).

### Running with Docker

The easiest way to run the headless wallet is with Docker. Pre-built images are available on [Docker Hub](https://hub.docker.com/r/hathornetwork/hathor-wallet-headless):

```bash
docker run -p 8000:8000 --env-file .env.headless hathornetwork/hathor-wallet-headless
```

Where `.env.headless` contains your configuration (do not commit this file):

```
HEADLESS_NETWORK=mainnet
HEADLESS_SERVER=https://node1.mainnet.hathor.network/v1a/
HEADLESS_SEED_DEFAULT=your seed words here
HEADLESS_API_KEY=your_api_key
```

### Running from source

Requirements: Node.js >= 22.0.0, npm >= 10.0.0.

```bash
# Install all dependencies (needed for the build step)
npm ci

# Copy and edit the configuration file
cp config.js.template config.js
# Edit config.js with your settings (seed, network, server, etc.)

# Build the project
npm run build

# Remove dev dependencies so the runtime matches the LavaMoat policy
rm -rf node_modules
npm ci --only=production

# Run
npm run start:lavamoat
```

> **Note:** The [LavaMoat](https://github.com/LavaMoat/LavaMoat) security policy is generated against production dependencies. Dev dependencies change the dependency resolution paths, causing policy violations at runtime. That's why dev dependencies must be removed after building.

### Development

For local development without LavaMoat:

```bash
npm ci
cp config.js.template config.js
# Edit config.js with your settings

# Run without LavaMoat (uses nodemon for auto-reload)
npm run dev

# Or build and run without LavaMoat
npm run start
```

To test with LavaMoat locally, follow the [Running from source](#running-from-source) steps above.

### Regenerating the LavaMoat policy

When dependencies change, the LavaMoat policy must be regenerated. Use the provided script that generates the policy against production dependencies inside Docker:

```bash
make lavamoat_policy
```

This requires Docker to be running. The script builds the project with the Docker config, spins up a container with production-only `node_modules`, and runs `lavamoat --autopolicy` inside it.

## Support

If after consulting the documentation, you still need **help to operate and use Hathor headless wallet**, [send a message to the `#development` channel on Hathor Discord server for assistance from Hathor team and community members](https://discord.com/channels/566500848570466316/663785995082268713).

If you observe an incorrect behavior while using Hathor headless wallet, see [the "Issues" subsection in "Contributing"](#issues).

## Tests

The Hathor headless wallet is tested automatically with unit tests and integration tests. See the following documentation for more information:
- [Testing guidelines](/docs/testing.md)

Eventually, some changes to plugins or scripts may require specific testing not covered by those automated tests, but those should be analyzed case by case on each PR.

## Contributing

### Issues

If you observe an incorrect behavior while using Hathor headless wallet, we encourage you to [open an issue to report this failure](https://github.com/HathorNetwork/hathor-wallet-headless/issues/new).

You can also [open an issue to request a new feature you wish to see](https://github.com/HathorNetwork/hathor-wallet-headless/issues/new).

### Pull requests

To contribute to the development of Hathor headless wallet, we encourage you to fork the `master` branch, implement your code, and then [open a pull request to merge it into `master`, selecting the "feature branch template"](https://github.com/HathorNetwork/hathor-wallet-headless/compare).

### Security

Please do not open an issue to report a security breach nor submit a pull request to fix it. Instead, follow the guidelines described in [SECURITY](SECURITY.md) for safely reporting, fixing, and disclosing security issues.

## Miscellaneous

A miscellany with additional documentation and resources:
- [Subdirectory docs](docs/README.md): supplementary documentation of Hathor headless wallet.
- [Docker images at Docker Hub](https://hub.docker.com/r/hathornetwork/hathor-wallet-headless)
- To know more about Hathor from a general or from a business perspective, see [https://hathor.network](https://hathor.network).
- To know more about Hathor from a technical perspective, see [https://docs.hathor.network](https://docs.hathor.network).
