import { EnumType } from "./enum.js";
import { FieldDescriptor } from "./field.js";
import { MessageType } from "./message.js";
import { ServiceDescriptor } from "./service.js";

import type { FileDescriptorProto } from "@bufbuild/protobuf/wkt";

export class Descriptor {
  name?: string;
  package?: string;
  dependency: string[];
  publicDependency: number[];
  weakDependency: number[];
  optionDependency: string[];

  messageType: MessageType[];
  enumType: EnumType[];
  service: ServiceDescriptor[];
  extension: FieldDescriptor[];

  options?: any; // FileOptions
  sourceCodeInfo?: any; // SourceCodeInfo
  syntax?: string;
  edition?: string;

  constructor(proto: FileDescriptorProto) {
    this.name = proto.name;
    this.package = proto.package;
    this.dependency = proto.dependency;
    this.publicDependency = proto.publicDependency;
    this.weakDependency = proto.weakDependency;
    // this.optionDependency = proto.optionDependency; // @bufbuild types might miss this if not latest, check mapping

    this.messageType = proto.messageType.map((msg) => new MessageType(msg));
    this.enumType = proto.enumType.map((enu) => new EnumType(enu));

    this.service = proto.service.map((svc) => new ServiceDescriptor(svc));
    this.extension = proto.extension.map((ext) => new FieldDescriptor(ext));

    this.options = proto.options;
    this.sourceCodeInfo = proto.sourceCodeInfo;
    this.syntax = proto.syntax;
    this.edition = proto.edition as any;

    // Manual handling for fields that might be missing in standard types but present in raw proto
    // For now assuming @bufbuild/protobuf/wkt FileDescriptorProto is sufficient or we cast to any
    this.optionDependency = (proto as any).optionDependency ?? [];
  }
}
