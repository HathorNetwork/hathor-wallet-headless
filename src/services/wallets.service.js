/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Connection, HathorWallet, HistorySyncMode, versionApi } = require('@hathor/wallet-lib');

/**
 * Networks, as the fullnode names them in GET /version, where shielded outputs
 * are active. Privnets are not listed: their names vary and many run without
 * shielded outputs, so a privnet that has them sets enableShieldedOutputs.
 */
const SHIELDED_NETWORKS = ['testnet-shielded-outputs'];

/**
 * The answer for one fullnode: { server, promise }. versionApi asks the
 * fullnode wallet-lib is configured with, config.server, which /reload-config
 * can change; a check for another server asks again.
 */
let shieldedNetworkCheck = null;

/** The last decision logged, so each one is logged once. */
let loggedShieldedDecision = null;

function logShieldedDecision(enabled, source) {
  const decision = `${enabled ? 'on' : 'off'} (${source})`;
  if (decision !== loggedShieldedDecision) {
    loggedShieldedDecision = decision;
    buildAppLogger().info(`Shielded outputs are ${decision}`);
  }
}

/**
 * Whether the wallets use shielded outputs:
 * - `enableShieldedOutputs: true` or `false` in the config decides;
 * - unset, they are on when the fullnode reports a network in SHIELDED_NETWORKS.
 *   The fullnode is asked once per server. A failed request is not kept, so
 *   the next wallet start asks again, and that start fails.
 *
 * It has to be the fullnode's name: the `network` setting is `testnet` both on
 * the shielded testnet and on the testnet without shielded outputs.
 *
 * @param {Object} config Application configuration
 * @returns {Promise<boolean>}
 */
async function isShieldedEnabled(config) {
  const { enableShieldedOutputs } = config;
  if (typeof enableShieldedOutputs === 'boolean') {
    logShieldedDecision(enableShieldedOutputs, 'enableShieldedOutputs');
    return enableShieldedOutputs;
  }
  if (enableShieldedOutputs !== undefined && enableShieldedOutputs !== null) {
    // e.g. 'false' or 0 in a hand-written config.js: don't read it as unset
    throw new Error(`Invalid enableShieldedOutputs: ${sanitizeLogInput(String(enableShieldedOutputs))}. Use true, false, or leave it unset.`);
  }
  if (shieldedNetworkCheck?.server !== config.server) {
    const check = {
      server: config.server,
      promise: versionApi.asyncGetVersion().then(info => info.network),
    };
    check.promise.catch(() => {
      if (shieldedNetworkCheck === check) shieldedNetworkCheck = null;
    });
    shieldedNetworkCheck = check;
  }
  const network = await shieldedNetworkCheck.promise;
  const enabled = SHIELDED_NETWORKS.includes(network);
  logShieldedDecision(enabled, `fullnode network ${sanitizeLogInput(network)}`);
  return enabled;
}

/**
 * Forget the fullnode's answer, so the next wallet start asks again. Called
 * on /reload-config, since the fullnode behind the same URL may have changed.
 */
function resetShieldedNetworkCheck() {
  shieldedNetworkCheck = null;
  loggedShieldedDecision = null;
}

/**
 * Shielded crypto provider, loaded once per process from `@hathor/ct-crypto-node`,
 * a native addon with prebuilds per platform, and only when shielded outputs are
 * on. If it fails to load (no prebuild for the platform, ABI mismatch, blocked by
 * LavaMoat), the failure is logged and the wallets run as with shielded outputs
 * off: they work with transparent funds, and /wallet/status reports the shielded
 * capability reason 'no-provider'.
 */
