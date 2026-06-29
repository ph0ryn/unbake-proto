# Agent rule

break tasks into small goals for more efficient development

## post-edit

check the output is expected

```shell
pnpm run test:proto2
pnpm run test:proto3
```

if not, go back to edit until it is expected
else, commit

## workflow

index.ts -> Protobuf -> format -> stdout

1. Create Protobuf instance with input file path
2. Protobuf parses baked protobuf descriptor
3. Format Protobuf data into valid `.proto` syntax
4. Output to stdout

### development flow

1. Edit source files in `src/`
2. Run `bun run test` to verify output
3. If incorrect, iterate on edits
4. Run `bun run precommit` before commit
5. Fix all errors and warnings
6. Commit changes
