import { getConfig, setContractId, setNetwork } from "./config.js";
import { isFreighterInstalled, connectWallet, makeSigner } from "./wallet.js";
import * as tf from "./contract.js";
import { renderGraph } from "./graph.js";

const $ = (id) => document.getElementById(id);
const logEl = $("log");

function log(message, isError = false) {
  const time = new Date().toLocaleTimeString();
  logEl.textContent += `[${time}] ${isError ? "ERROR: " : ""}${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function parsePeers(raw) {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseAmount(raw) {
  if (!/^[0-9]+$/.test(raw.trim())) {
    throw new Error("Amount must be a non-negative integer");
  }
  return BigInt(raw.trim());
}

let state = {
  publicKey: null,
  signTransaction: null,
};

function currentEnv() {
  const cfg = getConfig();
  if (!cfg.contractId) throw new Error("Set a Contract ID in the Network panel first");
  return {
    contractId: cfg.contractId,
    rpcUrl: cfg.rpcUrl,
    networkPassphrase: cfg.networkPassphrase,
    publicKey: state.publicKey,
    signTransaction: state.signTransaction,
  };
}

function requireWallet() {
  if (!state.publicKey) throw new Error("Connect your wallet first");
}

async function guarded(action, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(err);
    log(`${action} failed: ${err.message ?? err}`, true);
  }
}

// ── Network / config panel ──────────────────────────────────────────────

function initConfigPanel() {
  const cfg = getConfig();
  $("network-select").value = cfg.network;
  $("contract-id").value = cfg.contractId;

  $("network-select").addEventListener("change", (e) => {
    setNetwork(e.target.value);
    log(`Network set to ${e.target.value}`);
  });

  $("contract-id").addEventListener("change", (e) => {
    setContractId(e.target.value);
    log(`Contract ID saved: ${e.target.value.trim()}`);
  });
}

// ── Wallet ───────────────────────────────────────────────────────────────

function initWallet() {
  $("connect-btn").addEventListener("click", () =>
    guarded("Connect wallet", async () => {
      if (!(await isFreighterInstalled())) {
        throw new Error("Freighter wallet extension not detected");
      }
      const address = state.publicKey ?? (await connectWallet());
      state.publicKey = address;
      const cfg = getConfig();
      state.signTransaction = makeSigner(cfg.networkPassphrase, address);

      $("wallet-address").textContent = `${address.slice(0, 4)}…${address.slice(-4)}`;
      $("wallet-address").classList.remove("hidden");
      $("connect-btn").textContent = "Connected";
      $("connect-btn").disabled = true;
      log(`Wallet connected: ${address}`);
    })
  );
}

// ── Trust graph panel ────────────────────────────────────────────────────

function initTrustPanel() {
  $("set-trust-btn").addEventListener("click", () =>
    guarded("Set trust", async () => {
      requireWallet();
      const peers = parsePeers($("trust-peers").value);
      if (peers.length === 0) throw new Error("Enter at least one peer address");
      await tf.setTrust(currentEnv(), state.publicKey, peers);
      log(`Trust set: ${peers.length} peer(s)`);
    })
  );

  $("clear-trust-btn").addEventListener("click", () =>
    guarded("Clear trust", async () => {
      requireWallet();
      await tf.clearTrust(currentEnv(), state.publicKey);
      log("Trust cleared");
    })
  );

  $("get-trust-btn").addEventListener("click", () =>
    guarded("Get trust", async () => {
      const address = $("lookup-address").value.trim();
      if (!address) throw new Error("Enter an address to look up");
      const peers = await tf.getTrust(currentEnv(), address);
      $("trust-result").textContent = JSON.stringify(peers, null, 2);
    })
  );
}

// ── Deposit / withdraw / balance panel ──────────────────────────────────

function initFundingPanel() {
  $("deposit-btn").addEventListener("click", () =>
    guarded("Deposit", async () => {
      requireWallet();
      const tokenId = $("token-id").value.trim();
      const amount = parseAmount($("amount").value);
      await tf.deposit(currentEnv(), state.publicKey, tokenId, amount);
      $("funding-result").textContent = `Deposited ${amount} to contract.`;
      log(`Deposit of ${amount} confirmed`);
    })
  );

  $("withdraw-btn").addEventListener("click", () =>
    guarded("Withdraw", async () => {
      requireWallet();
      const tokenId = $("token-id").value.trim();
      const amount = parseAmount($("amount").value);
      await tf.withdraw(currentEnv(), state.publicKey, tokenId, amount);
      $("funding-result").textContent = `Withdrew ${amount} from contract.`;
      log(`Withdraw of ${amount} confirmed`);
    })
  );

  $("balance-btn").addEventListener("click", () =>
    guarded("Balance", async () => {
      requireWallet();
      const tokenId = $("token-id").value.trim();
      const bal = await tf.balance(currentEnv(), state.publicKey, tokenId);
      $("funding-result").textContent = `Balance: ${bal}`;
    })
  );
}

// ── Distribute panel ─────────────────────────────────────────────────────

function initDistributePanel() {
  $("distribute-btn").addEventListener("click", () =>
    guarded("Distribute", async () => {
      requireWallet();
      const tokenId = $("token-id").value.trim();
      const amount = parseAmount($("amount").value);
      const maxHops = Number($("max-hops").value);
      await tf.distribute(currentEnv(), state.publicKey, tokenId, amount, maxHops);
      $("distribute-result").textContent = `Distributed ${amount} up to ${maxHops} hop(s).`;
      log(`Distribute of ${amount} confirmed (max_hops=${maxHops})`);
    })
  );
}

// ── Graph visualizer panel ──────────────────────────────────────────────

function initGraphPanel() {
  $("crawl-btn").addEventListener("click", () =>
    guarded("Crawl graph", async () => {
      const origin = $("graph-origin").value.trim();
      if (!origin) throw new Error("Enter an origin address");
      const maxHops = Number($("graph-hops").value);
      log(`Crawling trust graph from ${origin} (${maxHops} hops)…`);
      const graph = await tf.crawlTrustGraph(currentEnv(), origin, maxHops);
      renderGraph($("graph-canvas"), graph, origin);
      log(`Crawl complete: ${graph.nodes.length} node(s), ${graph.edges.length} edge(s)`);
    })
  );
}

initConfigPanel();
initWallet();
initTrustPanel();
initFundingPanel();
initDistributePanel();
initGraphPanel();
log("TrustFlow UI ready. Connect your wallet and set a Contract ID to begin.");
