import { shortenTypeName, type TypeScope } from "./scope";

import type { MethodDescriptorProto, ServiceDescriptorProto } from "@bufbuild/protobuf/wkt";

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

export interface MethodSignature {
  clientStreaming: boolean;
  inputType: string;
  outputType: string;
  serverStreaming: boolean;
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

  /**
   * Returns the method signature information for RPC formatting.
   */
  getSignature(scope: TypeScope): MethodSignature {
    if (!this.inputType) {
      throw new Error(`Method "${this.name}" has no inputType`);
    }

    if (!this.outputType) {
      throw new Error(`Method "${this.name}" has no outputType`);
    }

    return {
      clientStreaming: this.clientStreaming ?? false,
      inputType: shortenTypeName(this.inputType, scope),
      outputType: shortenTypeName(this.outputType, scope),
      serverStreaming: this.serverStreaming ?? false,
    };
  }
}
