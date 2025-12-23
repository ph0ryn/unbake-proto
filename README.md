# unbake-proto

Decompile baked protobuf descriptors into human-readable `.proto` which is semantically equivalent to the original.
`unbake-proto` can work for all cases baked by `FileDescriptorSetSchema`

## usage

```shell
bun i
bun run unbake <input> # output to stdout
bun run unbake <input> [out_folder] # output to file(s)
```

## try

prepare your `.proto` file and then run the following commands

```shell
protoc --descriptor_set_out=baked.pb --include_imports original.proto
bun run unbake baked.pb > unbaked.proto
```

there should be no difference between `original.proto` and `unbaked.proto` !

## requirements

- Bun for the runtime; others can be used instead
