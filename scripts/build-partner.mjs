import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

const password = process.env.STATICRYPT_PASSWORD;
if (!password || password.length < 20) throw new Error("Set STATICRYPT_PASSWORD to a strong, unique password of at least 20 characters. Never commit it.");
function run(args) {
  const result = spawnSync(process.execPath, args, {stdio:"inherit", env:process.env});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run(["node_modules/vite/bin/vite.js", "build", "--config", "vite.partner.config.ts"]);
const html = readFileSync("dist-partner/plain/index.html", "utf8");
if (/<script[^>]+src\s*=|<link[^>]+rel=["']stylesheet/i.test(html) || html.includes("/hero-rider.png") || html.includes('src="/osk-logo.svg"')) throw new Error("Presentation must contain all app code and media inline before encryption.");
if (/sb_secret_|sk_live_|SUPABASE_SECRET_KEY/.test(html)) throw new Error("Unexpected privileged configuration in browser build.");
mkdirSync("dist-partner/encrypted", {recursive:true});
run(["node_modules/staticrypt/cli/index.js", "dist-partner/plain/index.html", "--config", "false", "-d", "dist-partner/encrypted", "--remember", "false", "--template-title", "OSK Partner Preview", "--template-instructions", "Private presentation. Enter the password supplied by OSK. Dummy products only; no live payments.", "--template-color-primary", "#f26522", "--template-color-secondary", "#111211"]);
const encrypted = readFileSync("dist-partner/encrypted/index.html", "utf8");
if (encrypted.includes(password) || encrypted.includes("Demo emergency brake lever") || encrypted.includes("rider@example.invalid")) throw new Error("Plaintext must not appear in encrypted output.");
writeFileSync("dist-partner/encrypted/index.html", encrypted.replace("<head>", '<head><meta name="robots" content="noindex, nofollow, noarchive"><meta name="referrer" content="no-referrer">'));
writeFileSync("dist-partner/encrypted/.nojekyll", "");
console.log("Encrypted partner presentation ready in dist-partner/encrypted. Never publish dist-partner/plain.");
