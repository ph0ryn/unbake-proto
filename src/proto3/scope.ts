/**
 * Represents the current scope for type name resolution.
 * Used to determine the shortest valid type name.
 */
export interface TypeScope {
  package: string; // E.g., "playground.v2"
  messagePath: string[]; // E.g., ["Envelope", "Actor"] for nested messages
}

/**
 * Shortens a fully-qualified type name based on the current scope.
 *
 * Protobuf resolution rules:
 * 1. Same message scope: use short name (Kind)
 * 2. Parent message scope: use relative path (Actor.Kind)
 * 3. Same package top-level: use short name (Environment)
 * 4. Different package: use FQN (.other.package.Type)
 *
 * @param fqn Fully-qualified type name (e.g., ".playground.v2.Envelope.Actor.Kind")
 * @param scope Current scope information
 * @returns Shortest valid type name
 */
export function shortenTypeName(fqn: string, scope: TypeScope): string {
  // FQN starts with ".", remove it for processing
  let typePath = fqn;

  if (fqn.startsWith(".")) {
    typePath = fqn.slice(1);
  }

  const typeParts = typePath.split(".");

  // Build current scope path: package + messagePath
  const scopeParts: string[] = [];

  if (scope.package) {
    scopeParts.push(...scope.package.split("."));
  }

  scopeParts.push(...scope.messagePath);

  // Check from current scope upward to find where the type is visible
  // Start from deepest scope (current message) and work up to package level
  for (let depth = scopeParts.length; depth >= 0; depth--) {
    const testScopeParts = scopeParts.slice(0, depth);

    // Check if type starts with this scope prefix
    if (startsWithPrefix(typeParts, testScopeParts)) {
      // Type is within this scope, return the relative part
      const relativeParts = typeParts.slice(testScopeParts.length);

      if (relativeParts.length > 0) {
        return relativeParts.join(".");
      }
    }
  }

  // Type is in a different package, return FQN
  return fqn;
}

/**
 * Checks if array starts with the given prefix.
 */
function startsWithPrefix(arr: string[], prefix: string[]): boolean {
  if (prefix.length > arr.length) {
    return false;
  }

  for (let idx = 0; idx < prefix.length; idx++) {
    if (arr[idx] !== prefix[idx]) {
      return false;
    }
  }

  return true;
}
