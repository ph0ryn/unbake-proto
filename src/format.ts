import type { EnumType } from "./enum.js";
import type { FieldDescriptor } from "./field.js";
import type { MessageType } from "./message.js";
import type { Descriptor } from "./protobuf.js";
import type { ServiceDescriptor } from "./service.js"; // MethodDescriptor removed if unused

export class Formatter {
  private buffer: string[] = [];
  private indentLevel = 0;

  constructor(private descriptor: Descriptor) {}

  format(): string {
    this.buffer = [];
    this.indentLevel = 0;

    if (this.descriptor.syntax) {
      this.line(`syntax = "${this.descriptor.syntax}";`);
      this.emptyLine();
    }

    if (this.descriptor.edition) {
      // Edition is stored as enum value, need mapping or direct print if we can resolve logic later
      // For now, handling as comment if not string, or assuming syntax covers it for proto2/3
      // If edition is present, syntax is "editions"
      this.line(`// edition = ${this.descriptor.edition};`);
    }

    if (this.descriptor.package) {
      this.line(`package ${this.descriptor.package};`);
      this.emptyLine();
    }

    // Imports
    for (const dep of this.descriptor.dependency) {
      this.line(`import "${dep}";`);
    }

    if (this.descriptor.dependency.length > 0) {
      this.emptyLine();
    }

    // Options (TODO: sophisticated option formatting)
    // this.printOptions(this.descriptor.options);

    // Enums
    for (const enumType of this.descriptor.enumType) {
      this.printEnum(enumType);
      this.emptyLine();
    }

    // Messages
    for (const messageType of this.descriptor.messageType) {
      this.printMessage(messageType);
      this.emptyLine();
    }

    // Services
    for (const service of this.descriptor.service) {
      this.printService(service);
      this.emptyLine();
    }

    // Top-level Extensions
    for (const ext of this.descriptor.extension) {
      this.line(`extend ${ext.extendee} {`);
      this.indent();
      this.printField(ext);
      this.dedent();
      this.line(`}`);
      this.emptyLine();
    }

    return this.buffer.join("\n");
  }

  private printMessage(msg: MessageType) {
    this.line(`message ${msg.name} {`);
    this.indent();

    // Options
    // this.printOptions(msg.options);

    // Reserved
    // TODO: format reserved

    // Nested Enums
    for (const enumType of msg.enumType) {
      this.printEnum(enumType);
      this.emptyLine();
    }

    // Nested Messages
    for (const nested of msg.nestedType) {
      this.printMessage(nested);
      this.emptyLine();
    }

    // Fields
    // Group fields by oneof? Or just print as is and handle oneof separately?
    // Oneofs in DescriptorProto are stored in oneof_decl, and fields reference oneof_index.
    // We need to group them.

    // Map of oneof index to fields
    const oneofFields = new Map<number, FieldDescriptor[]>();
    const regularFields: FieldDescriptor[] = [];

    msg.field.forEach((fld) => {
      if (fld.oneofIndex !== undefined && !fld.proto3Optional) {
        if (!oneofFields.has(fld.oneofIndex)) {
          oneofFields.set(fld.oneofIndex, []);
        }

        oneofFields.get(fld.oneofIndex)?.push(fld);
      } else {
        regularFields.push(fld);
      }
    });

    // Print regular fields mixed with Oneofs? Order matters?
    // DescriptorProto stores fields in order, but oneof grouping might scramble it physically in file if we separate rigidly.
    // For reconstruction, we probably want to try to keep order, but grouping oneofs is mandatory syntax.
    // Let's print regular fields first, then oneofs. Or iterate oneofs.

    for (const field of regularFields) {
      this.printField(field);
    }

    // Oneofs
    if (msg.oneofDecl) {
      msg.oneofDecl.forEach((oneof, index) => {
        const fields = oneofFields.get(index);

        if (fields && fields.length > 0) {
          // Synthetic oneofs (proto3_optional) are skipped above
          this.line(`oneof ${oneof.name} {`);
          this.indent();
          fields.forEach((fld) => this.printField(fld));
          this.dedent();
          this.line(`}`);
        }
      });
    }

    // Extensions inside message?
    if (msg.extension && msg.extension.length > 0) {
      this.emptyLine();

      // Extensions defined IN a message are usually "extend Foo { ... }" scoped?
      // Wait, DescriptorProto.extension field is "nested extensions".
      for (const extension of msg.extension) {
        this.line(`extend ${extension.extendee} {`);
        this.indent();
        this.printField(extension);
        this.dedent();
        this.line(`}`);
      }
    }

    // Extension Ranges
    if (msg.extensionRange && msg.extensionRange.length > 0) {
      for (const range of msg.extensionRange) {
        let end: number | string = "max";

        if (range.end) {
          end = range.end - 1;
        }

        this.line(`extensions ${range.start} to ${end};`);
      }
    }

    this.dedent();
    this.line(`}`);
  }

