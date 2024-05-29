# Fireblocks integration

## Description

The Fireblocks integration allows you to connect your wallet with Fireblocks using the RAW transaction signing method.
This means that the transaction is managed by the headless wallet and not by the Fireblocks API or dashboard.
We do not use the Fireblocks SDK and implement the client using the Fireblocks API v1 directly (implemented and checked against version 1.7.4).

## Configuration

The configuration requires an api key and secret which can be created on the Fireblocks dashboard.
Under `Settings > Users` you can create a new API user with the `Editor` role and copy the API key and secret.

The API key and secret are used to authenticate requests to the Fireblocks API.
You will also need the account level xPub to start your wallet.

### Docker

When running on docker you need to add the secret as a file in the container, this can be used with [volumes](https://docs.docker.com/storage/volumes/).
Then you need to configure the headless with the API key and path to the secret file in the container environment, you can use either cli arguments or environment variables to pass these configs.

Environment variables:

- `HEADLESS_FIREBLOCKS_API_KEY`: API key string
- `HEADLESS_FIREBLOCKS_API_SECRET_FILE`: path to API secret file

CLI arguments:

- `--fireblocks-api-key`: API key string
- `--fireblocks-api-secret-file`: path to API secret file

### Running locally

When running locally you write the `src/config.js` file and set the configuration in it.
The config names are slightly different but work the same way as in the docker config.

- `fireblocksApiKey`
- `fireblocksApiSecretFile`

You can optionally use the `fireblocksApiSecret` to configure the secret as a string, but it's not recommended.

### Generating account level xPub

First you need to get the root xPub from the Fireblocks dashboard.
Under `Settings > General > Extended public keys` you can copy your root xPub (ECDSA extended public key)

Then you will need to derive it to the account level xPub using the following command:

```bash
docker run -it --rm --entrypoint node hathornetwork/hathor-wallet-headless dist-scripts/fireblocks_derive_xpub.js xpub00...
```

Copy and save your account level xPub.

Obs: if you wish to derive it using your own tools you need to use the `m/44/280/0` derivation path since Fireblocks do not use the usual BIP44 derivation path.

## Starting the wallet

The Fireblocks integration allows you to use the common endpoints of the headleess wallet to manage the Fireblocks wallet, but to do so you need to start the wallet with the `/fireblocks/start` endpoint.

Example:

```bash
curl -X POST -H "Content-Type: application/json" --data '{"xpub": "xpubABC...", "wallet-id": "w1"}' 'http://localhost:8000/fireblocks/start'
```

The `w1` wallet will now be connected to Fireblocks, you can use the usual endpoints to send transactions and manage tokens.

<details>

 <summary><code>POST</code> <code><b>/wallet/fireblocks/start</b></code> <code>(Start a wallet with the fireblocks integration)</code></summary>

##### Parameters

> | name | type | data type | description | location |
> | --- | --- | --- | --- | --- |
> | xpub | required | string | The xpub of the wallet | body |
> | wallet-id | required | string | create a wallet with this id | body |

##### Responses

> | http code | content-type | response |
> | --- | --- | --- |
> | `200` | `application/json` | `{"success":true}` |
> | `200` | `application/json` | `{"success": false, "message":"Bad Request"}` |

##### Example cURL

> ```javascript
>  curl -X POST -H "Content-Type: application/json" --data '{"xpub-id": "cafe", "wallet-id": "cafe"}' 'http://localhost:8000/fireblocks/start'
> ```

</details>
