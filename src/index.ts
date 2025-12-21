import { readFileSync } from "fs";

import { fromBinary } from "@bufbuild/protobuf";
import { FileDescriptorSetSchema } from "@bufbuild/protobuf/wkt";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: bun run unbake <input>");
  process.exit(1);
}

const buffer = readFileSync(inputPath);
const fds = fromBinary(FileDescriptorSetSchema, buffer);

for (const file of fds.file) {
  console.log(file);
}
