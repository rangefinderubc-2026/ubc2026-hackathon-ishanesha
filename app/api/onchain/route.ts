import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia, foundry } from "viem/chains";
import { vaultAbi } from "@/lib/vault";

const chains = { local: foundry, baseSepolia, base } as const;
const explorers = { local: "", baseSepolia: "https://sepolia.basescan.org/tx/", base: "https://basescan.org/tx/" } as const;
const bps = (p: number) => Math.round(p * 10000);

export async function POST(req: Request) {
  try {
    const chainKey = (process.env.CHAIN ?? "baseSepolia") as keyof typeof chains;
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const wallet = createWalletClient({ account, chain: chains[chainKey], transport: http(process.env.RPC_URL) });
    const address = process.env.VAULT_ADDRESS as `0x${string}`;

    const b = await req.json();
    let hash: `0x${string}`;
    if (b.action === "set") {
      hash = await wallet.writeContract({ address, abi: vaultAbi, functionName: "setRange",
        args: [BigInt(Math.round(b.lower)), BigInt(Math.round(b.upper)), bps(b.confidence), bps(b.probInRange), b.event] });
    } else if (b.action === "rebalance") {
      hash = await wallet.writeContract({ address, abi: vaultAbi, functionName: "rebalance",
        args: [BigInt(Math.round(b.lower)), BigInt(Math.round(b.upper)), bps(b.probInRange), b.reason ?? "Gemini odds shifted"] });
    } else if (b.action === "protect") {
      hash = await wallet.writeContract({ address, abi: vaultAbi, functionName: "recordProtection",
        args: [b.orderId, BigInt(Math.round(b.strike)), BigInt(b.costCents)] });
    } else {
      return Response.json({ error: "unknown action" }, { status: 400 });
    }
    return Response.json({ hash, url: explorers[chainKey] ? `${explorers[chainKey]}${hash}` : null });
  } catch (e: any) {
    console.error(e);
    return Response.json({ error: e?.shortMessage ?? e?.message ?? String(e) }, { status: 500 });
  }
}