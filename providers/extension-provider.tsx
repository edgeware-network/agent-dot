"use client";

import {
  connectInjectedExtension,
  InjectedExtension,
  InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toast } from "sonner";

interface ExtensionContext {
  isInitializing: boolean;
  selectedAccount:
    | (InjectedPolkadotAccount & {
        extension: InjectedExtension;
      })
    | null;
  setSelectedAccount: (
    account: InjectedPolkadotAccount,
    extension: InjectedExtension,
  ) => void;
  onToggleExtension: (name: string) => Promise<void>;
  availableExtensions: string[];
  selectedExtensions: InjectedExtension[];
  isWalletOpen: boolean;
  setIsWalletOpen: (open: boolean) => void;
}

interface ExtensionAccount {
  extension: InjectedExtension;
  accounts: InjectedPolkadotAccount[];
}

interface StoredAccount {
  extensionName: string;
  address: string;
}

const EXTENSIONS_STORAGE_KEY = "agent-dot:connected-extensions";
const SELECTED_ACCOUNT_KEY = "agent-dot:selected-extension-account";

const getExtensionsStore = () => {
  let connectedExtensions = new Map<string, ExtensionAccount>();
  const listeners = new Set<() => void>();
  let isRunning = false;

  const serverSnapshot = new Map<string, ExtensionAccount>();

  const getSnapshot = () => connectedExtensions;
  const update = () => {
    connectedExtensions = new Map(connectedExtensions);
    localStorage.setItem(
      EXTENSIONS_STORAGE_KEY,
      JSON.stringify([...connectedExtensions.keys()]),
    );
    listeners.forEach((cb) => {
      cb();
    });
  };

  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };

  const onToggleExtension = async (name: string) => {
    if (isRunning) return;
    isRunning = true;
    try {
      if (connectedExtensions.has(name)) {
        connectedExtensions.delete(name);
      } else {
        const extension = await connectInjectedExtension(name);
        const accounts = extension.getAccounts();
        connectedExtensions.set(name, { extension, accounts });
      }
      update();
    } catch (error) {
      const err = error as Error;
      toast.error(
        err.message === "Connection request was cancelled by the user."
          ? err.message
          : `Failed to connect ${name}: ${err.message}`,
      );
    } finally {
      isRunning = false;
    }
  };

  const connectSavedExtensions = async () => {
    const saved = localStorage.getItem(EXTENSIONS_STORAGE_KEY);
    if (!saved) return;

    const extensionNames = JSON.parse(saved) as string[];

    await Promise.all(
      extensionNames.map(async (name) => {
        if (connectedExtensions.has(name)) return;
        try {
          const extension = await connectInjectedExtension(name);
          const accounts = extension.getAccounts();
          connectedExtensions.set(name, { extension, accounts });
        } catch (error) {
          const err = error as Error;
          toast.warning(`Failed to connect ${name}: ${err.message}`);
        }
      }),
    );

    update();
  };

  return {
    subscribe,
    getSnapshot,
    getServerSnapshot: () => serverSnapshot,
    onToggleExtension,
    connectSavedExtensions,
  };
};

const extensionsStore = getExtensionsStore();

const getJoinedInjectedExtensions = async (): Promise<string> => {
  const { getInjectedExtensions } = await import("polkadot-api/pjs-signer");
  return getInjectedExtensions().join(",");
};

export const ExtenstionContext = createContext<ExtensionContext>({
  isInitializing: true,
  isWalletOpen: false,
  setIsWalletOpen: () => {
    // noop
  },
  selectedAccount: null,
  setSelectedAccount: () => {
    // noop
  },
  onToggleExtension: () => Promise.resolve(),
  availableExtensions: [],
  selectedExtensions: [],
});

export function ExtensionProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [availableExtensions, setAvailableExtensions] = useState<string[]>([]);
  const [selectedAccount, _setSelectedAccount] = useState<
    (InjectedPolkadotAccount & { extension: InjectedExtension }) | null
  >(null);
  const [isWalletOpen, setIsWalletOpen] = useState<boolean>(false);

  const setSelectedAccount = useCallback(
    (account: InjectedPolkadotAccount, extension: InjectedExtension) => {
      _setSelectedAccount({ ...account, extension });
      const storedAccount: StoredAccount = {
        extensionName: extension.name,
        address: account.address,
      };
      localStorage.setItem(SELECTED_ACCOUNT_KEY, JSON.stringify(storedAccount));
    },
    [],
  );

  const selectedExtensions = useSyncExternalStore(
    extensionsStore.subscribe,
    extensionsStore.getSnapshot,
    extensionsStore.getServerSnapshot,
  );

  const restoreSelectedAccount = useCallback(() => {
    const storedAccountJson = localStorage.getItem(SELECTED_ACCOUNT_KEY);
    if (!storedAccountJson) return;

    try {
      const storedAccount = JSON.parse(storedAccountJson) as StoredAccount;
      const extensionData = [...selectedExtensions.values()].find(
        (ext) => ext.extension.name === storedAccount.extensionName,
      );

      if (!extensionData) return;

      const account = extensionData.accounts.find(
        (acc) => acc.address === storedAccount.address,
      );

      if (account) {
        _setSelectedAccount({
          ...account,
          extension: extensionData.extension,
        });
      }
    } catch (error) {
      const err = error as Error;
      toast.warning(`Failed to restore selected account: ${err.message}`);
      localStorage.removeItem(SELECTED_ACCOUNT_KEY);
    }
  }, [selectedExtensions]);

  useEffect(() => {
    let isMounted = true;

    const initializeExtensions = async () => {
      try {
        const joinedExtensions = await getJoinedInjectedExtensions();
        if (!isMounted) return;

        const list = joinedExtensions
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
        setAvailableExtensions(list);

        await extensionsStore.connectSavedExtensions();
      } catch (error) {
        const err = error as Error;
        toast.error(`Failed to initialize extensions: ${err.message}`);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    void initializeExtensions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedExtensions.size > 0) {
      restoreSelectedAccount();
    }
  }, [selectedExtensions, restoreSelectedAccount]);

  return (
    <ExtenstionContext.Provider
      value={{
        isWalletOpen,
        setIsWalletOpen,
        isInitializing,
        selectedAccount,
        setSelectedAccount,
        onToggleExtension: extensionsStore.onToggleExtension,
        availableExtensions,
        selectedExtensions: [...selectedExtensions.values()].map(
          (ext) => ext.extension,
        ),
      }}
    >
      {children}
    </ExtenstionContext.Provider>
  );
}
