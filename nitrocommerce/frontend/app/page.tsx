"use client";

/**
 * NitroCommerce — Flash Sale storefront (Next.js App Router).
 *
 * Polls the Go backend for live stock and exposes a single Buy button.
 * The button shows a loading state during the request and reflects the
 * three terminal states the API can return: ok, sold_out, or error.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Product = {
  id: string;
  name: string;
  price_cent: number;
  stock: number;
};

type BuyResult =
  | { kind: "idle" }
  | { kind: "ok"; remaining: number; buyerId: string }
  | { kind: "sold_out" }
  | { kind: "error"; message: string };

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Page() {
  const [product, setProduct] = useState<Product | null>(null);
  const [buying, setBuying] = useState(false);
  const [result, setResult] = useState<BuyResult>({ kind: "idle" });
  const buyerRef = useRef<string>("");

  // Stable buyer ID per browser session (demo purposes only).
  if (!buyerRef.current && typeof window !== "undefined") {
    buyerRef.current = `buyer-${Math.random().toString(36).slice(2, 10)}`;
  }

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/product`, { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data: Product = await res.json();
      setProduct(data);
    } catch (err) {
      // Keep prior product visible if a single poll fails.
      console.error("poll failed", err);
    }
  }, []);

  // Poll stock every 2 seconds.
  useEffect(() => {
    fetchProduct();
    const id = setInterval(fetchProduct, 2000);
    return () => clearInterval(id);
  }, [fetchProduct]);

  const handleBuy = useCallback(async () => {
    setBuying(true);
    setResult({ kind: "idle" });
    try {
      const res = await fetch(`${API_URL}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer_id: buyerRef.current }),
      });
      const data = await res.json();
      if (res.status === 200) {
        setResult({
          kind: "ok",
          remaining: data.remaining,
          buyerId: data.buyer_id,
        });
      } else if (res.status === 409) {
        setResult({ kind: "sold_out" });
      } else {
        setResult({
          kind: "error",
          message: data?.error ?? "Unexpected error",
        });
      }
      // Refresh stock immediately after a buy attempt.
      fetchProduct();
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setBuying(false);
    }
  }, [fetchProduct]);

  const stock = product?.stock ?? 0;
  const soldOut = product != null && stock <= 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
      <div className="w-full rounded-2xl border border-white/10 bg-nitro-panel p-10 shadow-2xl">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-nitro-accent/30 bg-nitro-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-nitro-accent">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-nitro-accent" />
          Flash Sale Live
        </div>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
          {product?.name ?? "Loading product…"}
        </h1>

        <div className="mt-6 flex items-baseline gap-4">
          <span className="text-3xl font-bold text-white">
            {product ? formatPrice(product.price_cent) : "—"}
          </span>
          <span
            className={`text-sm font-medium ${
              soldOut ? "text-nitro-danger" : "text-nitro-ok"
            }`}
          >
            {product
              ? soldOut
                ? "Sold Out"
                : `${stock} units in stock`
              : ""}
          </span>
        </div>

        <p className="mt-6 max-w-prose text-sm leading-relaxed text-white/60">
          Inventory is decremented atomically in Redis. Orders are persisted
          asynchronously to PostgreSQL — the request returns the moment your
          unit is reserved.
        </p>

        <button
          onClick={handleBuy}
          disabled={buying || soldOut}
          className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-nitro-accent px-6 py-3 text-base font-semibold text-nitro-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
        >
          {buying ? "Reserving…" : soldOut ? "Sold Out" : "Buy Now"}
        </button>

        <div className="mt-6 min-h-[2.5rem] text-sm">
          {result.kind === "ok" && (
            <p className="rounded-lg border border-nitro-ok/30 bg-nitro-ok/10 px-4 py-2 text-nitro-ok">
              Purchase confirmed for <code>{result.buyerId}</code>. Remaining:{" "}
              {result.remaining}.
            </p>
          )}
          {result.kind === "sold_out" && (
            <p className="rounded-lg border border-nitro-danger/30 bg-nitro-danger/10 px-4 py-2 text-nitro-danger">
              Sold out — better luck next drop.
            </p>
          )}
          {result.kind === "error" && (
            <p className="rounded-lg border border-nitro-danger/30 bg-nitro-danger/10 px-4 py-2 text-nitro-danger">
              {result.message}
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-white/30">
        API: <code>{API_URL}</code> · polling every 2s
      </p>
    </main>
  );
}
