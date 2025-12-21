import type { FieldDescriptorProto } from "@bufbuild/protobuf/wkt";

export class FieldDescriptor {
  name?: string;
  number?: number;
  label?: number; // FieldDescriptorProto_Label
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
}
