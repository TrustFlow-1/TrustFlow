// Runtime configuration, persisted to localStorage so the page keeps your
// settings across reloads. Edit the defaults below or use the config panel
// in the UI.

const STORAGE_KEY = "trustflow.config.v1";

const NETWORKS = {
  TESTNET: {
    label: "Testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  },
  FUTURENET: {
    label: "Futurenet",
    rpcUrl: "https://rpc-futurenet.stellar.org",
    networkPassphrase: "Test SDF Future Network ; October 2022",
  },
};

const DEFAULTS = {
  network: "TESTNET",
  contractId: "",
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getConfig() {
  const stored = load();
  const net = NETWORKS[stored.network] ?? NETWORKS.TESTNET;
  return {
    ...stored,
    rpcUrl: net.rpcUrl,
    networkPassphrase: net.networkPassphrase,
  };
}

export function setContractId(contractId) {
  const stored = load();
  stored.contractId = contractId.trim();
  save(stored);
}

export function setNetwork(network) {
  const stored = load();
  stored.network = NETWORKS[network] ? network : "TESTNET";
  save(stored);
}

export { NETWORKS };
