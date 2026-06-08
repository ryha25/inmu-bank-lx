---
name: Solana Buffer Polyfill
description: How to configure Vite for @solana/web3.js and @solana/spl-token in the browser
---

@solana/web3.js and @solana/spl-token use Node.js built-ins (Buffer, process) that are not available in browser environments.

**Fix:**
1. Install: `pnpm --filter inmu-bank add @solana/web3.js @solana/spl-token buffer vite-plugin-node-polyfills`
2. In `vite.config.ts`, add `nodePolyfills` as the FIRST plugin:
   ```ts
   import { nodePolyfills } from "vite-plugin-node-polyfills";
   plugins: [
     nodePolyfills({ include: ['buffer', 'process'], globals: { Buffer: true, global: true, process: true } }),
     react(),
     ...
   ]
   ```
3. Also add `define: { global: 'globalThis' }` and `optimizeDeps.esbuildOptions.define: { global: 'globalThis' }` to the config.

**Why:** Vite externalizes Node built-ins by default. Without the polyfill plugin, `Buffer is not defined` errors appear at runtime when @solana packages try to use it.

**How to apply:** Any time @solana packages are added to the inmu-bank Vite app, this polyfill setup must be in place.
