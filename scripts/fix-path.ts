import fs from "fs";
import os from "os";

const DEP = "@polkadot-api/descriptors";
const PACKAGE = "package.json";
const LOCK = "pnpm-lock.yaml";
const PAPI = ".papi/polkadot-api.json";

interface PackageJSON {
  name: string;
  version: string;
  private: boolean;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

const platform = os.platform();
if (platform === "linux") process.exit(0);

// path fix for package.json dep: "@polkadot-api/descriptors"
const pkg = JSON.parse(fs.readFileSync(PACKAGE, "utf-8")) as PackageJSON;

const dep = pkg.dependencies[DEP];
if (dep.includes("\\")) {
  pkg.dependencies[DEP] = dep.replace(/\\/g, "/");
  fs.writeFileSync(PACKAGE, JSON.stringify(pkg, null, 2));
}

// path fix for pnpm-lock.yaml dep: "@polkadot-api/descriptors"
let lock = fs.readFileSync(LOCK, "utf-8");

const regex = new RegExp(
  `(${DEP}.*?specifier: file:.papi)(\\\\+)descriptors`,
  "gs",
);

lock = lock.replace(regex, (_match, prefix: string) => `${prefix}/descriptors`);

fs.writeFileSync(LOCK, lock);

let papi = JSON.parse(fs.readFileSync(PAPI, "utf-8")) as {
  version: number;
  descriptorPath: string;
  entries: Record<
    string,
    { metadata: string; codeHash: string; genesis: string; chain: string }
  >;
};

papi = {
  version: papi.version,
  descriptorPath: papi.descriptorPath.replace(/\\/g, "/"),
  entries: Object.fromEntries(
    Object.entries(papi.entries).map(([key, value]) => [
      key,
      {
        chain: value.chain,
        metadata: value.metadata.replace(/\\/g, "/"),
        genesis: value.genesis,
        codeHash: value.codeHash,
      },
    ]),
  ),
};

fs.writeFileSync(PAPI, JSON.stringify(papi, null, 2));
