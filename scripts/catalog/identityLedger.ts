import type { ClockCatalog } from "../../src/catalog/catalog";

export interface CatalogIdentity {
  readonly id: string;
  readonly ianaIds: readonly string[];
  readonly retired: boolean;
}

export interface CatalogIdentityLedger {
  readonly schemaVersion: 1;
  readonly catalogVersion: number;
  readonly catalogSha256: string;
  readonly identities: readonly CatalogIdentity[];
}

const fail = (detail: string): never => {
  throw new Error(`Invalid catalog identity ledger: ${detail}`);
};

export function reconcileCatalogIdentityLedger(
  catalog: ClockCatalog,
  catalogSha256: string,
  ledger: CatalogIdentityLedger,
  identityTransitions: Readonly<Record<string, string>>,
): CatalogIdentityLedger {
  if (
    ledger.schemaVersion !== 1 ||
    !/^[a-f0-9]{64}$/u.test(ledger.catalogSha256) ||
    !/^[a-f0-9]{64}$/u.test(catalogSha256)
  ) {
    return fail("ledger is malformed");
  }
  const identitiesById = new Map(ledger.identities.map((identity) => [identity.id, identity]));
  if (identitiesById.size !== ledger.identities.length) {
    return fail("ledger contains duplicate catalog IDs");
  }

  if (catalog.catalogVersion === ledger.catalogVersion) {
    if (catalogSha256 !== ledger.catalogSha256) {
      return fail("catalog content changed without a catalogVersion increment");
    }
    for (const entry of catalog.entries) {
      const identity = identitiesById.get(entry.id);
      if (!identity || identity.retired || !identity.ianaIds.includes(entry.ianaId)) {
        return fail(`catalog identity does not match ledger: ${entry.id}`);
      }
    }
    const activeCount = ledger.identities.filter(({ retired }) => !retired).length;
    if (activeCount !== catalog.entries.length) {
      return fail("ledger has unmatched active IDs");
    }
    return ledger;
  }

  if (catalog.catalogVersion !== ledger.catalogVersion + 1) {
    return fail("catalogVersion must advance exactly once per reviewed update");
  }

  const currentIds = new Set(catalog.entries.map(({ id }) => id));
  const usedTransitions = new Set<string>();
  const identities: CatalogIdentity[] = ledger.identities.map((identity) =>
    currentIds.has(identity.id) ? identity : { ...identity, retired: true },
  );
  const nextById = new Map(identities.map((identity) => [identity.id, identity]));

  for (const entry of catalog.entries) {
    const previous = nextById.get(entry.id);
    if (!previous) {
      const priorRegionIdentity = ledger.identities.find(({ ianaIds }) =>
        ianaIds.includes(entry.ianaId),
      );
      if (priorRegionIdentity) {
        return fail(
          `IANA region ${entry.ianaId} already belongs to ${priorRegionIdentity.id}`,
        );
      }
      const added = { id: entry.id, ianaIds: [entry.ianaId], retired: false };
      identities.push(added);
      nextById.set(entry.id, added);
      continue;
    }
    if (previous.retired) return fail(`retired catalog ID cannot be reused: ${entry.id}`);
    if (previous.ianaIds.includes(entry.ianaId)) continue;
    if (identityTransitions[entry.id] !== entry.ianaId) {
      return fail(`IANA link change requires an explicit transition: ${entry.id}`);
    }
    usedTransitions.add(entry.id);
    const transitioned = {
      ...previous,
      ianaIds: [...previous.ianaIds, entry.ianaId],
    };
    const position = identities.findIndex(({ id }) => id === entry.id);
    identities[position] = transitioned;
    nextById.set(entry.id, transitioned);
  }

  for (const transitionId of Object.keys(identityTransitions)) {
    if (!usedTransitions.has(transitionId)) {
      return fail(`unused catalog identity transition: ${transitionId}`);
    }
  }

  identities.sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
  return {
    schemaVersion: 1,
    catalogVersion: catalog.catalogVersion,
    catalogSha256,
    identities,
  };
}

export const serializeCatalogIdentityLedger = (
  ledger: CatalogIdentityLedger,
): string => `${JSON.stringify(ledger, null, 2)}\n`;
