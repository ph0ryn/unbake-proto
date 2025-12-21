import type { ServiceDescriptorProto, MethodDescriptorProto } from "@bufbuild/protobuf/wkt";

export class ServiceDescriptor {
  name?: string;
  method: MethodDescriptor[];
  options?: any; // ServiceOptions

  constructor(proto: ServiceDescriptorProto) {
    this.name = proto.name;
    this.method = proto.method.map((met) => new MethodDescriptor(met));
    this.options = proto.options;
  }
}

export class MethodDescriptor {
  name?: string;
  inputType?: string;
  outputType?: string;
  options?: any; // MethodOptions
  clientStreaming?: boolean;
  serverStreaming?: boolean;

  constructor(proto: MethodDescriptorProto) {
    this.name = proto.name;
    this.inputType = proto.inputType;
    this.outputType = proto.outputType;
    this.options = proto.options;
    this.clientStreaming = proto.clientStreaming;
    this.serverStreaming = proto.serverStreaming;
  }
}
