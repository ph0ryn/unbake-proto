import { readFileSync } from "fs";

import { fromBinary } from "@bufbuild/protobuf";
import { FileDescriptorSetSchema } from "@bufbuild/protobuf/wkt";

import { Formatter as Formatter2 } from "./proto2/format";
import { Descriptor as Descriptor2 } from "./proto2/protobuf";
import { Formatter as Formatter3 } from "./proto3/format";
import { Descriptor as Descriptor3 } from "./proto3/protobuf";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: bun run unbake <input>");
  process.exit(1);
}

const buffer = readFileSync(inputPath);

const fds = fromBinary(FileDescriptorSetSchema, buffer);

for (const file of fds.file) {
  // Empty syntax or "proto2" means proto2 (proto2 is default when syntax is not specified)
  if (file.syntax === "proto3") {
    const descriptor = new Descriptor3(file);
    const formatter = new Formatter3(descriptor);

    console.log(formatter.format());
  } else {
    const descriptor = new Descriptor2(file);
    const formatter = new Formatter2(descriptor);

    console.log(formatter.format());
  }
}
