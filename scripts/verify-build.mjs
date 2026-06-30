import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const js = fs.readdirSync(path.join(dist, "assets")).find((f) => f.startsWith("index-") && f.endsWith(".js"));
const bundle = fs.readFileSync(path.join(dist, "assets", js), "utf8");

const src = html.match(/src="([^"]+\.js)"/)?.[1] ?? "";
console.log("script src:", src);
console.log("supabase url in bundle:", bundle.includes("pehemxfydtwgpcasftyq.supabase.co"));
console.log("broken undefined url:", bundle.includes("undefined/functions"));

if (!bundle.includes("pehemxfydtwgpcasftyq.supabase.co") || bundle.includes("undefined/functions")) {
  process.exit(1);
}
