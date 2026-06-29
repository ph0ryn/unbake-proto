# unbake-proto

Decompile protoc-compiled protobuf descriptor into human-readable `.proto` which is semantically equivalent to the original.

## support

- file descriptor set (binary)
- single file descriptor proto (binary, with `--single`)
- python (`*_pb2.py`)

## usage

```shell
npx unbake-proto -i baked.pb # output to stdout
npx unbake-proto -i baked.pb -o out_folder # write descriptor set to file(s)
npx unbake-proto -i baked-single.pb --single -o out.proto # write a single FileDescriptorProto
npx unbake-proto --from-base64 "<base64>" # read descriptor bytes from base64
```

Arguments without an option name are not accepted.

### options

| Option                   | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| `-i <input>`             | Read input from a file                                     |
| `--from-base64 <base64>` | Read descriptor bytes from base64                          |
| `-o <output>`            | Write output to a file for single input, or directory sets |
| `--single`               | Use a single FileDescriptorProto as input                  |
| `--python`               | Use a Python file as input                                 |

## try

prepare your `.proto` file and then run the following commands

```shell
protoc --descriptor_set_out=baked.pb --include_imports original.proto
npx unbake-proto -i baked.pb > unbaked.proto
```

there should be no difference between `original.proto` and `unbaked.proto` !

`FileDescriptorSet` is a container for one or more `FileDescriptorProto` messages. Use the default mode for descriptor sets, especially when the input includes imports. Use `--single` only when the input file is the binary data for one `FileDescriptorProto`. Generated Python files embed one `FileDescriptorProto`, and `--python` processes it as a one-file descriptor set. `--single` cannot be used with `--python`. `--from-base64` cannot be used with `-i` or `--python`.

When `-o` is specified, descriptor sets are written to an output directory using the descriptor package and file names. `--single` and `--python` write one `.proto` file directly to the given output path.

## development

requires `pnpm`
