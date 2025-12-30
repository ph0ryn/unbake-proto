#! /usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { fromBinary } from "@bufbuild/protobuf";
import { FileDescriptorSetSchema } from "@bufbuild/protobuf/wkt";

import * as Language from "./language";
import { Formatter as Formatter2 } from "./proto2/format";
import { Descriptor as Descriptor2 } from "./proto2/protobuf";
import { Formatter as Formatter3 } from "./proto3/format";
import { Descriptor as Descriptor3 } from "./proto3/protobuf";

// Parse arguments
const args = process.argv.slice(2);
const pythonFlag = args.includes("--python");
const positionalArgs = args.filter((arg) => !arg.startsWith("--"));

const inputPath = positionalArgs[0];
const outputPath = positionalArgs[1];

if (!inputPath) {
  console.error(`Usage:
  unbake-proto <input> [output_dir] [options]

Arguments:
  input        Path to compiled descriptor file
  output_dir   Output directory (optional, prints to stdout if omitted)

Options:
  --python     Use a Python file as input`);

  process.exit(1);
}

let buffer: Uint8Array = readFileSync(inputPath);

if (pythonFlag) {
  const code = buffer.toString();

  buffer = Language.python(code);
}

const fds = fromBinary(FileDescriptorSetSchema, buffer);

/**
 * Generates the output file path based on the package and file name.
 * If the file has a name (e.g., "foo.proto"), use it; otherwise, use the package.
 * Package dots are converted to directory separators (e.g., "com.example" -> "com/example/").
 */
function getOutputFilePath(
  outputDir: string,
  pkg: string | undefined,
  name: string | undefined,
): string {
  // If name is provided (e.g., "foo.proto" or "com/example/foo.proto"), use it directly
  if (name) {
    return join(outputDir, name);
  }

  // Fallback: use package structure with "unnamed.proto"
  let packagePath = "";

  if (pkg) {
    packagePath = pkg.replace(/\./g, "/");
  }

  return join(outputDir, packagePath, "unnamed.proto");
}

function formatFile(file: (typeof fds.file)[0]): string {
  // Empty syntax or "proto2" means proto2 (proto2 is default when syntax is not specified)
  if (file.syntax === "proto3") {
    const descriptor = new Descriptor3(file);
    const formatter = new Formatter3(descriptor);

    return formatter.format();
  } else {
    const descriptor = new Descriptor2(file);
    const formatter = new Formatter2(descriptor);

    return formatter.format();
  }
}

for (const file of fds.file) {
  const content = formatFile(file);

  if (outputPath) {
    // Write to file based on package structure
    const filePath = getOutputFilePath(outputPath, file.package, file.name);
    const dir = dirname(filePath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filePath, content);
    console.log(`Written: ${filePath}`);
  } else {
    // Output to console
    console.log(content);
  }
}
