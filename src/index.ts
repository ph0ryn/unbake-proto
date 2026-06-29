#! /usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { fromBinary } from "@bufbuild/protobuf";
import {
  FileDescriptorProtoSchema,
  FileDescriptorSetSchema,
  type FileDescriptorProto,
} from "@bufbuild/protobuf/wkt";

import * as Language from "./language";
import { Formatter as Formatter2 } from "./proto2/format";
import { Descriptor as Descriptor2 } from "./proto2/protobuf";
import { Formatter as Formatter3 } from "./proto3/format";
import { Descriptor as Descriptor3 } from "./proto3/protobuf";

type InputSource =
  | {
      type: "file";
      path: string;
    }
  | {
      type: "base64";
      value: string;
    };

interface CliOptions {
  inputSource: InputSource;
  outputPath?: string;
  python: boolean;
  single: boolean;
}

function usage(): string {
  return `Usage:
  unbake-proto -i <input> [options]
  unbake-proto --from-base64 <base64> [options]

Input:
  -i <input>              Path to compiled descriptor or Python source file
  --from-base64 <base64>  Base64-encoded descriptor bytes

Output:
  -o <output>             Output file for --single/--python, output directory otherwise
                           Omitted output prints to stdout

Options:
  --single                Use a single FileDescriptorProto file as input
  --python                Use a Python file as input`;
}

function readRequiredValue(args: string[], index: number, optionName: string): string {
  const value = args[index + 1];

  if (value === undefined || value.startsWith("-")) {
    throw new Error(`Missing value for ${optionName}`);
  }

  return value;
}

function parseCliOptions(args: string[]): CliOptions {
  let inputSource: InputSource | undefined = undefined;
  let outputPath: string | undefined = undefined;
  let python = false;
  let single = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === undefined) {
      throw new Error("Unexpected empty argument");
    }

    switch (arg) {
      case "-i": {
        const path = readRequiredValue(args, index, "-i");

        if (inputSource) {
          throw new Error("Only one input source can be specified");
        }

        inputSource = {
          path,
          type: "file",
        };

        index += 1;
        break;
      }

      case "--from-base64": {
        const value = readRequiredValue(args, index, "--from-base64");

        if (inputSource) {
          throw new Error("Only one input source can be specified");
        }

        inputSource = {
          type: "base64",
          value,
        };

        index += 1;
        break;
      }

      case "-o": {
        if (outputPath !== undefined) {
          throw new Error("-o can only be specified once");
        }

        outputPath = readRequiredValue(args, index, "-o");

        index += 1;
        break;
      }

      case "--python": {
        python = true;
        break;
      }

      case "--single": {
        single = true;
        break;
      }

      default: {
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }

        throw new Error(`Unexpected argument without option: ${arg}`);
      }
    }
  }

  if (!inputSource) {
    throw new Error("Missing input source. Use -i or --from-base64");
  }

  if (single && python) {
    throw new Error("--single cannot be used with --python");
  }

  if (inputSource.type === "base64" && python) {
    throw new Error("--from-base64 cannot be used with --python");
  }

  return {
    inputSource,
    outputPath,
    python,
    single,
  };
}

function getCliOptions(args: string[]): CliOptions {
  try {
    return parseCliOptions(args);
  } catch (error) {
    let message = String(error);

    if (error instanceof Error) {
      message = error.message;
    }

    console.error(`Error: ${message}\n\n${usage()}`);
    process.exit(1);
  }
}

const cliOptions = getCliOptions(process.argv.slice(2));

function readInput(options: CliOptions): Uint8Array {
  if (options.inputSource.type === "base64") {
    return Buffer.from(options.inputSource.value, "base64");
  }

  const input = readFileSync(options.inputSource.path);

  if (options.python) {
    return Language.python(input.toString());
  }

  return input;
}

function parseDescriptorFiles(
  descriptor: Uint8Array,
  useSingleDescriptor: boolean,
): FileDescriptorProto[] {
  if (useSingleDescriptor) {
    return [fromBinary(FileDescriptorProtoSchema, descriptor)];
  }

  return fromBinary(FileDescriptorSetSchema, descriptor).file;
}

const buffer = readInput(cliOptions);
const files = parseDescriptorFiles(buffer, cliOptions.single);

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

function formatFile(file: FileDescriptorProto): string {
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

function writeOutputFile(filePath: string, content: string): void {
  const dir = dirname(filePath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, content);
  console.log(`Written: ${filePath}`);
}

const formattedFiles = files.map((file) => ({
  content: formatFile(file),
  file,
}));

if (!cliOptions.outputPath) {
  for (const { content } of formattedFiles) {
    console.log(content);
  }
} else if (cliOptions.single || cliOptions.python) {
  const [formattedFile] = formattedFiles;

  if (!formattedFile) {
    throw new Error("No descriptor files found");
  }

  writeOutputFile(cliOptions.outputPath, formattedFile.content);
} else {
  for (const { content, file } of formattedFiles) {
    const filePath = getOutputFilePath(cliOptions.outputPath, file.package, file.name);

    writeOutputFile(filePath, content);
  }
}
