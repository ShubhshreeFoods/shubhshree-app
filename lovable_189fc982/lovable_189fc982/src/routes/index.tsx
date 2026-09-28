import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  ClipboardCopy,
  Copy,
  Package,
  Plus,
  Printer,
  Trash2,
  Wallet,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  batchSheet,
  calculate,
  defaultSkus,
  kg,
  money,
  rid,
  type ProfitMode,
  type Sku,
} from "@/lib/premix";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shubhshree Premix — Dhokla Batch & Costing Calculator" },
      {
        name: "description",
        content:
          "Scale dhokla premix batches, count pouches and price every SKU with 50% margin or markup — built for the factory floor.",
      },
      { property: "og:title", content: "Shubhshree Premix — Batch & Costing Calculator" },
      {
        property: "og:description",
        content:
          "Two-way batch scaling, itemized packaging costs and instant 50% profit pricing for dhokla premix SKUs.",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
  }),
  component: Index,
});

const STORE = "shubhshree-premix-v1";
const PRESETS = [10, 25, 50, 100];

function useStore() {
  const [skus, setSkus] = useState<Sku[]>(() => defaultSkus());
  const [activeId, setActiveId] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p?.skus) && p.skus.length) {
          setSkus(p.skus);
          setActiveId(
            p.activeId && p.skus.some((s: Sku) => s.id === p.activeId)
              ? p.activeId
              : (p.skus[0] as Sku).id,
          );
          setReady(true);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setSkus((cur) => {
      setActiveId((cur[0] as Sku).id);
      return cur;
    });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ skus, activeId }));
    } catch {
      /* ignore */
    }
  }, [skus, activeId, ready]);

  return { skus, setSkus, activeId, setActiveId };
}

