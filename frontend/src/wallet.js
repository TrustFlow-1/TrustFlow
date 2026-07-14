// Thin wrapper around @stellar/freighter-api so the rest of the app doesn't
// deal with its error-object-instead-of-throw conventions directly.

import * as freighter from "https://esm.sh/@stellar/freighter-api@4";

export async function isFreighterInstalled() {
  const res = await freighter.isConnected();
  return !res.error && res.isConnected;
}

export async function connectWallet() {
  const res = await freighter.requestAccess();
  if (res.error) throw new Error(res.error.message ?? "Freighter access denied");
  return res.address;
}

export async function getAddress() {
  const res = await freighter.getAddress();
  if (res.error) throw new Error(res.error.message ?? "Could not read Freighter address");
  return res.address;
}

/**
 * Returns a signTransaction function matching the shape expected by
 * @stellar/stellar-sdk's contract Client: (xdr, opts) => { signedTxXdr }.
 */
export function makeSigner(networkPassphrase, address) {
  return async function signTransaction(xdr) {
    const res = await freighter.signTransaction(xdr, { networkPassphrase, address });
    if (res.error) throw new Error(res.error.message ?? "Freighter signing failed");
    return { signedTxXdr: res.signedTxXdr, signerAddress: res.signerAddress };
  };
}
