# Atomic swaps

## Purpose

This is a how-to of using the atomic-swap feature of the wallet.
Both P2PKH and P2SH (MultiSig) can participate on the atomic-swap.

## Description

An atomic-swap transaction is a transaction with multiple tokens and inputs from different wallets.
The atomic-swap process is how participants can safely coordinate the content and signing of a transaction.

## Atomic-swap process

The process can be divided in 2 phases:
1. Negotiation phase
  - Participants will coordinate the content of the atomic-swap.
1. Signing phase
  - Participants will sign the proposed transaction and exchange the signatures.
  - A participant will collect the signatures and push the signed transaction on the network.

### Simulation

Let's divide the steps from an atomic-swap using a simulated exchange between Alice and Bob.

1. Alice and Bob agree that Bob will send 10 HTR to Alice in exchange for 20 TKa (Token Alice).
2. Bob starts a proposal with his side of the swap (sending 10 HTR and receiving 20 TKa to one of his addresses).
    - Uses `POST /wallet/atomic-swap/tx-proposal`
    - He will send the serialized proposal to Alice.
    - Alice will check the contents of the proposal with the decode api
3. Alice will update the proposal with her side of the swap (sending 20 TKa and receiving 10 HTR to one of her addresses).
    - Uses `POST /wallet/atomic-swap/tx-proposal`
    - The serialized proposal generated here will be complete and should be used by both participants for signing.
    - Both participants should use the decode api to check
4. Alice and Bob will use the get-my-signatures to generate their signatures.
    - Uses `POST /wallet/atomic-swap/get-my-signatures`
5. Either Bob or Alice will collect all signatures and use the sign-and-push api to send the transaction to the network.
    - Uses `POST /wallet/atomic-swap/sign-and-push`

## Decoding the proposal string

A proposal string will be created and passed among participants during the atomic-swap and it can be confusing since it's not human readable.
That's why you should use the decode API to get the current state of the proposal.

### POST /wallet/decode

Check what is contained on a proposal string.

```bash
$ curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data "{\"partial_tx\":\"<proposalString>\"}" http://localhost:8000/wallet/decode
{
  "success": true,
  "tx": {
    "inputs": [
      {
        "txId": "00c7797738d890d1517f637f2af079d8daa4449fdfd098d2d636bb0e30c809d1",
        "index": 1
      }
      {
        "txId": "0000f9e7e382c8927208c15aa9cb59d3c39c1c6c7b631fbec3c1d9e455427c06",
        "index": 0
      }
      {
        "txId": "00006e5abb9138c7f5b504cad2af25a96f4ae2ed48310a93f5a4da825d420b33",
        "index": 0
      }
    ],
    "outputs": [
      {
        "address": "WXf4xPLBn7HUC7F1U2vY4J5zwpsDS12bT6",
        "value": 100,
        "tokenData": 0
      }
      {
        "address": "WXN7sf6WzhpESgUuRCBrjzjzHtWTCfV8Cq",
        "value": 50,
        "tokenData": 1
      }
    ],
    "tokens": []
  }
}
```

## How to: negotiation phase

This phase consists of participants creating a proposal which will be serialized to a string which will be passed among participants.
Each participant will add the tokens they want to send and receive from the transaction, once the transaction is complete the participants can move to the signing phase.

1. Use the `/wallet/atomic-swap/tx-proposal` endpoint to get the proposal string and send to the participants.
1. Each participant should update the proposal string using the `/wallet/atomic-swap/tx-proposal` endpoint and add their tokens and what they expect to receive.
    - proposal strings cannot be merged, only updated, so each participant should take turns updating and sending the updated proposal string.
1. The endpoint will return `isComplete: true` when the proposal string is ready to be signed.
    - The proposal string can still be updated, but it will only be ready to sign again if the funds for inputs and outputs match.

### POST /wallet/atomic-swap/tx-proposal

Create a transaction proposal with multiple inputs and outputs.
`send` and `receive` are operations which will add inputs and outputs to the `partial_tx`. You can use one or both operations.

*Body*:
- partial_tx
    - The current proposal string.
    - If not present, will create a new proposal.
- change_address
    - Use this address for change where needed (e.g. sending 10 HTR but the UTXO has 15, a change output will be generated)
    - If not present, an address from the caller wallet will be used.
- send
  - Used to add inputs to the swap, may add a change output if needed
  - properties:
    - tokens
      - Used to specify the tokens to send.
      - Is an array of objects with properties:
        - value: number of tokens to send
        - token: Token UID, if not present will default to 00 (HTR)
    - utxos
      - optional, select tokens ONLY from these utxos instead of the available wallet utxos.
      - properties:
        - txId: transaction id of the utxo
        - index: number
