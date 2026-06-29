import { EnumType } from "./enum";
import { FieldDescriptor } from "./field";
import { OneofDescriptor } from "./oneof";

import type {
  DescriptorProto,
  ExtensionRangeOptions,
  MessageOptions,
} from "@bufbuild/protobuf/wkt";

export interface OneofGroup {
  name: string;
  fields: FieldDescriptor[];
}

export interface FieldGroups {
  regularFields: FieldDescriptor[];
  oneofGroups: OneofGroup[];
}

export class MessageType {
  name?: string;
  field: FieldDescriptor[];
  extension: FieldDescriptor[];
  nestedType: MessageType[];
  enumType: EnumType[];
  extensionRange: { start?: number; end?: number; options?: ExtensionRangeOptions }[];
  oneofDecl: OneofDescriptor[];

  options?: MessageOptions;
  reservedRange: { start?: number; end?: number }[];
  reservedName: string[];

  constructor(proto: DescriptorProto) {
    this.name = proto.name;
    this.field = proto.field.map((fld) => new FieldDescriptor(fld));
    this.extension = proto.extension.map((ext) => new FieldDescriptor(ext));
    this.nestedType = proto.nestedType.map((nst) => new MessageType(nst));
    this.enumType = proto.enumType.map((enu) => new EnumType(enu));
    this.extensionRange = proto.extensionRange;
    this.oneofDecl = proto.oneofDecl.map((onf) => new OneofDescriptor(onf));
    this.options = proto.options;
    this.reservedRange = proto.reservedRange;
    this.reservedName = proto.reservedName;
  }

  /**
   * Groups fields into regular fields and oneof groups.
   * Proto3 optional fields (synthetic oneofs) are treated as regular fields.
   */
  getFieldGroups(): FieldGroups {
    const oneofFields = new Map<number, FieldDescriptor[]>();
    const regularFields: FieldDescriptor[] = [];

    this.field.forEach((fld) => {
      // Synthetic oneofs (proto3_optional) are skipped
      if (fld.oneofIndex !== undefined && !fld.proto3Optional) {
        if (!oneofFields.has(fld.oneofIndex)) {
          oneofFields.set(fld.oneofIndex, []);
        }

        oneofFields.get(fld.oneofIndex)?.push(fld);
      } else {
        regularFields.push(fld);
      }
    });

    const oneofGroups: OneofGroup[] = [];

    this.oneofDecl.forEach((oneof, index) => {
      const fields = oneofFields.get(index);

      if (fields && fields.length > 0) {
        oneofGroups.push({
          fields,
          name: oneof.name ?? "",
        });
      }
    });

    return { oneofGroups, regularFields };
  }
}