  private printEnum(enumType: EnumType) {
    this.line(`enum ${enumType.name} {`);
    this.indent();
    // Options

    for (const val of enumType.value) {
      this.line(`${val.name} = ${val.number};`);
    }

    this.dedent();
    this.line(`}`);
  }

  private printService(service: ServiceDescriptor) {
    this.line(`service ${service.name} {`);
    this.indent();

    for (const method of service.method) {
      this.line(`rpc ${method.name} (${method.inputType}) returns (${method.outputType});`);
    }

    this.dedent();
    this.line(`}`);
  }

  private printField(field: FieldDescriptor) {
    const label = this.getLabelString(field.label);
    const type = this.getTypeString(field.type, field.typeName);

    // If proto3, optional is implicit unless has_optional keyword (handled via oneof).
    // But if we are in Oneof block, label is omitted.
    // If file is proto3, LABEL_OPTIONAL is default (empty string).
    // If file is proto2, LABEL_OPTIONAL is "optional".

    let prefix = "";

    if (label) {
      prefix = `${label} `;
    }

    // Check context (oneof fields don't have labels printed)
    // Here we print regular fields. Logic above separated them.
    // However, for proto3, 'optional' keyword is special.

    if (
      this.descriptor.syntax === "proto3" &&
      field.label === 1 /* OPTIONAL */ &&
      field.proto3Optional
    ) {
      prefix = "optional ";
    } else if (this.descriptor.syntax === "proto3" && field.label === 1) {
      prefix = ""; // implicit optional
    }

    this.line(`${prefix}${type} ${field.name} = ${field.number};`);
  }

  private getLabelString(label?: number): string {
    // 1: OPTIONAL, 2: REQUIRED, 3: REPEATED
    // TODO: Map from enum value correctly or use constant
    if (label === 2) {
      return "required";
    }

    if (label === 3) {
      return "repeated";
    }

    if (label === 1) {
      return "optional";
    } // For proto2. Proto3 handling in caller.

    return "";
  }

  private getTypeString(type?: number, typeName?: string): string {
    // Map FieldDescriptorProto_Type enums to strings
    // 1: DOUBLE, 2: FLOAT, 3: INT64, 4: UINT64, 5: INT32, 6: FIXED64, 7: FIXED32, 8: BOOL, 9: STRING
    // 10: GROUP, 11: MESSAGE, 12: BYTES, 13: UINT32, 14: ENUM, 15: SFIXED32, 16: SFIXED64, 17: SINT32, 18: SINT64
    switch (type) {
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
        return typeName || "message";
      case 12:
        return "bytes";
      case 13:
        return "uint32";
      case 14:
        return typeName || "enum"; // Use type_name for Enums
      case 15:
        return "sfixed32";
      case 16:
        return "sfixed64";
      case 17:
        return "sint32";
      case 18:
        return "sint64";
      default:
        return "unknown";
    }
  }

  private indent() {
    this.indentLevel++;
  }

  private dedent() {
    this.indentLevel--;
  }

  private line(text: string) {
    const spaces = "  ".repeat(this.indentLevel);

    this.buffer.push(spaces + text);
  }

  private emptyLine() {
    if (this.buffer.length > 0 && this.buffer[this.buffer.length - 1] !== "") {
      this.buffer.push("");
    }
  }
}