- receive
  - Used to add outputs to the swap.
  - properties:
    - tokens
      - Used to specify the output tokens.
      - Is an array of objects with properties:
        - value: number of tokens to send
        - token: Token UID, if not present will default to 00 (HTR)
        - timelock: If not present, the output will not be timelocked
        - address: If not present, an address from the caller wallet will be chosen
- lock
  - Optional, useful for development and "simulations", will be explained on it's own section.

All `value`'s are integers with the value in cents, i.e. 123 HTR means 1.23 HTR.

*Example 1*: Create a new proposal sending and receiving tokens.
```bash
$ curl  -X POST \
        -H "X-Wallet-Id: 123" \
        -H "Content-type: application/json" \
        --data '{ \
                  "send": {"tokens": [{"value":10,"token":"00"},{"value":10,"token":"0000e68f85f009bf009ada457332d931f3d1655cbc417b5cd2c0da8d84a432d6"}]}, \
                  "receive": {"tokens": [{"value":20,"token":"000068a646974845e3b456c3236ff1113581450703fdc78b0b7baf171d4b5d9f"}]} \
                }' \
        http://localhost:8000/wallet/atomic-swap/tx-proposal
{
    "success": true,
    "data": "<proposal string>",
    "isComplete": false,
}
```

*Example 2*: Update a proposal.
```bash
$ curl  -X POST \
        -H "X-Wallet-Id: 123" \
        -H "Content-type: application/json" \
        --data '{ \
                  "partial_tx": "<proposal string>", \
                  "send": {"tokens": [{"value":20,"token":"000068a646974845e3b456c3236ff1113581450703fdc78b0b7baf171d4b5d9f"}]}, \
                  "receive": {"tokens": [{"value":10},{"value":5,"token":"0000e68f85f009bf009ada457332d931f3d1655cbc417b5cd2c0da8d84a432d6"}]}, \
                }' \
        http://localhost:8000/wallet/atomic-swap/tx-proposal
{
    "success": true,
    "data": "<tx-proposal string>",
    "isComplete": true,
}
```

*Example 3*: Adding specific utxos.
```bash
$ curl  -X POST \
        -H "X-Wallet-Id: 123" \
        -H "Content-type: application/json" \
        --data '{ \
                  "partial_tx": "<proposal string>", \
                  "send": { \
                    "tokens": [{"value":20,"token":"000068a646974845e3b456c3236ff1113581450703fdc78b0b7baf171d4b5d9f"}], \
                    "utxos": [{"txId": "000068a646974845e3b456c3236ff1113581450703fdc78b0b7baf171d4b5d9f", "index": 1}], \
                    }, \
                }' \
        http://localhost:8000/wallet/atomic-swap/tx-proposal
{
    "success": true,
    "data": "<tx-proposal string>",
    "isComplete": true,
}
```
Obs: This may still add a change output if the utxo has more tokens than the requested on `send.tokens`.

## How to: signing phase

This phase consists of participants signing the agreed upon transaction.
1. Each participant should send the proposal string to the `/wallet/atomic-swap/tx-proposal/get-my-signatures` endpoint to get the signatures.
    1. Send the signatures string to a participant for collection (can be any participant).
1. Once enough signatures are collected any participant can use the `/wallet/atomic-swap/tx-proposal/sign-and-push` to send the transaction.

*== IMPORTANT ==*

1. Remember to use the decode API before signing to understand what is being signed.
1. Once a proposal is signed and the signature is sent to another party, that party can send the agreed transaction whenever wanted.
1. If an input on the proposed transaction is spent before the transaction is sent, all signatures will be voided.

### POST /wallet/atomic-swap/tx-proposal/get-my-signatures

Get the signatures for the proposal.

```bash
$ curl  -X POST \
        -H "X-Wallet-Id: 123" \
        -H "Content-type: application/json" \
        --data "{\"partial_tx\":\"<proposalString>\"}" \
        http://localhost:8000/wallet/atomic-swap/tx-proposal/get-my-signatures
{
  "success": true,
  "signatures": "..."
}
```

### POST /wallet/atomic-swap/tx-proposal/sign-and-push

Assemble a transaction with the participant signatures and send it to the network.

