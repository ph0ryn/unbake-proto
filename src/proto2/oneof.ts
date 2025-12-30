import type { OneofDescriptorProto, OneofOptions } from "@bufbuild/protobuf/wkt";

export class OneofDescriptor {
  name?: string;
  options?: OneofOptions;

  constructor(proto: OneofDescriptorProto) {
    this.name = proto.name;
    this.options = proto.options;
  }
}
