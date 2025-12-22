import type { OneofDescriptorProto } from "@bufbuild/protobuf/wkt";

export class OneofDescriptor {
  name?: string;
  options?: any; // OneofOptions

  constructor(proto: OneofDescriptorProto) {
    this.name = proto.name;
    this.options = proto.options;
  }
}
