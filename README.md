# unbake-proto

Decompile protoc-compiled protobuf descriptor into human-readable `.proto` which is semantically equivalent to the original.

## support

- file descriptor set (binary)
- single file descriptor proto (binary, with `--single`)
- python (`*_pb2.py`)

## usage

```shell
npx unbake-proto <input> # output to stdout
npx unbake-proto <input> [out_folder] # output to file(s)
npx unbake-proto <input> --single # read a single FileDescriptorProto
```

### options

| Option     | Description                               |
| ---------- | ----------------------------------------- |
| `--single` | Use a single FileDescriptorProto as input |
| `--python` | Use a Python file as input                |

## try

prepare your `.proto` file and then run the following commands

```shell
protoc --descriptor_set_out=baked.pb --include_imports original.proto
npx unbake-proto baked.pb > unbaked.proto
```

there should be no difference between `original.proto` and `unbaked.proto` !

`FileDescriptorSet` is a container for one or more `FileDescriptorProto` messages. Use the default mode for descriptor sets, especially when the input includes imports. Use `--single` only when the input file is the binary data for one `FileDescriptorProto`. Generated Python files embed one `FileDescriptorProto`, and `--python` processes it as a one-file descriptor set. If `--single` is also passed with `--python`, `--single` is ignored with a warning.

## development

requires `pnpm`
