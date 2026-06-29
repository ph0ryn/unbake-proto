# unbake-proto

Decompile protoc-compiled protobuf descriptor into human-readable `.proto` which is semantically equivalent to the original.

## support

- file descriptor (binary)
- python (`*_pb2.py`)

## usage

```shell
npx unbake-proto <input> # output to stdout
npx unbake-proto <input> [out_folder] # output to file(s)
```

### options

| Option     | Description                |
| ---------- | -------------------------- |
| `--python` | Use a Python file as input |

## try

prepare your `.proto` file and then run the following commands

```shell
protoc --descriptor_set_out=baked.pb --include_imports original.proto
npx unbake-proto baked.pb > unbaked.proto
```

there should be no difference between `original.proto` and `unbaked.proto` !

## development

requires `pnpm`
