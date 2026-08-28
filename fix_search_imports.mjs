
import fs from "fs";
let content = fs.readFileSync("c:/Users/pablo/resonance/src/hooks/useSearchEngine.ts", "utf8");

// Add the correct imports at the very top
content = `import { useState, useRef } from "react";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { usePlayerStore } from "../store/usePlayerStore";
import { ytApiFetch } from "../lib/ytToken";

` + content.trimStart();

fs.writeFileSync("c:/Users/pablo/resonance/src/hooks/useSearchEngine.ts", content);
console.log("Fixed imports");

