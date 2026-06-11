import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const mod = require("hoist-non-react-statics/dist/hoist-non-react-statics.cjs.js");
export default mod.default ?? mod;
