import { EnumType } from "./enum.js";
import { FieldDescriptor } from "./field.js";
import { OneofDescriptor } from "./oneof.js";

import type { DescriptorProto } from "@bufbuild/protobuf/wkt";

export class MessageType {
  name?: string;
  field: FieldDescriptor[];
  extension: FieldDescriptor[];
  nestedType: MessageType[];
  enumType: EnumType[];
  extensionRange: { start?: number; end?: number; options?: any }[];
  oneofDecl: OneofDescriptor[];

  options?: any; // MessageOptions
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
}
