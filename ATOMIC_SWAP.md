# Atomic Swap

This is a how-to of using the atomic-swap feature of the wallet.
Both P2PKH and P2SH (MultiSig) can participate on the atomic-swap.

## Description

An atomic-swap transaction is a transaction with multiple tokens and inputs from different wallets.
The atomic-swap process is how participants can safely coordinate the content and signing of the transaction.

## Atomic-swap process

The process can be divided in 2 phases:
1. Negotiation phase
  - Participants will coordinate the content of the atomic-swap.
1. Signing phase
  - Participants will sign the proposed transaction and exchange the signatures.
  - A participant will collect the signatures and push the signed transaction on the network.

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
    ],
    "outputs": [
      {
        "address": "WXf4xPLBn7HUC7F1U2vY4J5zwpsDS12bT6",
        "value": 1,
        "tokenData": 0
      }
    ]
  }
}
```

## How to: negotiation phase

This phase consists of participants creating a proposal which will be serialized to a string which will be passed among participants.
Each participan will add the tokens they want to send and receive from the transaction, once the transaction is complete the participants can move to the signing phase.

1. Use the `/wallet/atomic-swap/tx-proposal` endpoint to get the proposal string and send to the participants.
1. Each participant should update the proposal string using the `/wallet/atomic-swap/tx-proposal` endpoint and add their tokens and what they expect to receive.
    - proposal strings cannot be merged, only updated, so each participant should take turns updating and sending the updated proposal string.
1. The endpoint will return `isComplete: true` when the proposal string is ready to be signed.
    - The proposal string can still be updated, but it will only be ready to sign again if the funds for inputs and outputs match.

### POST /wallet/atomic-swap/tx-proposal

Create a transaction proposal with multiple inputs and outputs.
inputs, outputs, send_tokens, receive_tokens are operations which will add inputs and outputs to the partial_tx, can use one or many operations at once.

*Body*:
- partial_tx
    - The current proposal string.
    - If not present, will create a new proposal.
- change_address
    - Use this address for change where needed (e.g. sending 10 HTR but the UTXO has 15, a change output will be generated)
    - If not present, an address from the caller wallet will be used.
- send_tokens
  - Will add inputs with the amount of tokens specified, may add a change output if needed.
  - An array of objects with:
    - value
    - token: If not present will default to 00 (HTR)
- receive_tokens
  - Will add outputs with the amount of tokens specified.
  - An array of objects with:
    - value
    - token: If not present will default to 00 (HTR)
    - timelock: If not present, the output will not be timelocked
    - address: If not present, an address from the caller wallet will be chosen
- inputs
  - Will add the specified inputs.
  - An array of objects with:
    - txId
    - index
- outputs
  - Will add the specified outputs.
  - An array of objects with:
    - address
    - value
    - token: If not present, will default to 00 (HTR)
    - timelock: If not present, the output will not be timelocked
- lock
  - Optional, useful for development and "simulations", will be explained on it's own section.


All `value`'s are integers with the value in cents, i.e. 123 HTR means 1.23 HTR.

*Example 1*: Create a new proposal sending and receiving tokens.
```bash
$ curl  -X POST \
        -H "X-Wallet-Id: 123" \
        -H "Content-type: application/json" \
        --data '{ \
                  "send_tokens": [{"value":10,"token":"00"},{"value":10,"token":"0000e68f85f009bf009ada457332d931f3d1655cbc417b5cd2c0da8d84a432d6"}], \
                  "receive_tokens": [{"value":20,"token":"000068a646974845e3b456c3236ff1113581450703fdc78b0b7baf171d4b5d9f"}] \
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
                  "partial_tx": "<proposal string>"
                  "send_tokens": [{"value":20,"token":"000068a646974845e3b456c3236ff1113581450703fdc78b0b7baf171d4b5d9f"}], \
                  "receive_tokens": [{"value":10},{"value":5,"token":"0000e68f85f009bf009ada457332d931f3d1655cbc417b5cd2c0da8d84a432d6"}], \
                  "outputs": [{"address":"WXf4xPLBn7HUC7F1U2vY4J5zwpsDS12bT6","value":5,"token":"0000e68f85f009bf009ada457332d931f3d1655cbc417b5cd2c0da8d84a432d6"}] \
                }' \
        http://localhost:8000/wallet/atomic-swap/tx-proposal
{
    "success": true,
    "data": "<tx-proposal string>",
    "isComplete": true,
}
```

## How to: signing phase

This phase consists of participants signing the agreed upon transaction.
1. Each participant should send the proposal string to the `/wallet/atomic-swap/tx-proposal/get-my-signatures` endpoint to get the signatures.
    1. Send the signatures string to a participant for collection (can be any participant).
1. Once enough signatures are collected any participant can use the `/wallet/atomic-swap/tx-proposal/sign-and-push` to send the transaction.

*== IMPORTANT ==*

1. Remember to use the decode API before signing to understand what is being signed.
1. Once a proposal is signed and the signature is sent to another party that party can send the agreed transaction whenever wanted.
1. If an input on the proposed transaction is spent before the transaction is sent, all signatures will be voided.

### POST /wallet/atomic-swap/tx-proposal/get-my-signatures

Get the signatures for the proposal.
The `isComplete` part of the response indicates if we have all required signatures.

```bash
$ curl  -X POST \
        -H "X-Wallet-Id: 123" \
        -H "Content-type: application/json" \
        --data "{\"partial_tx\":\"<proposalString>\"}" \
        http://localhost:8000/wallet/atomic-swap/tx-proposal/get-my-signatures
{
  "success": true,
  "signatures": "...",
  "isComplete": false
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
