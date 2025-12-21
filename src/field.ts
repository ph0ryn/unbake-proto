import type { FieldDescriptorProto } from "@bufbuild/protobuf/wkt";

export interface FieldStyle {
  prefix: string; // "optional ", "required ", "repeated ", ""
  typeString: string; // Resolved type name
}

/**
 * Represents the current scope for type name resolution.
 * Used to determine the shortest valid type name.
 */
export interface TypeScope {
  package: string; // e.g., "playground.v2"
  messagePath: string[]; // e.g., ["Envelope", "Actor"] for nested messages
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
   * Returns the style information (prefix and type string) for this field
   * based on the proto syntax version and current scope.
   */
  getStyle(syntax: string, scope: TypeScope): FieldStyle {
    return {
      prefix: this.resolvePrefix(syntax),
      typeString: this.resolveTypeString(scope),
    };
  }

  private resolvePrefix(syntax: string): string {
    // Handle proto3 optional keyword
    if (syntax === "proto3" && this.label === 1 && this.proto3Optional) {
      return "optional ";
    }

    // In proto3, OPTIONAL label is implicit (empty prefix)
    if (syntax === "proto3" && this.label === 1) {
      return "";
    }

    // Label mapping: 1=OPTIONAL, 2=REQUIRED, 3=REPEATED
    switch (this.label) {
      case 1:
        return "optional ";
      case 2:
        return "required ";
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

        return this.shortenTypeName(this.typeName, scope);
      case 12:
        return "bytes";
      case 13:
        return "uint32";
      case 14:
        if (!this.typeName) {
          throw new Error(`ENUM type field "${this.name}" has no typeName`);
        }

        return this.shortenTypeName(this.typeName, scope);
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

  /**
   * Shortens a fully-qualified type name based on the current scope.
   *
   * Protobuf resolution rules:
   * 1. Same message scope: use short name (Kind)
   * 2. Parent message scope: use relative path (Actor.Kind)
   * 3. Same package top-level: use short name (Environment)
   * 4. Different package: use FQN (.other.package.Type)
   *
   * @param fqn Fully-qualified type name (e.g., ".playground.v2.Envelope.Actor.Kind")
   * @param scope Current scope information
   * @returns Shortest valid type name
   */
  private shortenTypeName(fqn: string, scope: TypeScope): string {
    // FQN starts with ".", remove it for processing
    let typePath = fqn;

    if (fqn.startsWith(".")) {
      typePath = fqn.slice(1);
    }

    const typeParts = typePath.split(".");

    // Build current scope path: package + messagePath
    const scopeParts: string[] = [];

    if (scope.package) {
      scopeParts.push(...scope.package.split("."));
    }

    scopeParts.push(...scope.messagePath);

    // Try to find the longest common prefix between scope and type
    // Then return the remaining part of the type name

    // Check from current scope upward to find where the type is visible
    // Start from deepest scope (current message) and work up to package level

    for (let depth = scopeParts.length; depth >= 0; depth--) {
      const testScopeParts = scopeParts.slice(0, depth);

      // Check if type starts with this scope prefix
      if (this.startsWithPrefix(typeParts, testScopeParts)) {
        // Type is within this scope, return the relative part
        const relativeParts = typeParts.slice(testScopeParts.length);

        if (relativeParts.length > 0) {
          return relativeParts.join(".");
        }
      }
    }

    // Type is in a different package, return FQN
    return fqn;
  }

  /**
   * Checks if array starts with the given prefix.
   */
  private startsWithPrefix(arr: string[], prefix: string[]): boolean {
    if (prefix.length > arr.length) {
      return false;
    }

    for (let idx = 0; idx < prefix.length; idx++) {
      if (arr[idx] !== prefix[idx]) {
        return false;
      }
    }

    return true;
  }
}
