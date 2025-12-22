import type { EnumType } from "./enum.js";
import type { FieldDescriptor, TypeScope } from "./field.js";
import type { MessageType } from "./message.js";
import type { Descriptor } from "./protobuf.js";
import type { ServiceDescriptor } from "./service.js";

export class Formatter {
  private buffer: string[] = [];
  private indentLevel = 0;
  private messagePath: string[] = [];

  constructor(private descriptor: Descriptor) {}

  format(): string {
    this.buffer = [];
    this.indentLevel = 0;
    this.messagePath = [];

    if (this.descriptor.syntax) {
      this.line(`syntax = "${this.descriptor.syntax}";`);
      this.emptyLine();
    }

    if (this.descriptor.edition) {
      this.line(`// edition = ${this.descriptor.edition};`);
    }

    if (this.descriptor.package) {
      this.line(`package ${this.descriptor.package};`);
      this.emptyLine();
    }

    // File options
    this.printFileOptions();

    // Imports (with public/weak modifiers)
    for (let idx = 0; idx < this.descriptor.dependency.length; idx++) {
      const dep = this.descriptor.dependency[idx];
      let modifier = "";

      if (this.descriptor.publicDependency.includes(idx)) {
        modifier = "public ";
      } else if (this.descriptor.weakDependency.includes(idx)) {
        modifier = "weak ";
      }

      this.line(`import ${modifier}"${dep}";`);
    }

    if (this.descriptor.dependency.length > 0) {
      this.emptyLine();
    }

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

    // Track message path for scope resolution
    if (msg.name) {
      this.messagePath.push(msg.name);
    }

    // Message options
    if (msg.options?.deprecated) {
      this.line("option deprecated = true;");
    }

    if (msg.options?.mapEntry) {
      this.line("option map_entry = true;");
    }

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

    // Use domain method to get field groups
    const { oneofGroups, regularFields } = msg.getFieldGroups();

    // Print regular fields
    for (const field of regularFields) {
      this.printField(field);
    }

    // Print oneofs
    for (const group of oneofGroups) {
      this.line(`oneof ${group.name} {`);
      this.indent();

      for (const fld of group.fields) {
        this.printField(fld);
      }

      this.dedent();
      this.line(`}`);
    }

    // Extensions inside message
    if (msg.extension && msg.extension.length > 0) {
      this.emptyLine();

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

    // Reserved ranges
    if (msg.reservedRange && msg.reservedRange.length > 0) {
      const ranges = msg.reservedRange.map((range) => {
        if (range.start === range.end! - 1) {
          return String(range.start);
        }

        return `${range.start} to ${range.end! - 1}`;
      });

      this.line(`reserved ${ranges.join(", ")};`);
    }

    // Reserved names
    if (msg.reservedName && msg.reservedName.length > 0) {
      const names = msg.reservedName.map((name) => `"${name}"`);

      this.line(`reserved ${names.join(", ")};`);
    }

    // Pop message path when leaving this message
    if (msg.name) {
      this.messagePath.pop();
    }

    this.dedent();
    this.line(`}`);
  }

  private printEnum(enumType: EnumType) {
    this.line(`enum ${enumType.name} {`);
    this.indent();

    // Enum options
    if (enumType.options?.allowAlias) {
      this.line("option allow_alias = true;");
    }

    if (enumType.options?.deprecated) {
      this.line("option deprecated = true;");
    }

    for (const val of enumType.value) {
      let valOpts = "";

      if (val.options?.deprecated) {
        valOpts = " [deprecated = true]";
      }

      this.line(`${val.name} = ${val.number}${valOpts};`);
    }

    this.dedent();
    this.line(`}`);
  }

  private printService(service: ServiceDescriptor) {
    this.line(`service ${service.name} {`);
    this.indent();

    for (const method of service.method) {
      const sig = method.getSignature();
      let inputPrefix = "";
      let outputPrefix = "";

      if (sig.clientStreaming) {
        inputPrefix = "stream ";
      }

      if (sig.serverStreaming) {
        outputPrefix = "stream ";
      }

      this.line(
        `rpc ${method.name} (${inputPrefix}${sig.inputType}) returns (${outputPrefix}${sig.outputType});`,
      );
    }

    this.dedent();
    this.line(`}`);
  }

  private printField(field: FieldDescriptor) {
    const syntax = this.descriptor.syntax ?? "proto3";
    const scope = this.getCurrentScope();
    const style = field.getStyle(syntax, scope);
    const options = this.formatFieldOptions(field, syntax);

    this.line(`${style.prefix}${style.typeString} ${field.name} = ${field.number}${options};`);
  }

  private formatFieldOptions(field: FieldDescriptor, syntax: string): string {
    const opts: string[] = [];

    // default_value (proto2 only)
    if (syntax !== "proto3" && field.defaultValue !== undefined) {
      // String values need quotes
      if (field.type === 9) {
        // TYPE_STRING
        opts.push(`default = "${field.defaultValue}"`);
      } else if (field.type === 12) {
        // TYPE_BYTES
        opts.push(`default = "${field.defaultValue}"`);
      } else {
        opts.push(`default = ${field.defaultValue}`);
      }
    }

    // packed option
    if (field.options?.packed !== undefined) {
      opts.push(`packed = ${field.options.packed}`);
    }

    // deprecated option
    if (field.options?.deprecated) {
      opts.push("deprecated = true");
    }

    // json_name (only if different from default camelCase)
    // Skip for now as it's complex to determine default

    if (opts.length > 0) {
      return ` [${opts.join(", ")}]`;
    }

    return "";
  }

  private getCurrentScope(): TypeScope {
    return {
      messagePath: [...this.messagePath],
      package: this.descriptor.package ?? "",
    };
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

  private printFileOptions() {
    const options = this.descriptor.getFileOptions();

    for (const opt of options) {
      this.line(`option ${opt.name} = ${opt.value};`);
    }

    if (options.length > 0) {
      this.emptyLine();
    }
  }
}
