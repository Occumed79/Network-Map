type RuntimeOwner = {
  id: string;
  responsibility: string;
  installedAt: string;
};

type DomMutationSubscriber = {
  id: string;
  callback: (mutations: MutationRecord[]) => void;
};

type RuntimeRegistrySnapshot = {
  owners: RuntimeOwner[];
  duplicateAttempts: string[];
  domSubscriberIds: string[];
};

type RuntimeRegistry = {
  owners: Map<string, RuntimeOwner>;
  duplicateAttempts: Set<string>;
  domSubscribers: Map<string, DomMutationSubscriber>;
  domObserver: MutationObserver | null;
  domObserverStarted: boolean;
};

declare global {
  interface Window {
    __NETWORK_MAP_RUNTIME_OWNERSHIP__?: {
      snapshot: () => RuntimeRegistrySnapshot;
      hasOwner: (id: string) => boolean;
      assertUnique: () => void;
    };
    __NETWORK_MAP_RUNTIME_REGISTRY__?: RuntimeRegistry;
  }
}

function registry(): RuntimeRegistry {
  if (!window.__NETWORK_MAP_RUNTIME_REGISTRY__) {
    window.__NETWORK_MAP_RUNTIME_REGISTRY__ = {
      owners: new Map(),
      duplicateAttempts: new Set(),
      domSubscribers: new Map(),
      domObserver: null,
      domObserverStarted: false,
    };
  }
  return window.__NETWORK_MAP_RUNTIME_REGISTRY__;
}

function exposeDebugApi(): void {
  if (window.__NETWORK_MAP_RUNTIME_OWNERSHIP__) return;
  window.__NETWORK_MAP_RUNTIME_OWNERSHIP__ = {
    snapshot: () => {
      const state = registry();
      return {
        owners: Array.from(state.owners.values()),
        duplicateAttempts: Array.from(state.duplicateAttempts.values()),
        domSubscriberIds: Array.from(state.domSubscribers.keys()),
      };
    },
    hasOwner: (id: string) => registry().owners.has(id),
    assertUnique: () => {
      const duplicates = Array.from(registry().duplicateAttempts.values());
      if (duplicates.length) {
        throw new Error(`Duplicate Network Map runtime controller registration: ${duplicates.join(", ")}`);
      }
    },
  };
}

/**
 * Registers one authoritative global runtime owner. Duplicate registrations are
 * rejected so hot reloads, optional-runtime races, and duplicate imports cannot
 * install two controllers for the same responsibility.
 */
export function registerRuntimeOwner(id: string, responsibility: string): boolean {
  exposeDebugApi();
  const state = registry();
  if (state.owners.has(id)) {
    state.duplicateAttempts.add(id);
    console.error(`Duplicate Network Map runtime owner blocked: ${id}`);
    return false;
  }
  state.owners.set(id, {
    id,
    responsibility,
    installedAt: new Date().toISOString(),
  });
  return true;
}

function ensureSharedDomObserver(): void {
  const state = registry();
  if (state.domObserverStarted || !document.body) return;
  state.domObserverStarted = true;
  state.domObserver = new MutationObserver((mutations) => {
    const subscribers = Array.from(state.domSubscribers.values());
    for (const subscriber of subscribers) {
      try {
        subscriber.callback(mutations);
      } catch (error) {
        console.error(`Network Map DOM subscriber failed: ${subscriber.id}`, error);
      }
    }
  });
  state.domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "class",
      "hidden",
      "aria-hidden",
      "aria-selected",
      "aria-pressed",
      "disabled",
      "data-active",
      "data-provider-tool",
    ],
  });
}

/**
 * Subscribes a controller to the single shared application DOM observer. This
 * is reserved for legacy/third-party DOM integration that cannot yet be owned
 * directly by React state.
 */
export function subscribeToSharedDomObserver(
  id: string,
  callback: (mutations: MutationRecord[]) => void,
): () => void {
  exposeDebugApi();
  const state = registry();
  if (state.domSubscribers.has(id)) {
    state.duplicateAttempts.add(`dom:${id}`);
    console.error(`Duplicate Network Map DOM observer subscriber blocked: ${id}`);
    return () => undefined;
  }
  state.domSubscribers.set(id, { id, callback });

  const start = () => ensureSharedDomObserver();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  return () => {
    state.domSubscribers.delete(id);
    if (!state.domSubscribers.size && state.domObserver) {
      state.domObserver.disconnect();
      state.domObserver = null;
      state.domObserverStarted = false;
    }
  };
}

exposeDebugApi();
