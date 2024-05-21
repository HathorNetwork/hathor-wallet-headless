# Dinamo Networks HSM integration specs

## Description

The HSM integration allows you to connect your wallet with the HSM of Dinamo Networks.
This means the wallet is managed by the headless but the private keys are stored in the HSM.

## Configuration

The configuration requires the HSM host, user and password to connect to the HSM.

You will also need to create an HSM key to use with the wallet.

### Docker

Environment variables:

- `HEADLESS_HSM_HOST`: HSM host
- `HEADLESS_HSM_USERNAME`: HSM username
- `HEADLESS_HSM_PASSWORD`: HSM password

CLI arguments:

- `--hsm-host`: HSM host
- `--hsm-username`: HSM username
- `--hsm-password`: HSM password

### Running locally

When running locally you write the `src/config.js` file and set the configuration in it.
The config names are slightly different but work the same way as in the docker config.

- `hsmHost`
- `hsmUsername`
- `hsmPassword`

### Creating an HSM key

You will need to run a command to create the HSM key in the docker container

The following command will create a key named `abc`.

```bash
docker run --env-file=./.env --entrypoint make hathornetwork/hathor-wallet-headless create_hsm_key keyname=abc
```

The `.env` file contains the configuration needed to connect to the HSM.
Once created you need to save the keyname chosen for your key.

## Starting the wallet

The HSM integration allows you to use the common endpoints of the headless wallet to manage the HSM wallet, but to do so you need to start the wallet with the `/hsm/start` endpoint.

Example:

```bash
curl -X POST -H "Content-Type: application/json" --data '{"hsm-key": "abc", "wallet-id": "w1"}' 'http://localhost:3000/hsm/start'
```

The `w1` wallet will now be connected to HSM, you can use the usual endpoints to send transactions and manage tokens.


<details>
 <summary><code>POST</code> <code><b>/hsm/start</b></code> <code>(Start a wallet with an HSM key)</code></summary>

##### Parameters

> | name | type | data type | description | location |
> | --- | --- | --- | --- | --- |
> | hsm-key | required | string | HSM key name | body |
> | wallet-id | required | string | Local ID of the wallet to create | body |

##### Responses

> | http code | content-type | response |
> | --- | --- | --- |
> | `200` | `application/json` | `{"success":true}` |
> | `200` | `application/json` | `{"success":false,"message":"Parameter 'wallet-id' is required"}` |
> | `200` | `application/json` | `{"success":false,"message":"<HSM error>"}` |
> | `500` | `application/json` | `{"success":"false","message":"Failed to start wallet"}` |

##### Example cURL

> ```bash
>  curl -X POST -H "Content-Type: application/json" \
>    --data '{"hsm-key": "cafe", "wallet-id": "cafe"}' \
>    'http://localhost:3000/hsm/start'
> ```

</details>
