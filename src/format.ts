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

    // Collect map entry message names for map field detection
    const mapEntryNames = new Set<string>();

    for (const nested of msg.nestedType) {
      if (nested.options?.mapEntry) {
        mapEntryNames.add(nested.name ?? "");
      }
    }

    // Nested Enums
    for (const enumType of msg.enumType) {
      this.printEnum(enumType);
      this.emptyLine();
    }

    // Nested Messages (skip map_entry messages)
    const nonMapNestedTypes = msg.nestedType.filter((nested) => !nested.options?.mapEntry);

    for (const nested of nonMapNestedTypes) {
      this.printMessage(nested);
      this.emptyLine();
    }

    // Use domain method to get field groups
    const { oneofGroups, regularFields } = msg.getFieldGroups();

    // Print regular fields (with map conversion)
    for (const field of regularFields) {
      this.printField(field, { mapEntryNames, nestedTypes: msg.nestedType });
    }

    // Print oneofs
    for (const group of oneofGroups) {
      this.line(`oneof ${group.name} {`);
      this.indent();

      for (const fld of group.fields) {
        // oneof fields don't have labels (optional/required/repeated)
        this.printField(fld, { isOneofField: true });
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
      const sig = method.getSignature(this.getCurrentScope());
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

  private printField(
    field: FieldDescriptor,
    opts: { mapEntryNames?: Set<string>; nestedTypes?: MessageType[]; isOneofField?: boolean } = {},
  ) {
    const { mapEntryNames, nestedTypes, isOneofField } = opts;
    const syntax = this.descriptor.syntax ?? "proto3";
    const scope = this.getCurrentScope();

    // Check if this field is a map field
    if (mapEntryNames && nestedTypes && field.typeName) {
      const shortTypeName = field.typeName.split(".").pop() ?? "";

      if (mapEntryNames.has(shortTypeName)) {
        const mapEntry = nestedTypes.find((nt) => nt.name === shortTypeName);

        if (mapEntry && mapEntry.field.length >= 2) {
          const keyField = mapEntry.field.find((fld) => fld.number === 1);
          const valueField = mapEntry.field.find((fld) => fld.number === 2);

          if (keyField && valueField) {
            const keyStyle = keyField.getStyle(syntax, scope);
            const valueStyle = valueField.getStyle(syntax, scope);
            const options = this.formatFieldOptions(field, syntax);

            this.line(
              `map<${keyStyle.typeString}, ${valueStyle.typeString}> ${field.name} = ${field.number}${options};`,
            );

            return;
          }
        }
      }
    }

    const style = field.getStyle(syntax, scope);
    const options = this.formatFieldOptions(field, syntax);
    // oneof fields don't have labels (optional/required/repeated)
    let prefix = style.prefix;

    if (isOneofField) {
      prefix = "";
    }

    this.line(`${prefix}${style.typeString} ${field.name} = ${field.number}${options};`);
  }

  private formatFieldOptions(field: FieldDescriptor, syntax: string): string {
    const opts: string[] = [];

    // default_value (proto2 only, skip empty strings and undefined)
    if (syntax !== "proto3" && field.defaultValue !== undefined && field.defaultValue !== "") {
      // String values need quotes
      if (field.type === 9) {
        // TYPE_STRING
        opts.push(`default = "${field.defaultValue}"`);
      } else if (field.type === 12) {
        // TYPE_BYTES - skip if empty
        if (field.defaultValue.length > 0) {
          opts.push(`default = "${field.defaultValue}"`);
        }
      } else {
        opts.push(`default = ${field.defaultValue}`);
      }
    }

    // packed option (only output if true, false is default for proto2)
    if (field.options?.packed === true) {
      opts.push("packed = true");
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
