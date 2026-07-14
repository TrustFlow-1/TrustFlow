// Wraps @stellar/stellar-sdk's dynamic contract Client so the rest of the
// app can call TrustFlow's contract functions as plain async methods.
// Client.from() reads the contract's on-chain spec, so no generated
// bindings are required here.

import { Client } from "https://esm.sh/@stellar/stellar-sdk@13/contract";

let cachedClient = null;
let cachedKey = "";

async function getClient({ contractId, rpcUrl, networkPassphrase, publicKey, signTransaction }) {
  const key = `${contractId}|${rpcUrl}|${publicKey ?? ""}`;
  if (cachedClient && cachedKey === key) return cachedClient;

  cachedClient = await Client.from({
    contractId,
    rpcUrl,
    networkPassphrase,
    publicKey,
    signTransaction,
  });
  cachedKey = key;
  return cachedClient;
}

/** Simulate-only call for read-only contract functions (no auth, no submit). */
async function readCall(env, method, args) {
  const client = await getClient(env);
  const tx = await client[method](args);
  return tx.result;
}

/** Simulate, sign, and submit a state-changing contract call. */
async function writeCall(env, method, args) {
  const client = await getClient(env);
  const tx = await client[method](args);
  const { result } = await tx.signAndSend();
  return result;
}

export async function getTrust(env, node) {
  return readCall(env, "get_trust", { node });
}

export async function balance(env, funder, tokenId) {
  return readCall(env, "balance", { funder, token_id: tokenId });
}

export async function setTrust(env, caller, peers) {
  return writeCall(env, "set_trust", { caller, peers });
}

export async function clearTrust(env, caller) {
  return writeCall(env, "clear_trust", { caller });
}

export async function deposit(env, funder, tokenId, amount) {
  return writeCall(env, "deposit", { funder, token_id: tokenId, amount });
}

export async function withdraw(env, funder, tokenId, amount) {
  return writeCall(env, "withdraw", { funder, token_id: tokenId, amount });
}

export async function distribute(env, funder, tokenId, amount, maxHops) {
  return writeCall(env, "distribute", {
    funder,
    token_id: tokenId,
    amount,
    max_hops: maxHops,
  });
}

/**
 * BFS-crawl the on-chain trust graph starting at `origin`, calling
 * get_trust for each newly-discovered node. Bounded by maxHops and
 * maxNodes so a large or cyclic graph can't hang the browser.
 */
export async function crawlTrustGraph(env, origin, maxHops, maxNodes = 60) {
  const nodes = new Set([origin]);
  const edges = [];
  const levels = new Map([[origin, 0]]);

  let frontier = [origin];
  let hop = 0;
  while (hop < maxHops && frontier.length > 0 && nodes.size < maxNodes) {
    const next = [];
    for (const node of frontier) {
      const peers = await getTrust(env, node);
      for (const peer of peers) {
        edges.push([node, peer]);
        if (!nodes.has(peer) && nodes.size < maxNodes) {
          nodes.add(peer);
          levels.set(peer, hop + 1);
          next.push(peer);
        }
      }
    }
    frontier = next;
    hop += 1;
  }

  return { nodes: [...nodes], edges, levels };
}
