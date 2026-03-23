import { getCloudflareContext } from "@opennextjs/cloudflare";

const DEFAULT_MPP_CURRENCY = "0x20c0000000000000000000000000000000000000";
const DEFAULT_MPP_AMOUNT = "0.01";

type MppMode = "pull" | "push";
type HexAddress = `0x${string}`;

type MppConfig =
  | {
      enabled: false;
      amount: string;
      currency: string;
      mode?: MppMode;
      waitForConfirmation?: boolean;
    }
  | {
      enabled: true;
      amount: string;
      currency: string;
      recipient: HexAddress;
      secretKey: string;
      mode?: MppMode;
      waitForConfirmation?: boolean;
    };

type PaymentGateResult = {
  challenge?: Response;
  withReceipt?: (response: Response) => Response;
};

let mppInstancePromise: Promise<unknown> | null = null;

function readRuntimeEnv(name: keyof CloudflareEnv) {
  try {
    const value = getCloudflareContext().env[name];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  } catch {
    // Ignore local/non-Cloudflare runtimes and fall back to process.env.
  }

  return process.env[name];
}

function readBoolean(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function readMode(value: string | undefined): MppMode | undefined {
  if (value === "pull" || value === "push") {
    return value;
  }

  return undefined;
}

function parseRecipientAddress(value: string): HexAddress {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error("MPP_RECIPIENT must be a valid 0x-prefixed 20-byte hex address.");
  }

  return value as HexAddress;
}

function getMppConfig(): MppConfig {
  const recipientRaw = readRuntimeEnv("MPP_RECIPIENT")?.trim() ?? "";
  const secretKey = readRuntimeEnv("MPP_SECRET_KEY")?.trim() ?? "";
  const explicitlyEnabled = readBoolean(readRuntimeEnv("MPP_ENABLED"));
  const inferredEnabled = recipientRaw.length > 0 && secretKey.length > 0;
  const enabled = explicitlyEnabled ?? inferredEnabled;

  if (!enabled) {
    return {
      enabled: false,
      amount: DEFAULT_MPP_AMOUNT,
      currency: DEFAULT_MPP_CURRENCY,
      mode: readMode(readRuntimeEnv("MPP_MODE")),
      waitForConfirmation: readBoolean(readRuntimeEnv("MPP_WAIT_FOR_CONFIRMATION")),
    };
  }

  if (!recipientRaw) {
    throw new Error("MPP is enabled, but MPP_RECIPIENT is missing.");
  }

  if (!secretKey) {
    throw new Error("MPP is enabled, but MPP_SECRET_KEY is missing.");
  }

  return {
    enabled: true,
    amount: readRuntimeEnv("MPP_AMOUNT")?.trim() || DEFAULT_MPP_AMOUNT,
    currency: readRuntimeEnv("MPP_CURRENCY")?.trim() || DEFAULT_MPP_CURRENCY,
    recipient: parseRecipientAddress(recipientRaw),
    secretKey,
    mode: readMode(readRuntimeEnv("MPP_MODE")),
    waitForConfirmation: readBoolean(readRuntimeEnv("MPP_WAIT_FOR_CONFIRMATION")),
  };
}

async function getMppInstance() {
  const config = getMppConfig();
  if (!config.enabled) {
    return null;
  }

  if (!mppInstancePromise) {
    mppInstancePromise = import("mppx/server").then(({ Mppx, tempo }) =>
      Mppx.create({
        secretKey: config.secretKey,
        methods: [
          tempo({
            currency: config.currency,
            recipient: config.recipient,
            ...(config.mode ? { mode: config.mode } : {}),
            ...(typeof config.waitForConfirmation === "boolean"
              ? { waitForConfirmation: config.waitForConfirmation }
              : {}),
          }),
        ],
      }),
    );
  }

  return mppInstancePromise;
}

export async function chargeShareCreation(request: Request): Promise<PaymentGateResult | null> {
  const config = getMppConfig();
  if (!config.enabled) {
    return null;
  }

  const mppx = (await getMppInstance()) as {
    charge: (options: { amount: string }) => (
      request: Request,
    ) => Promise<
      | {
          status: 402;
          challenge: Response;
        }
      | {
          status: number;
          withReceipt: (response: Response) => Response;
        }
    >;
  };

  const payment = await mppx.charge({ amount: config.amount })(request);

  if ("challenge" in payment) {
    return { challenge: payment.challenge };
  }

  return { withReceipt: payment.withReceipt };
}

export function isMppEnabled() {
  return getMppConfig().enabled;
}