let cachedShieldedProvider;
let shieldedProviderInitTried = false;
function getShieldedCryptoProvider() {
  if (shieldedProviderInitTried) return cachedShieldedProvider;
  shieldedProviderInitTried = true;
  try {
    // eslint-disable-next-line global-require
    const { createDefaultShieldedCryptoProvider } = require('@hathor/ct-crypto-node/provider');
    cachedShieldedProvider = createDefaultShieldedCryptoProvider();
  } catch (e) {
    cachedShieldedProvider = null;
    // Don't swallow silently: a missing/unloadable native addon (e.g. no
    // prebuild for the host platform, ABI mismatch) disables shielded support,
    // and shielded receives then decode to nothing with no other signal.
    buildAppLogger().warn(
      'Shielded crypto provider failed to load; shielded operations are disabled.',
      { error: sanitizeLogInput(e instanceof Error ? e.message : String(e)) }
    );
  }
  return cachedShieldedProvider;
}
/**
 * Whether a wallet can hold shielded funds: shielded outputs are on, the
 * shielded crypto provider loaded, and the wallet has the shielded scan and
 * spend keys, which only a single-signature wallet started from a seed has
 * (read-only, HSM, Fireblocks and multisig wallets have none).
 *
 * @param {Object} walletConfig Wallet configuration
 * @param {Object} shielded
 * @param {boolean} shielded.shieldedEnabled Whether shielded outputs are on (isShieldedEnabled)
 * @param {Object|null} shielded.shieldedProvider The loaded shielded crypto provider
 * @returns {boolean}
 */
function isShieldedCapable(walletConfig, { shieldedEnabled, shieldedProvider }) {
  return Boolean(
    shieldedEnabled && shieldedProvider && walletConfig.seed && !walletConfig.multisig
  );
}

const { removeAllWalletProposals } = require('./atomic-swap.service');
const { notificationBus } = require('./notification.service');
const { sanitizeLogInput, buildAppLogger } = require('../logger');
const { lock } = require('../lock');
const { walletLoggers, initializeWalletLogger, setupWalletStateLogs } = require('./logger.service');

/**
 * All wallets that were initialized by the user, mapped by their identifier
 * @type {Map<string, HathorWallet>}
 */
const initializedWallets = new Map();

/**
 * A map between Wallet IDs and HSM Key names of the initialized wallets
 * @type {Map<string, string>}
 */
const hsmWalletIds = new Map();

/**
 * Stop a wallet
 * @param {string} walletId
 * @returns {Promise<void>}
 */
async function stopWallet(walletId) {
  // Cleans the wallet from the initialized wallets map
  const wallet = initializedWallets.get(walletId);
  if (!wallet) {
    return;
  }
  // Cleans the wallet from the hard wallets map
  if (hsmWalletIds.has(walletId)) {
    hsmWalletIds.delete(walletId);
  }
  await wallet.stop();
  initializedWallets.delete(walletId);
  walletLoggers.delete(walletId);
  lock.delete(walletId);
  await removeAllWalletProposals(walletId);
}

/**
 * Stop all wallets
 * @returns {Promise<void>}
 * @throws {NonRecoverableConfigChangeError}
 */
async function stopAllWallets() {
  for (const wallet of initializedWallets.values()) {
    await wallet.stop({ cleanStorage: true, cleanAddresses: true });
    wallet.conn.removeAllListeners();
  }

  for (const walletId of Array.from(initializedWallets.keys())) {
    initializedWallets.delete(walletId);
    walletLoggers.delete(walletId);
    await removeAllWalletProposals(walletId);
  }
}

/**
 * Starts the wallet with the given configuration objects:
 * one for the wallet instance and other for the application.
 *
 * Returns an object containing the fullnode version data.
 *
 * @param {string} walletId User identifier for the wallet
 * @param {WalletConfig} walletConfig Wallet configuration
 * @param {Configuration} config Application configuration
 * @param {object} [options={}] Additional options
 * @param {string} [options.hsmKeyName] HSM key name
 * @param {string} [options.historySyncMode] History sync mode
 * @returns {Promise<Object>} Returns the fullnode version data
 */
