export type Ingredient = {
  id: string;
  name: string;
  /** grams in the master recipe */
  grams: number;
  /** purchase rate in Rs per kg */
  rate: number;
};

export type Overheads = {
  pouch: number; // per pouch
  labels: number; // per pouch
  labour: number; // per pouch
  carton: number; // per pouch (carton + tape apportioned)
  misc: number; // per pouch (electricity / blending / logistics buffer)
};

export type ProfitMode = "margin" | "markup";

export type Sku = {
  id: string;
  name: string;
  packSizeG: number;
  ingredients: Ingredient[];
  overheads: Overheads;
  profitMode: ProfitMode;
  profitPct: number;
  mrpUplift: number; // % over selling price for suggested MRP
};

export const rid = () => Math.random().toString(36).slice(2, 9);

const ing = (name: string, grams: number, rate: number): Ingredient => ({
  id: rid(),
  name,
  grams,
  rate,
});

const baseOverheads = (): Overheads => ({
  pouch: 4.5,
  labels: 1.8,
  labour: 2,
  carton: 1.2,
  misc: 1.5,
});

export const defaultSkus = (): Sku[] => [
  {
    id: rid(),
    name: "Khaman Dhokla Premix 200g",
    packSizeG: 200,
    ingredients: [
      ing("Besan (gram flour)", 800, 85),
      ing("Sooji (semolina)", 60, 45),
      ing("Sugar", 60, 46),
      ing("Citric acid", 12, 180),
      ing("Sodium bicarbonate", 18, 60),
      ing("Salt", 15, 20),
      ing("Turmeric", 5, 220),
    ],
    overheads: { ...baseOverheads(), pouch: 3.8 },
    profitMode: "margin",
    profitPct: 50,
    mrpUplift: 35,
  },
  {
    id: rid(),
    name: "Khaman Dhokla Premix 500g",
    packSizeG: 500,
    ingredients: [
      ing("Besan (gram flour)", 800, 85),
      ing("Sooji (semolina)", 60, 45),
      ing("Sugar", 60, 46),
      ing("Citric acid", 12, 180),
      ing("Sodium bicarbonate", 18, 60),
      ing("Salt", 15, 20),
      ing("Turmeric", 5, 220),
    ],
    overheads: { ...baseOverheads(), pouch: 6.2, labels: 2.2 },
    profitMode: "margin",
    profitPct: 50,
    mrpUplift: 35,
  },
  {
    id: rid(),
    name: "Khatta (White) Dhokla Premix 250g",
    packSizeG: 250,
    ingredients: [
      ing("Rice flour", 600, 48),
      ing("Urad dal flour", 200, 120),
      ing("Sooji (semolina)", 120, 45),
      ing("Citric acid", 15, 180),
      ing("Sodium bicarbonate", 20, 60),
      ing("Salt", 18, 20),
    ],
    overheads: { ...baseOverheads(), pouch: 4.2 },
    profitMode: "margin",
    profitPct: 50,
    mrpUplift: 35,
  },
  {
    id: rid(),
    name: "Nylon Dhokla Premix 500g",
    packSizeG: 500,
    ingredients: [
      ing("Besan (gram flour)", 850, 85),
      ing("Sugar", 70, 46),
      ing("Citric acid", 14, 180),
      ing("Fruit salt", 30, 240),
      ing("Salt", 16, 20),
      ing("Turmeric", 4, 220),
    ],
    overheads: { ...baseOverheads(), pouch: 6.2, labels: 2.2 },
    profitMode: "markup",
    profitPct: 50,
    mrpUplift: 35,
  },
  {
    id: rid(),
    name: "Rava Dhokla Premix 400g",
    packSizeG: 400,
    ingredients: [
      ing("Sooji (semolina)", 780, 45),
      ing("Besan (gram flour)", 120, 85),
      ing("Citric acid", 12, 180),
      ing("Sodium bicarbonate", 20, 60),
      ing("Salt", 18, 20),
      ing("Sugar", 30, 46),
    ],
    overheads: { ...baseOverheads(), pouch: 5.4, labels: 2 },
    profitMode: "margin",
    profitPct: 50,
    mrpUplift: 35,
  },
];

