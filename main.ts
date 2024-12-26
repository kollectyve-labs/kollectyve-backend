import {
  signatureVerify, cryptoWaitReady
} from "https://deno.land/x/polkadot@0.2.45/util-crypto/mod.ts";


export async function verifyMessage(message: string, signature: Uint8Array, address: string): Promise<boolean> {
  await cryptoWaitReady();
  const result = signatureVerify(message, signature, address);
  return result.isValid;
}