function Field({
  label,
  value,
  onChange,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center rounded-xl border border-border bg-card focus-within:ring-2 focus-within:ring-ring">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-transparent px-3 py-2.5 text-base font-semibold outline-none"
        />
        {suffix ? (
          <span className="pr-3 text-xs font-medium text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
    </label>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "profit" }) {
  return (
    <div
      className={
        "rounded-xl border p-3 " +
        (tone === "profit"
          ? "border-accent-foreground/20 bg-accent text-accent-foreground"
          : "border-border bg-card")
      }
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-0.5 text-lg font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function Index() {
  const { skus, setSkus, activeId, setActiveId } = useStore();
  const sku = (skus.find((s) => s.id === activeId) ?? skus[0]) as Sku;

  const [mode, setMode] = useState<"recipe" | "kg" | "pouches">("kg");
  const [targetKg, setTargetKg] = useState(25);
  const [targetPouches, setTargetPouches] = useState(100);

  const update = (patch: Partial<Sku>) =>
    setSkus((cur) => cur.map((s) => (s.id === sku.id ? { ...s, ...patch } : s)));

  const baseGrams = sku.ingredients.reduce((s, i) => s + (i.grams || 0), 0);
  const scale = useMemo(() => {
    if (baseGrams <= 0) return 0;
    if (mode === "kg") return (targetKg * 1000) / baseGrams;
    if (mode === "pouches") return (targetPouches * sku.packSizeG) / baseGrams;
    return 1;
  }, [mode, targetKg, targetPouches, sku.packSizeG, baseGrams]);

  const c = useMemo(() => calculate(sku, scale), [sku, scale]);

  const share = async () => {
    const text = batchSheet(sku, c);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Batch sheet copied");
    } catch {
      toast.error("Could not copy — try Print instead");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Toaster position="top-center" />
      <header className="sticky top-0 z-20 border-b border-border bg-primary px-4 py-3 text-primary-foreground shadow-sm print:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black leading-tight">Shubhshree Premix</h1>
            <p className="truncate text-xs opacity-85">Batch, yield & pricing calculator</p>
          </div>
          <Package className="h-7 w-7 shrink-0 opacity-90" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        <select
          value={sku.id}
          onChange={(e) => setActiveId(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3 py-3 text-base font-bold shadow-sm"
        >
          {skus.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.packSizeG}g
            </option>
          ))}
        </select>

        <Tabs defaultValue="batch" className="mt-4">
          <TabsList className="grid h-11 w-full grid-cols-3 print:hidden">
            <TabsTrigger value="batch" className="text-sm font-semibold">
              <Calculator className="mr-1.5 h-4 w-4" /> Batch
            </TabsTrigger>
            <TabsTrigger value="cost" className="text-sm font-semibold">
              <Wallet className="mr-1.5 h-4 w-4" /> Costing
            </TabsTrigger>
            <TabsTrigger value="sku" className="text-sm font-semibold">
              SKUs
            </TabsTrigger>
          </TabsList>

          {/* ---------------- BATCH ---------------- */}
          <TabsContent value="batch" className="mt-4 space-y-4">
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["recipe", "Recipe"],
                    ["kg", "By kg"],
                    ["pouches", "By pouches"],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={
                      "rounded-xl px-2 py-2.5 text-sm font-bold transition-colors " +
                      (mode === m
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "kg" && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setTargetKg(p)}
                        className={
                          "rounded-xl border py-2 text-sm font-bold " +
                          (targetKg === p
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background")
                        }
                      >
                        {p} kg
                      </button>
                    ))}
                  </div>
                  <Field
                    label="Target batch weight"
                    value={targetKg}
                    onChange={setTargetKg}
                    suffix="kg"
                    step={0.5}
                  />
                </div>
              )}
              {mode === "pouches" && (
                <div className="mt-3">
                  <Field
                    label={`Target pouches (${sku.packSizeG}g each)`}
                    value={targetPouches}
                    onChange={setTargetPouches}
                    suffix="pouches"
                  />
                </div>
              )}
              {mode === "recipe" && (
                <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                  Showing the master recipe as entered ({kg(baseGrams)}). Edit quantities below —
                  they become the ratio used for all scaling.
                </p>
              )}
            </section>

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Batch output" value={c.batchKg.toFixed(2) + " kg"} />
              <Stat label="Pouches" value={String(c.pouches)} />
              <Stat label="Leftover" value={kg(c.leftoverG)} />
              <Stat label="Raw material" value={money(c.rawCost)} />
            </div>

            <section className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-black uppercase tracking-wide">Ingredients</h2>
                <button
                  onClick={() =>
                    update({
                      ingredients: [
                        ...sku.ingredients,
                        { id: rid(), name: "New ingredient", grams: 10, rate: 50 },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              <ul className="divide-y divide-border">
                {c.rows.map((r) => (
                  <li key={r.id} className="p-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <input
                        value={r.name}
                        onChange={(e) =>
                          update({
                            ingredients: sku.ingredients.map((i) =>
                              i.id === r.id ? { ...i, name: e.target.value } : i,
                            ),
                          })
                        }
                        className="min-w-0 rounded-lg bg-muted px-2 py-1.5 text-sm font-bold outline-none"
                      />
                      <button
                        onClick={() =>
                          update({ ingredients: sku.ingredients.filter((i) => i.id !== r.id) })
                        }
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                        aria-label={"Remove " + r.name}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Field
                        label="Recipe qty (g)"
                        value={r.grams}
                        onChange={(n) =>
                          update({
                            ingredients: sku.ingredients.map((i) =>
                              i.id === r.id ? { ...i, grams: n } : i,
                            ),
                          })
                        }
                        suffix="g"
                      />
                      <Field
                        label="Rate"
                        value={r.rate}
                        onChange={(n) =>
                          update({
                            ingredients: sku.ingredients.map((i) =>
                              i.id === r.id ? { ...i, rate: n } : i,
                            ),
                          })
                        }
                        suffix="₹/kg"
                      />
                    </div>
                    <div className="mt-2 flex items-end justify-between rounded-lg bg-primary/10 px-3 py-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Weigh out
                        </div>
                        <div className="text-xl font-black tabular-nums text-primary">
                          {kg(r.scaledG)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Cost
                        </div>
                        <div className="text-base font-black tabular-nums">{money(r.cost)}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </TabsContent>

          {/* ---------------- COSTING ---------------- */}
          <TabsContent value="cost" className="mt-4 space-y-4">
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wide">Overheads per pouch</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field
                  label="Standup pouch"
                  value={sku.overheads.pouch}
                  onChange={(n) => update({ overheads: { ...sku.overheads, pouch: n } })}
                  suffix="₹"
                  step={0.1}
                />
                <Field
                  label="Front + back labels"
                  value={sku.overheads.labels}
                  onChange={(n) => update({ overheads: { ...sku.overheads, labels: n } })}
                  suffix="₹"
                  step={0.1}
                />
                <Field
                  label="Sealing & labour"
                  value={sku.overheads.labour}
                  onChange={(n) => update({ overheads: { ...sku.overheads, labour: n } })}
                  suffix="₹"
                  step={0.1}
                />
                <Field
                  label="Carton & tape"
                  value={sku.overheads.carton}
                  onChange={(n) => update({ overheads: { ...sku.overheads, carton: n } })}
                  suffix="₹"
                  step={0.1}
                />
                <Field
                  label="Power & logistics"
                  value={sku.overheads.misc}
                  onChange={(n) => update({ overheads: { ...sku.overheads, misc: n } })}
                  suffix="₹"
                  step={0.1}
                />
                <div className="rounded-xl border border-border bg-muted p-3">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Overhead total
                  </div>
                  <div className="mt-0.5 text-lg font-extrabold tabular-nums">
                    {money(c.overheadPerPouch)}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wide">Profit target</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["margin", "markup"] as ProfitMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => update({ profitMode: m })}
                    className={
                      "rounded-xl px-2 py-2.5 text-sm font-bold capitalize " +
                      (sku.profitMode === m
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {m} %
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field
                  label="Profit %"
                  value={sku.profitPct}
                  onChange={(n) => update({ profitPct: n })}
                  suffix="%"
                />
                <Field
                  label="MRP uplift over price"
                  value={sku.mrpUplift}
                  onChange={(n) => update({ mrpUplift: n })}
                  suffix="%"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                    {sku.profitPct}% Margin price
                  </div>
                  <div className="text-lg font-extrabold tabular-nums">{money(c.marginPrice)}</div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                    {sku.profitPct}% Markup price
                  </div>
                  <div className="text-lg font-extrabold tabular-nums">{money(c.markupPrice)}</div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border-2 border-primary bg-card p-4 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wide text-primary">
                Summary · {sku.packSizeG}g pouch
              </h2>
              <dl className="mt-3 space-y-1.5 text-sm">
                {[
                  ["Raw material / pouch", money(c.rawPerPouch)],
                  ["Overheads / pouch", money(c.overheadPerPouch)],
                  ["Total cost / pouch", money(c.costPerPouch)],
                  ["Cost per kg", money(c.costPerKg)],
                  ["Selling / wholesale price", money(c.sellingPrice)],
                  ["Net profit / pouch", money(c.profitPerPouch)],
                  ["Suggested MRP", money(c.mrp)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <dt className="min-w-0 truncate text-muted-foreground">{k}</dt>
                    <dd className="shrink-0 font-bold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Stat label="Batch cost" value={money(c.totalBatchCost)} />
                <Stat label="Batch profit" value={money(c.totalProfit)} tone="profit" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 print:hidden">
                <button
                  onClick={share}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground"
                >
                  <ClipboardCopy className="h-4 w-4" /> Copy sheet
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-bold"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </section>

            <pre className="hidden whitespace-pre-wrap rounded-xl border border-border p-4 text-xs print:block">
              {batchSheet(sku, c)}
            </pre>
          </TabsContent>

          {/* ---------------- SKUs ---------------- */}
          <TabsContent value="sku" className="mt-4 space-y-4">
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wide">Current SKU</h2>
              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Name
                </span>
                <input
                  value={sku.name}
                  onChange={(e) => update({ name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base font-semibold outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <div className="mt-3">
                <Field
                  label="Pack size"
                  value={sku.packSizeG}
                  onChange={(n) => update({ packSizeG: n })}
                  suffix="g"
                  step={50}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const copy: Sku = {
                      ...sku,
                      id: rid(),
                      name: sku.name + " (copy)",
                      ingredients: sku.ingredients.map((i) => ({ ...i, id: rid() })),
                    };
                    setSkus((cur) => [...cur, copy]);
                    setActiveId(copy.id);
                    toast.success("Recipe duplicated");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-bold"
                >
                  <Copy className="h-4 w-4" /> Duplicate
                </button>
                <button
                  disabled={skus.length <= 1}
                  onClick={() => {
                    const rest = skus.filter((s) => s.id !== sku.id);
                    setSkus(rest);
                    setActiveId((rest[0] as Sku).id);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-destructive/40 px-3 py-3 text-sm font-bold text-destructive disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </section>

            <button
              onClick={() => {
                const fresh: Sku = {
                  id: rid(),
                  name: "New Premix SKU",
                  packSizeG: 250,
                  ingredients: [{ id: rid(), name: "Besan (gram flour)", grams: 1000, rate: 85 }],
                  overheads: { pouch: 4.5, labels: 1.8, labour: 2, carton: 1.2, misc: 1.5 },
                  profitMode: "margin",
                  profitPct: 50,
                  mrpUplift: 35,
                };
                setSkus((cur) => [...cur, fresh]);
                setActiveId(fresh.id);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Add new SKU
            </button>

            <ul className="space-y-2">
              {skus.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveId(s.id)}
                    className={
                      "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border p-3 text-left " +
                      (s.id === sku.id ? "border-primary bg-primary/10" : "border-border bg-card")
                    }
                  >
                    <span className="min-w-0 truncate text-sm font-bold">{s.name}</span>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                      {s.packSizeG}g
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 py-2.5 backdrop-blur print:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-2 text-center">
          {[
            ["Cost/kg", money(c.costPerKg)],
            ["Cost/pouch", money(c.costPerPouch)],
            ["Price", money(c.sellingPrice)],
            ["Profit", money(c.totalProfit)],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <div className="truncate text-[10px] font-semibold uppercase text-muted-foreground">
                {k}
              </div>
              <div className="truncate text-sm font-extrabold tabular-nums">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
