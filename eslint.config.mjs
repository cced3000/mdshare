import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: ["docs/**", ".next/**", ".open-next/**", "node_modules/**"],
  },
];

export default config;
