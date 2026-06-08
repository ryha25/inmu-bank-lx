import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/session";

const router = Router();

const INMU_TOKEN_MINT = "4FDtAagigMuFcPp36rbd9bzcYTJgQah2qLMYcYtfpump";
const INMU_DECIMALS = 6;

async function fetchInmuBalance(wallet: string): Promise<number> {
  const rpcUrl = process.env.SOLANA_RPC ?? "https://api.mainnet-beta.solana.com";

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        wallet,
        { mint: INMU_TOKEN_MINT },
        { encoding: "jsonParsed" },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`[Solana] RPC HTTP error: ${response.status} ${response.statusText} — ${text}`);
    throw new Error(`RPC error: ${response.status}`);
  }

  const data = await response.json() as {
    result?: {
      value?: Array<{
        account: {
          data: {
            parsed: {
              info: {
                tokenAmount: {
                  amount: string;
                  decimals: number;
                  uiAmount: number | null;
                };
              };
            };
          };
        };
      }>;
    };
    error?: { message: string; code?: number };
  };

  if (data.error) {
    console.error("[Solana] RPC returned error:", data.error);
    throw new Error(data.error.message);
  }

  const accounts = data.result?.value ?? [];
  if (accounts.length === 0) return 0;

  const totalRaw = accounts.reduce((sum, acct) => {
    const raw = acct.account.data.parsed.info.tokenAmount.amount;
    return sum + Number(raw);
  }, 0);

  return totalRaw / Math.pow(10, INMU_DECIMALS);
}

// ── ユーザー用: INMU残高取得 ──
router.get("/solana/inmu-balance", requireAuth, async (req, res): Promise<void> => {
  const wallet = req.query.wallet as string | undefined;
  if (!wallet) {
    res.status(400).json({ error: "wallet query param required" });
    return;
  }
  try {
    const balance = await fetchInmuBalance(wallet);
    console.info(`[Solana] wallet=${wallet} INMU balance=${balance}`);
    res.json({ balance });
  } catch (e) {
    console.error("[Solana] Failed to fetch INMU token balance:", e);
    res.status(502).json({ error: "Failed to reach Solana RPC", balance: 0 });
  }
});

// ── 管理者用: INMU残高取得 ──
router.get("/admin/solana/inmu-balance", requireAdmin, async (req, res): Promise<void> => {
  const wallet = req.query.wallet as string | undefined;
  if (!wallet) {
    res.status(400).json({ error: "wallet query param required" });
    return;
  }
  try {
    const balance = await fetchInmuBalance(wallet);
    console.info(`[Solana/Admin] wallet=${wallet} INMU balance=${balance}`);
    res.json({ balance });
  } catch (e) {
    console.error("[Solana/Admin] Failed to fetch INMU token balance:", e);
    res.status(502).json({ error: "Failed to reach Solana RPC", balance: 0 });
  }
});

export default router;
