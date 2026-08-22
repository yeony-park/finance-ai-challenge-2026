import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path:string)=>readFileSync(join(root,path),"utf8");

test("legacy adapter connects only the five art offerings",()=>{const data=JSON.parse(read("data/products.json")) as {products:Array<{category:string}>};assert.equal(data.products.length,5);assert.ok(data.products.every(item=>item.category==="미술품"));assert.match(read("lib/art/legacy-adapter.ts"),/filter\(\(product\) => product\.category === "미술품"\)/)});
test("legacy adapter retains all art platform datasets",()=>{const adapter=read("lib/art/legacy-adapter.ts");for(const source of ["products.json","artnguide_track_records.json","weshareart_research.json","tessa_sale_records.json","artnguide_due_diligence.json"])assert.ok(adapter.includes(source))});
