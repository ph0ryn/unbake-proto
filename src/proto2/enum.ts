import type { EnumDescriptorProto, EnumOptions, EnumValueOptions } from "@bufbuild/protobuf/wkt";

export class EnumType {
  name?: string;
  value: { name?: string; number?: number; options?: EnumValueOptions }[];
  options?: EnumOptions;
  reservedRange: { start?: number; end?: number }[];
  reservedName: string[];

  constructor(proto: EnumDescriptorProto) {
    this.name = proto.name;
    this.value = proto.value;
    this.options = proto.options;
    this.reservedRange = proto.reservedRange;
    this.reservedName = proto.reservedName;
  }
}
