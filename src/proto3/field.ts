import { shortenTypeName, type TypeScope } from "./scope";

import type { FieldDescriptorProto, FieldOptions } from "@bufbuild/protobuf/wkt";

export type { TypeScope };

export interface FieldStyle {
  prefix: string; // "", "optional ", "repeated "
  typeString: string; // Resolved type name
}

export interface FieldOptionEntry {
  name: string;
  value: string;
}

export class FieldDescriptor {
  name?: string;
  number?: number;
  label?: number; // FieldDescriptorProto_Label: 1=OPTIONAL, 2=REQUIRED, 3=REPEATED
  type?: number; // FieldDescriptorProto_Type
  typeName?: string;
  extendee?: string;
  defaultValue?: string;
  oneofIndex?: number;
  jsonName?: string;
  options?: FieldOptions;
  proto3Optional?: boolean;

  constructor(proto: FieldDescriptorProto) {
    this.name = proto.name;
    this.number = proto.number;
    this.label = proto.label;
    this.type = proto.type;
    this.typeName = proto.typeName;
    this.extendee = proto.extendee;
    this.defaultValue = proto.defaultValue;
    // Check for presence of oneofIndex options
    // Accessing getter returns default 0, but the property key exists on the instance if set.
    const hasOneofIndex = Object.keys(proto).includes("oneofIndex");

    if (hasOneofIndex) {
      this.oneofIndex = proto.oneofIndex;
    } else {
      this.oneofIndex = undefined;
    }

    this.jsonName = proto.jsonName;
    this.options = proto.options;
    this.proto3Optional = proto.proto3Optional;
  }

  /**
   * Returns the style information (prefix and type string) for this field.
   * Proto3 version - optional is implicit unless proto3_optional is set.
   */
  getStyle(scope: TypeScope): FieldStyle {
    return {
      prefix: this.resolvePrefix(),
      typeString: this.resolveTypeString(scope),
    };
  }

  /**
   * Returns the shortened extendee name for extension fields.
   */
  getExtendee(scope: TypeScope): string {
    if (!this.extendee) {
      return "";
    }

    return shortenTypeName(this.extendee, scope);
  }

  /**
   * Returns field options as an array of name-value pairs.
   * Proto3 version - no default values.
   */
  getOptions(): FieldOptionEntry[] {
    const entries: FieldOptionEntry[] = [];
    const opts = this.options;

    if (!opts) {
      return entries;
    }

    // Packed option
    if (opts.packed === true) {
      entries.push({ name: "packed", value: "true" });
    }

    // Deprecated option
    if (opts.deprecated === true) {
      entries.push({ name: "deprecated", value: "true" });
    }

    // Retention enum
    if (opts.retention !== 0) {
      const retentionMap: Record<number, string> = {
        1: "RETENTION_RUNTIME",
        2: "RETENTION_SOURCE",
      };
      const val = retentionMap[opts.retention];

      if (val) {
        entries.push({ name: "retention", value: val });
      }
    }

    // Targets - repeated OptionTargetType
    const targetMap: Record<number, string> = {
      1: "TARGET_TYPE_FILE",
      2: "TARGET_TYPE_EXTENSION_RANGE",
      3: "TARGET_TYPE_MESSAGE",
      4: "TARGET_TYPE_FIELD",
      5: "TARGET_TYPE_ONEOF",
      6: "TARGET_TYPE_ENUM",
      7: "TARGET_TYPE_ENUM_ENTRY",
      8: "TARGET_TYPE_SERVICE",
      9: "TARGET_TYPE_METHOD",
    };

    for (const target of opts.targets) {
      const val = targetMap[target];

      if (val) {
        entries.push({ name: "targets", value: val });
      }
    }

    // Feature_support - nested message
    if (opts.featureSupport) {
      const parts: string[] = [];
      const fs = opts.featureSupport;

      if (fs.editionIntroduced !== 0) {
        parts.push(`edition_introduced: ${this.formatEdition(fs.editionIntroduced)}`);
      }

      if (fs.editionDeprecated !== 0) {
        parts.push(`edition_deprecated: ${this.formatEdition(fs.editionDeprecated)}`);
      }

      if (fs.deprecationWarning) {
        parts.push(`deprecation_warning: "${fs.deprecationWarning}"`);
      }

      if (fs.editionRemoved !== 0) {
        parts.push(`edition_removed: ${this.formatEdition(fs.editionRemoved)}`);
      }

      if ((fs as any).removalError) {
        parts.push(`removal_error: "${(fs as any).removalError}"`);
      }

      if (parts.length > 0) {
        entries.push({ name: "feature_support", value: `{ ${parts.join(", ")} }` });
      }
    }

    // Edition_defaults - repeated nested message
    for (const ed of opts.editionDefaults) {
      const parts: string[] = [];

      if (ed.edition !== 0) {
        parts.push(`edition: ${this.formatEdition(ed.edition)}`);
      }

      parts.push(`value: "${ed.value}"`);

      entries.push({ name: "edition_defaults", value: `{ ${parts.join(", ")} }` });
    }

    return entries;
  }

  private formatEdition(edition: number): string {
    const editionMap: Record<number, string> = {
      0: "EDITION_UNKNOWN",
      1: "EDITION_1_TEST_ONLY",
      1000: "EDITION_2023",
      1001: "EDITION_2024",
      2: "EDITION_2_TEST_ONLY",
      900: "EDITION_LEGACY",
      998: "EDITION_PROTO2",
      999: "EDITION_PROTO3",
      9999: "EDITION_UNSTABLE",
      99997: "EDITION_99997_TEST_ONLY",
      99998: "EDITION_99998_TEST_ONLY",
      99999: "EDITION_99999_TEST_ONLY",
    };

    return editionMap[edition] ?? `EDITION_${edition}`;
  }

  private resolvePrefix(): string {
    // Handle proto3 optional keyword
    if (this.label === 1 && this.proto3Optional) {
      return "optional ";
    }

    // In proto3, OPTIONAL label is implicit (empty prefix)
    if (this.label === 1) {
      return "";
    }

    // Label mapping: 1=OPTIONAL, 2=REQUIRED, 3=REPEATED
    switch (this.label) {
      case 2:
        // Required is not valid in proto3, but handle for safety
        throw new Error(`Unexpected required label in proto3: field "${this.name}"`);
      case 3:
        return "repeated ";
      default:
        throw new Error(`Unexpected field label: ${this.label}`);
    }
  }

  private resolveTypeString(scope: TypeScope): string {
    // Type mapping: FieldDescriptorProto_Type enum values
    switch (this.type) {
      case 1:
        return "double";
      case 2:
        return "float";
      case 3:
        return "int64";
      case 4:
        return "uint64";
      case 5:
        return "int32";
      case 6:
        return "fixed64";
      case 7:
        return "fixed32";
      case 8:
        return "bool";
      case 9:
        return "string";
      case 10:
        return "group"; // Deprecated
      case 11:
        if (!this.typeName) {
          throw new Error(`MESSAGE type field "${this.name}" has no typeName`);
        }

        return shortenTypeName(this.typeName, scope);
      case 12:
        return "bytes";
      case 13:
        return "uint32";
      case 14:
        if (!this.typeName) {
          throw new Error(`ENUM type field "${this.name}" has no typeName`);
        }

        return shortenTypeName(this.typeName, scope);
      case 15:
        return "sfixed32";
      case 16:
        return "sfixed64";
      case 17:
        return "sint32";
      case 18:
        return "sint64";
      default:
        throw new Error(`Unexpected field type: ${this.type}`);
    }
  }
}
