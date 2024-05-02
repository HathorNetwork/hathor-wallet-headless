# Plugins

## Purpose

Explains plugins.

Each plugin receives an `EventEmitter` with real-time events of the loaded wallets.

## Events

- `wallet:state-changed`
    - The wallet state has changed.
- `wallet:new-tx`
    - A new tx of the wallet has arrived.
- `wallet:update-tx`
    - A tx of the wallet was updated.
- `node:state-changed`
    - Wallet connection state changed.
- `node:wallet-update`
    - When a wallet specific message arrives
- `node:best-block-update`
    - When a new block arrives
    - data: The new block
- `wallet:load-partial-update`
    - Fetched part of the wallet history when loading the wallet.
    - data: The slice of the wallet history.

## Configuration

By default no plugins will run, you need to install the dependencies, configure, and enable plugins.

Each plugin can have it's own configuration outside the usual config module.

To enable a plugin you need to add the plugin to `enabled_plugins` on the config module.
When using docker you can use the cli `--enabled_plugins` or the envvar `HEADLESS_ENABLED_PLUGINS` to configure a list of enabled plugins.

## Provided plugins

### Debug

- PluginId: `debug`

Will log all events to stdout for debugging purposes.

Configuration:
- `--plugin_debug_long` or `HEADLESS_PLUGIN_DEBUG_LONG`
    - Long messages (longer than 1000 chars) can make the stdout unreadable, thus defeating the debugging purpose. By default, long messages are capped, but this can allow the long messages to be logged, or not logged at all.
    - Values: `all`, `off`.

Dependencies:
- `yargs`

`npm install yargs@^16.2.0`

### WebSocket

- PluginId: `ws`

Will create a websocket server and send all events to clients.

Configuration:
- `--plugin_ws_port` or `HEADLESS_PLUGIN_WS_PORT`
    - On which port to run the websocket server.

Dependencies:
- `ws`
- `yargs`

`npm install ws@^8.12.0 yargs@^16.2.0`

### SQS

- PluginId: `sqs`

Will send all events to a SQS instance.

Configuration:
- `--plugin_sqs_region` or `HEADLESS_PLUGIN_SQS_REGION`
    - AWS region of the SQS.
- `--plugin_sqs_queue_url` or `HEADLESS_PLUGIN_SQS_QUEUE_URL`
    - Queue url to send events.
- `--plugin_sqs_endpoint_url` or `HEADLESS_PLUGIN_SQS_ENDPOINT_URL`
    - OPTIONAL, Only use for dev purposes, the aws-sdk will configure this.
    - When developing you can run a local queue, this serves to point the aws-sdk to the local instance.

Dependencies:
- `aws-sdk`
- `yargs`

`npm install aws-sdk@^2.1226.0 yargs@^16.2.0`

### RabbitMQ

- PluginId: `rabbitmq`

Will send all events to a RabbitMQ queue.
This uses the amqplib so it works with any queue instance that uses the Advanced Message Queuing Protocol.

Configuration:
- `--plugin_rabbitmq_queue` or `HEADLESS_PLUGIN_RABBITMQ_QUEUE`
    - Queue name.
- `--plugin_rabbitmq_url` or `HEADLESS_PLUGIN_RABBITMQ_URL`
    - Queue url to send events.

Dependencies:
- `amqplib`
- `yargs`

`npm install amqplib@^0.10.3 yargs@^16.2.0`

## Creating custom plugins

A plugin `MUST` export an `async init` method that receives the `EventEmitter`.
The file or module should be added to `src/plugins` directory.

All of Hathor provided plugins config are on the [`src/plugins/child.js`](./src/plugins/child.js#L29), when running a custom plugin you should configure the plugin using the config module so the headless startup can correctly import and run the plugin.

### Dockerfile

The headless can be extended using docker:

```Dockerfile
FROM hathornetwork/hathor-wallet-headless

RUN npm install any-required-dependencies

COPY ./custom_plugin.js ./src/plugins/custom_plugin.js
```

The `custom_plugin.js` file will have the plugin logic.

### Custom plugin configuration

To configure custom plugins you need to add the plugin id to the [enabled plugins](#configuration) and for each custom plugin there should be 2 new variables, the `--plugin_<pluginId>_file` (or `HEADLESS_PLUGIN_<pluginId>_FILE`) and `--plugin_<pluginId>_name` (or `HEADLESS_PLUGIN_<pluginId>_NAME`).

Any configuration of the plugin itself will be made outside the config module.
