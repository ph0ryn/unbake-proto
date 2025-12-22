import { EnumType } from "./enum.js";
import { FieldDescriptor } from "./field.js";
import { MessageType } from "./message.js";
import { ServiceDescriptor } from "./service.js";

import type { FileDescriptorProto } from "@bufbuild/protobuf/wkt";

export class Descriptor {
  name?: string;
  package?: string;
  dependency: string[];
  publicDependency: number[];
  weakDependency: number[];
  optionDependency: string[];

  messageType: MessageType[];
  enumType: EnumType[];
  service: ServiceDescriptor[];
  extension: FieldDescriptor[];

  options?: any; // FileOptions
  sourceCodeInfo?: any; // SourceCodeInfo
  edition?: string;

  constructor(proto: FileDescriptorProto) {
    this.name = proto.name;
    this.package = proto.package;
    this.dependency = proto.dependency;
    this.publicDependency = proto.publicDependency;
    this.weakDependency = proto.weakDependency;

    this.messageType = proto.messageType.map((msg) => new MessageType(msg));
    this.enumType = proto.enumType.map((enu) => new EnumType(enu));

    this.service = proto.service.map((svc) => new ServiceDescriptor(svc));
    this.extension = proto.extension.map((ext) => new FieldDescriptor(ext));

    this.options = proto.options;
    this.sourceCodeInfo = proto.sourceCodeInfo;
    this.edition = proto.edition as any;

    // Manual handling for fields that might be missing in standard types but present in raw proto
    this.optionDependency = (proto as any).optionDependency ?? [];
  }

  /**
   * Returns file options that differ from their default values.
   */
  getFileOptions(): FileOption[] {
    const result: FileOption[] = [];
    const opts = this.options;

    if (!opts) {
      return result;
    }

    // String options - output if non-empty
    const stringOptions: { key: string; name: string }[] = [
      { key: "javaPackage", name: "java_package" },
      { key: "javaOuterClassname", name: "java_outer_classname" },
      { key: "goPackage", name: "go_package" },
      { key: "objcClassPrefix", name: "objc_class_prefix" },
      { key: "csharpNamespace", name: "csharp_namespace" },
      { key: "swiftPrefix", name: "swift_prefix" },
      { key: "phpClassPrefix", name: "php_class_prefix" },
      { key: "phpNamespace", name: "php_namespace" },
      { key: "phpMetadataNamespace", name: "php_metadata_namespace" },
      { key: "rubyPackage", name: "ruby_package" },
    ];

    for (const { key, name } of stringOptions) {
      const value = opts[key];

      if (typeof value === "string" && value.length > 0) {
        result.push({ name, value: `"${value}"` });
      }
    }

    // Boolean options - output only if differs from default
    const boolOptions: { defaultValue: boolean; key: string; name: string }[] = [
      { defaultValue: false, key: "javaMultipleFiles", name: "java_multiple_files" },
      { defaultValue: false, key: "javaStringCheckUtf8", name: "java_string_check_utf8" },
      { defaultValue: false, key: "ccGenericServices", name: "cc_generic_services" },
      { defaultValue: false, key: "javaGenericServices", name: "java_generic_services" },
      { defaultValue: false, key: "pyGenericServices", name: "py_generic_services" },
      { defaultValue: false, key: "deprecated", name: "deprecated" },
      { defaultValue: true, key: "ccEnableArenas", name: "cc_enable_arenas" },
    ];

    for (const { defaultValue, key, name } of boolOptions) {
      const value = opts[key];

      if (typeof value === "boolean" && value !== defaultValue) {
        result.push({ name, value: String(value) });
      }
    }

    // optimize_for enum (default: SPEED = 1)
    if (opts.optimizeFor !== undefined && opts.optimizeFor !== 1) {
      const optimizeMap: Record<number, string> = {
        1: "SPEED",
        2: "CODE_SIZE",
        3: "LITE_RUNTIME",
      };
      const enumVal = optimizeMap[opts.optimizeFor];

      if (enumVal) {
        result.push({ name: "optimize_for", value: enumVal });
      }
    }

    return result;
  }
}

export interface FileOption {
  name: string;
  value: string;
}
