/** Minimal MetaMask / EIP-1193 helpers — no heavy web3 libs */

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
};

export function getEthereum(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  return (window as any).ethereum || null;
}

export function isMetaMaskAvailable(): boolean {
  return !!getEthereum();
}

export async function connectWallet(): Promise<{ address: string; chainId: string }> {
  const eth = getEthereum();
  if (!eth) {
    throw new Error('MetaMask не найден. Установите расширение или dapp-browser.');
  }
  const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts?.length) throw new Error('Кошелёк не подключён');
  const chainIdHex = (await eth.request({ method: 'eth_chainId' })) as string;
  return { address: accounts[0], chainId: String(parseInt(chainIdHex, 16)) };
}

export async function switchChain(chainId: string): Promise<void> {
  const eth = getEthereum();
  if (!eth) throw new Error('No wallet');
  const hex = '0x' + parseInt(chainId, 10).toString(16);
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] });
  } catch (e: any) {
    if (e?.code === 4902) {
      await addKnownChain(chainId);
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] });
    } else throw e;
  }
}

const KNOWN_CHAINS: Record<string, any> = {
  '1': {
    chainId: '0x1',
    chainName: 'Ethereum',
    rpcUrls: ['https://eth.llamarpc.com'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://etherscan.io'],
  },
  '137': {
    chainId: '0x89',
    chainName: 'Polygon',
    rpcUrls: ['https://polygon-rpc.com'],
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrls: ['https://polygonscan.com'],
  },
  '56': {
    chainId: '0x38',
    chainName: 'BNB Smart Chain',
    rpcUrls: ['https://bsc-dataseed.binance.org'],
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockExplorerUrls: ['https://bscscan.com'],
  },
  '8453': {
    chainId: '0x2105',
    chainName: 'Base',
    rpcUrls: ['https://mainnet.base.org'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://basescan.org'],
  },
};

async function addKnownChain(chainId: string) {
  const eth = getEthereum();
  const conf = KNOWN_CHAINS[chainId];
  if (!eth || !conf) throw new Error(`Unknown chain ${chainId}`);
  await eth.request({ method: 'wallet_addEthereumChain', params: [conf] });
}

const TRANSFER_SELECTOR = '0xa9059cbb';

function padAddress(addr: string): string {
  return addr.replace(/^0x/i, '').toLowerCase().padStart(64, '0');
}

function padUint(amount: bigint): string {
  return amount.toString(16).padStart(64, '0');
}

export async function sendTipTransaction(opts: {
  toAddress: string;
  amountMinor: number;
  token?: { address: string; decimals: number };
  chainId: string;
}): Promise<string> {
  const eth = getEthereum();
  if (!eth) throw new Error('MetaMask не найден');
  await switchChain(opts.chainId);
  const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
  const from = accounts[0];
  if (!from) throw new Error('Нет аккаунта');

  const displayDecimals = 2;
  let amountToken: bigint;
  if (opts.token) {
    const factor = BigInt(10) ** BigInt(opts.token.decimals - displayDecimals);
    amountToken = BigInt(opts.amountMinor) * factor;
  } else {
    amountToken = BigInt(opts.amountMinor) * BigInt(10) ** BigInt(16);
  }

  if (opts.token) {
    const data = TRANSFER_SELECTOR + padAddress(opts.toAddress) + padUint(amountToken);
    return (await eth.request({
      method: 'eth_sendTransaction',
      params: [{ from, to: opts.token.address, data, value: '0x0' }],
    })) as string;
  }

  return (await eth.request({
    method: 'eth_sendTransaction',
    params: [{ from, to: opts.toAddress, value: '0x' + amountToken.toString(16) }],
  })) as string;
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