async function startWallet(walletId, walletConfig, config, options = {}) {
  if (walletConfig.connection) {
    throw new Error('Invalid parameter for startWallet helper');
  }
  const hydratedWalletConfig = { ...walletConfig };
  const [logger, libLogger] = initializeWalletLogger(walletId);

  // Builds the connection object
  hydratedWalletConfig.connection = new Connection({
    network: config.network,
    servers: [config.server],
    connectionTimeout: config.connectionTimeout,
    logger: libLogger,
  });

  // tokenUid is optional but if not passed as parameter the wallet will use HTR
  if (config.tokenUid) {
    hydratedWalletConfig.tokenUid = config.tokenUid;
  }

  // Set the lib logger to the be wallet logger
  hydratedWalletConfig.logger = libLogger;

  // With shielded outputs off the provider is not set: the wallet has no
  // shielded chain and works with transparent funds only
  const shieldedEnabled = await isShieldedEnabled(config);

  const wallet = new HathorWallet(hydratedWalletConfig);
  // Wire the shielded crypto provider before starting the wallet (wallet-lib
  // does not detect it). If it failed to load, the provider is null and
  // shielded operations are unavailable, but the wallet still works for
  // transparent flows.
  const shieldedProvider = shieldedEnabled ? getShieldedCryptoProvider() : null;
  if (shieldedProvider) {
    wallet.setShieldedCryptoProvider(shieldedProvider);
  }
  // The decision, not whether the provider loaded: with shielded outputs on and
  // ct-crypto-node unloadable, every wallet warns that it can't use them
  setupWalletStateLogs(wallet, logger, { shieldedEnabled });

  // Will try to use the options.historySyncMode then config.history_sync_mode
  const configMode = {
    polling_http_api: HistorySyncMode.POLLING_HTTP_API,
    xpub_stream_ws: HistorySyncMode.XPUB_STREAM_WS,
    manual_stream_ws: HistorySyncMode.MANUAL_STREAM_WS,
  }[options?.historySyncMode || config.history_sync_mode];

  // XPUB_STREAM_WS is the default case if nothing was configured.
  let mode = configMode || HistorySyncMode.XPUB_STREAM_WS;

  // Multisig can't use xpub streaming (the fullnode derives only P2PKH from a single xpub),
  // so redirect the default/explicit xpub mode to the client-derived manual stream. Explicit
  // polling_http_api or manual_stream_ws requests pass through unchanged.
  if (hydratedWalletConfig.multisig && mode === HistorySyncMode.XPUB_STREAM_WS) {
    mode = HistorySyncMode.MANUAL_STREAM_WS;
  }
  if (hydratedWalletConfig.scanPolicy?.policy && hydratedWalletConfig.scanPolicy?.policy !== 'gap-limit') {
    // XXX: currently only gap-limit can use streaming modes
    mode = HistorySyncMode.POLLING_HTTP_API;
  }
  const appLogger = buildAppLogger();
  // Only polling discovers and watches the addresses shielded outputs are paid
  // to: under a streaming mode a shielded wallet reports canReceive=false and
  // never sees its shielded receives. Until wallet-lib has a shielded stream
  // sync, a wallet that can hold shielded funds always polls.
  if (isShieldedCapable(hydratedWalletConfig, { shieldedEnabled, shieldedProvider })
    && mode !== HistorySyncMode.POLLING_HTTP_API) {
    if (configMode) {
      appLogger.warn(`Wallet ${sanitizeLogInput(walletId)} can receive shielded outputs, which needs history sync mode ${HistorySyncMode.POLLING_HTTP_API}; ignoring the configured ${configMode}.`);
    }
    mode = HistorySyncMode.POLLING_HTTP_API;
  }
  appLogger.info(`Configuring wallet ${sanitizeLogInput(walletId)} for history sync mode: ${mode}`);
  wallet.setHistorySyncMode(mode);

  if (config.gapLimit) {
    // XXX: The gap limit is now a per-wallet configuration
    // To keep the same behavior as before, we set the gap limit
    // when creating the wallet, but we should move this to the
    // wallet configuration in the future
    await wallet.setGapLimit(config.gapLimit);
  }

  // subscribe to wallet events with notificationBus
  notificationBus.subscribeHathorWallet(walletId, wallet);

  const info = await wallet.start();
  // The replace avoids Log Injection
  appLogger.info(`Wallet started with wallet id ${sanitizeLogInput(walletId)}. \
Full-node info: ${JSON.stringify(info, null, 2)}`);

  initializedWallets.set(walletId, wallet);
  walletLoggers.set(walletId, logger);
  if (options?.hsmKeyName) {
    hsmWalletIds.set(walletId, options.hsmKeyName);
  }
  return info;
}

/**
 * Returns true if a wallet id represents an initialized hardware wallet
 * @param {string} walletId
 * @returns {boolean} True if this is a hardware wallet
 */
function isHsmWallet(walletId) {
  return initializedWallets.has(walletId)
    && hsmWalletIds.has(walletId)
    && hsmWalletIds.get(walletId);
}

module.exports = {
  initializedWallets,
  isShieldedCapable,
  isShieldedEnabled,
  resetShieldedNetworkCheck,
  hsmWalletIds,
  isHsmWallet,
  stopWallet,
  stopAllWallets,
  startWallet,
};
