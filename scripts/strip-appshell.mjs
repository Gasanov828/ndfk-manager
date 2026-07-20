const fs = require("fs");
const path = require("path");

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (entry.name !== "page.tsx") continue;

    let source = fs.readFileSync(fullPath, "utf8");
    if (!source.includes("AppShell")) continue;

    source = source.replace(
      /^import AppShell from "@\/components\/AppShell";\r?\n/m,
      ""
    );
    source = source.replace(/<AppShell>\s*/g, "");
    source = source.replace(/\s*<\/AppShell>/g, "");

    fs.writeFileSync(fullPath, source);
    console.log("updated", fullPath);
  }
}

walk(path.join(__dirname, "app"));
