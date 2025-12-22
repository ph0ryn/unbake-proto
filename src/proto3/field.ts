import { shortenTypeName, type TypeScope } from "./scope";

import type { FieldDescriptorProto } from "@bufbuild/protobuf/wkt";

export type { TypeScope };

export interface FieldStyle {
  prefix: string; // "", "optional ", "repeated "
  typeString: string; // Resolved type name
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
  options?: any; // FieldOptions
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