export type Calc = ReturnType<typeof calculate>;

export function calculate(sku: Sku, scale: number) {
  const baseGrams = sku.ingredients.reduce((s, i) => s + (i.grams || 0), 0);
  const rows = sku.ingredients.map((i) => {
    const grams = (i.grams || 0) * scale;
    return { ...i, scaledG: grams, cost: (grams / 1000) * (i.rate || 0) };
  });
  const batchG = baseGrams * scale;
  const batchKg = batchG / 1000;
  const rawCost = rows.reduce((s, r) => s + r.cost, 0);
  const pouchesExact = sku.packSizeG > 0 ? batchG / sku.packSizeG : 0;
  const pouches = Math.floor(pouchesExact);
  const leftoverG = batchG - pouches * sku.packSizeG;

  const o = sku.overheads;
  const overheadPerPouch = o.pouch + o.labels + o.labour + o.carton + o.misc;
  const rawPerKg = batchKg > 0 ? rawCost / batchKg : 0;
  const rawPerPouch = (rawPerKg * sku.packSizeG) / 1000;
  const costPerPouch = rawPerPouch + overheadPerPouch;

  const price = (mode: ProfitMode, pct: number) => {
    const p = Math.min(Math.max(pct, 0), 99.9) / 100;
    return mode === "margin" ? costPerPouch / (1 - p) : costPerPouch * (1 + p);
  };

  const sellingPrice = price(sku.profitMode, sku.profitPct);
  const marginPrice = price("margin", sku.profitPct);
  const markupPrice = price("markup", sku.profitPct);
  const profitPerPouch = sellingPrice - costPerPouch;

  return {
    rows,
    baseGrams,
    batchKg,
    rawCost,
    pouches,
    pouchesExact,
    leftoverG,
    overheadPerPouch,
    rawPerKg,
    rawPerPouch,
    costPerPouch,
    costPerKg: sku.packSizeG > 0 ? (costPerPouch * 1000) / sku.packSizeG : 0,
    sellingPrice,
    marginPrice,
    markupPrice,
    profitPerPouch,
    totalBatchCost: costPerPouch * pouches,
    totalRevenue: sellingPrice * pouches,
    totalProfit: profitPerPouch * pouches,
    mrp: sellingPrice * (1 + (sku.mrpUplift || 0) / 100),
  };
}

export const money = (n: number) =>
  "₹" + (isFinite(n) ? n : 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const kg = (g: number) =>
  g >= 1000 ? (g / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "") + " kg" : g.toFixed(1) + " g";

export function batchSheet(sku: Sku, c: Calc) {
  const L: string[] = [];
  L.push("SHUBHSHREE PREMIX — BATCH SHEET");
  L.push(sku.name + "  |  Pack: " + sku.packSizeG + "g");
  L.push("Batch: " + c.batchKg.toFixed(2) + " kg  →  " + c.pouches + " pouches");
  L.push("");
  L.push("INGREDIENTS");
  c.rows.forEach((r) => L.push("• " + r.name + " — " + kg(r.scaledG) + "  (" + money(r.cost) + ")"));
  L.push("");
  L.push("COSTING (per pouch)");
  L.push("Raw material: " + money(c.rawPerPouch));
  L.push("Pouch: " + money(sku.overheads.pouch) + " | Labels: " + money(sku.overheads.labels));
  L.push("Labour: " + money(sku.overheads.labour) + " | Carton: " + money(sku.overheads.carton));
  L.push("Electricity/logistics: " + money(sku.overheads.misc));
  L.push("Total cost: " + money(c.costPerPouch));
  L.push(
    "Selling price (" + sku.profitPct + "% " + sku.profitMode + "): " + money(c.sellingPrice),
  );
  L.push("Profit/pouch: " + money(c.profitPerPouch) + " | Suggested MRP: " + money(c.mrp));
  L.push("");
  L.push("BATCH TOTALS");
  L.push("Raw material cost: " + money(c.rawCost));
  L.push("Total cost: " + money(c.totalBatchCost));
  L.push("Revenue: " + money(c.totalRevenue) + " | Profit: " + money(c.totalProfit));
  return L.join("\n");
}
