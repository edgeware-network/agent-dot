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

// revert path for package.json dep: "@polkadot-api/descriptors"
const pkg = JSON.parse(fs.readFileSync(PACKAGE, "utf-8")) as PackageJSON;

const dep = pkg.dependencies[DEP];
if (dep.includes("file:")) {
  const path = dep.replace("/", "\\");
  pkg.dependencies[DEP] = path;
  fs.writeFileSync(PACKAGE, JSON.stringify(pkg, null, 2));
}

// path revert for pnpm-lock.yaml dep: "@polkadot-api/descriptors"
let lock = fs.readFileSync(LOCK, "utf-8");

lock = lock.replace(
  /^(\s*specifier:\sfile:\.papi)\/descriptors$/gm,
  "$1\\descriptors",
);
fs.writeFileSync(LOCK, lock);

const papi = JSON.parse(fs.readFileSync(PAPI, "utf-8")) as {
  version: number;
  descriptorPath: string;
  entries: Record<
    string,
    { metadata: string; codeHash: string; genesis: string; chain: string }
  >;
};
const data = {
  version: papi.version,
  descriptorPath: papi.descriptorPath.replace(/\//g, "\\"),
  entries: Object.fromEntries(
    Object.entries(papi.entries).map(([key, value]) => [
      key,
      {
        chain: value.chain,
        metadata: value.metadata.replace(/\//g, "\\"),
        genesis: value.genesis,
        codeHash: value.codeHash,
      },
    ]),
  ),
};
fs.writeFileSync(PAPI, JSON.stringify(data, null, 2));
