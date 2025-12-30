function encodeVarint(value: number): Buffer {
  const bytes: number[] = [];
  let v = value >>> 0;

  do {
    let b = v & 0x7f;

    v >>>= 7;

    if (v !== 0) {
      b |= 0x80;
    }

    bytes.push(b);
  } while (v !== 0);

  return Buffer.from(bytes);
}

function generateHeader(payload: Uint8Array): Buffer {
  const length = payload.length;
  const tag = (1 << 3) | 2;
  const varint = encodeVarint(length);

  return Buffer.concat([Buffer.from([tag]), varint]);
}

function parsePythonBinaryString(str: string): Uint8Array {
  const bytes: number[] = [];
  let i = 0;

  while (i < str.length) {
    if (str[i] === "\\" && str[i + 1] === "x") {
      const hex = str.slice(i + 2, i + 4);

      bytes.push(parseInt(hex, 16));
      i += 4;
    } else if (str[i] === "\\" && str[i + 1] === "n") {
      bytes.push(0x0a); // newline
      i += 2;
    } else if (str[i] === "\\" && str[i + 1] === "r") {
      bytes.push(0x0d); // carriage return
      i += 2;
    } else if (str[i] === "\\" && str[i + 1] === "t") {
      bytes.push(0x09); // tab
      i += 2;
    } else if (str[i] === "\\" && str[i + 1] === "\\") {
      bytes.push(0x5c); // backslash
      i += 2;
    } else if (str[i] === "\\" && str[i + 1] === "'") {
      bytes.push(0x27); // single quote
      i += 2;
    } else if (str[i] === "\\" && str[i + 1] === '"') {
      bytes.push(0x22); // double quote
      i += 2;
    } else {
      bytes.push(str.charCodeAt(i));
      i += 1;
    }
  }

  return new Uint8Array(bytes);
}

export function python(code: string): Uint8Array {
  const bstring = RegExp("b'(.+)'").exec(code);

  if (!bstring || !bstring[1]) {
    throw new Error("Invalid python source");
  }

  const binary = parsePythonBinaryString(bstring[1]);
  const header = generateHeader(binary);

  return Buffer.concat([header, binary]);
}
