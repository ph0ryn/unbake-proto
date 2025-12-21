import { readFileSync } from "fs";

import { fromBinary } from "@bufbuild/protobuf";
import { FileDescriptorSetSchema } from "@bufbuild/protobuf/wkt";

import { Formatter } from "./format.js";
import { Descriptor } from "./protobuf.js";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: bun run unbake <input>");
  process.exit(1);
}

const buffer = readFileSync(inputPath);

try {
  // Try parsing as FileDescriptorSet first
  const fds = fromBinary(FileDescriptorSetSchema, buffer);

  for (const file of fds.file) {
    const descriptor = new Descriptor(file);
    const formatter = new Formatter(descriptor);

    console.log(formatter.format());
  }
} catch (err) {
  // Fallback: try parsing as single FileDescriptorProto?
  // Usually input is a Set, but robust handling is good.
  // Or maybe just fail.
  console.error("Failed to parse FileDescriptorSet:", err);
  process.exit(1);
}
