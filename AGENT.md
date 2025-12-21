# Agent rule

break tasks into small goals for more efficient development  

## post-edit

check the output is expected

```shell
bun run test
```

if not, go back to edit until it is expected
else, commit

## pre-commit

```shell
bun run precommit
```

fix every error and warning  
resolved everything. then, commit

```shell
git add .
git commit -m "message"
```

## structure

```shell
src/
├── index.ts
├── protobuf.ts # protobuf instance
├── header.ts # header data
├── option.ts # option
├── message.ts # messageType
├── enum.ts # enumType
├── format.ts # format processed data into .proto
└── can add more files as needed
```

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