```bash
$ curl  -X POST \
        -H "X-Wallet-Id: 123" \
        -H "Content-type: application/json" \
        --data '{"partial_tx": "...", "signatures":["sigstr0...","sigstr1..."]}' \
        http://localhost:8000/wallet/atomic-swap/tx-proposal/sign-and-push
{
  "success": true,
  "hash": "00004fb4e4b2db216e6314f1e6e9be73118b3974ea7180044edf5851d0a31045",
  "inputs": [
    {
      "hash": "00c7797738d890d1517f637f2af079d8daa4449fdfd098d2d636bb0e30c809d1",
      "index": 1,
      "data": {
        "type": "Buffer",
        "data":[...]
      },
      "tx_id": "00c7797738d890d1517f637f2af079d8daa4449fdfd098d2d636bb0e30c809d1"
    }
  ],
  "outputs": [
    {
      "value": 1,
      "script": {
        "type": "Buffer",
        "data": []
      },
      "tokenData": 0,
      "decodedScript": {
        "address": {
          "base58": "WXf4xPLBn7HUC7F1U2vY4J5zwpsDS12bT6",
          "network": {...}
        },
        "timelock": null
      },
      "token_data": 0
    }
  ],
  "version": 1,
  "weight": 17.13552634501032,
  "nonce": 95503,
  "timestamp": 1647035043,
  "parents": [
    "007ae58167abb0e63d6879c437659c7f20ecc8a74531bcc612367735bbc191cc",
    "000489804c1924510d3a2fb5e9a5b71df6e82436dc74fa4b7bfae72bd5502805"
  ],
  "tokens": [],
}
```

## Multisig

If a MultiSig wallet wants to participate in an atomic-swap the signing process is a bit different since the signature of a MultiSig requires a set number of participants signatures.

Once you arrive at the signing phase you should extract the transaction hex from the proposal string.

The transaction hex is the second element when spliting the proposal string by the `|` character.
Proposal string: `PartialTx|<txHex>|...|...`

### Simulation

Let's use the same simulation from the P2PKH but in this case Bob is a MultiSig wallet of Bob and Carl.
To better understand the actors, we have:
- Alice, Bob and Carl, each with their own wallet-headless running on their infrastructure.
- Alice and Alice's wallet are used interchangeably since it's a P2PKH with 1 owner.
- [Bob,Carl] will the used to reference the MultiSig wallet of Bob and Carl.

1. Alice, Bob and Carl agree that [Bob,Carl] will send 10 HTR to Alice in exchange for 20 TKa (Token Alice).
2. Bob starts a proposal with his side of the swap (sending 10 HTR and receiving 20 TKa to one of his addresses).
    - Uses `POST /wallet/atomic-swap/tx-proposal`
    - He will send the serialized proposal to Alice.
    - Alice will check the contents of the proposal with the decode api
3. Alice will update the proposal with her side of the swap (sending 20 TKa and receiving 10 HTR to one of her addresses).
    - Uses `POST /wallet/atomic-swap/tx-proposal`
    - The serialized proposal generated here will be complete and should be sent to all participants.
    - All participants should use the decode api to check the proposal.
4. Alice will use the get-my-signatures to generate their signatures.
    - Uses `POST /wallet/atomic-swap/get-my-signatures`
5. Bob and Carl will use the `p2sh` APIs to sign the txHex of the complete proposal.
    - Uses `POST /wallet/p2sh/tx-proposal/get-my-signatures`
    - The result will be a transaction hex with only the inputs from [Bob,Carl] signed.
6. Bob will extract the signatures from the transaction hex generated.
    - Uses `POST /wallet/atomic-swap/tx-proposal/get-input-data`
    - Will return a serialized signature to be used on the atomic-swap APIs
5. Either Alice, Bob or Carl will collect all signatures and use the sign-and-push api to send the transaction to the network.
    - Uses `POST /wallet/atomic-swap/sign-and-push`

### POST /wallet/atomic-swap/tx-proposal/get-input-data

Will extract the input data from a txHex and return a serialized PartialTxInputData.

```bash
$ curl  -X POST \
        -H "X-Wallet-Id: 123" \
        -H "Content-type: application/json" \
        --data "{\"txHex\":\"<transaction hex>\"}" \
        http://localhost:8000/wallet/atomic-swap/tx-proposal/get-input-data
{
  "success": true,
  "signatures": "..."
}
```

## Lock mechanism

When creating and updating proposals the default behavior is to lock the inputs added (i.e. mark as already selected).
The lock mechanism is a safety measure so that the proposal stays valid, even if the wallet is used for sending tokens or if there are multiple on-going atomic-swaps.
This lock does not persist after a restart and if an input of the proposal is spent for any reason, the previously created proposal will be voided.

But for development purposes or if the caller wants to make a "simulation" (i.e. check if there is no issues when creating the transaction like lack of funds) the lock mechanism can be bypassed.
The way to bypass is to send the parameter `lock` as `false` when creating/updating the tx-proposal.
This `lock=false` will only be valid for the operations on the call it is made.

If, for any reason, the user does not want to keep the inputs locked for this proposal they can unlock the inputs with the `/wallet/atomic-swap/tx-proposal/unlock` API.

### POST /wallet/atomic-swap/tx-proposal/unlock

Will unlock all inputs of the caller's wallet present on the proposal string.

```bash
$ curl  -X POST \
        -H "X-Wallet-Id: 123" \
        -H "Content-type: application/json" \
        --data "{\"partial_tx\":\"<proposalString>\"}" \
        http://localhost:8000/wallet/atomic-swap/tx-proposal/unlock
{
  "success": true,
}
```
