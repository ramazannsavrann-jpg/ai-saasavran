// Yalnız React hook kuralı (18 Kasım): hook erken dönüşten sonra çağrılırsa panel beyaz ekranla çöker (React #310).
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
export default [
  { files: ["src/**/*.{ts,tsx}"], languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "react-hooks": hooks }, linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: { "react-hooks/rules-of-hooks": "error" } },
];
