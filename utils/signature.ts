import {
  cryptoWaitReady,
  decodeAddress,
  signatureVerify,
} from "https://deno.land/x/polkadot@0.2.45/util-crypto/mod.ts";
import {
  stringToU8a,
  u8aToHex,
} from "https://deno.land/x/polkadot@0.2.45/util/mod.ts";

const verifySignature = async (
  message: string,
  signature: string,
  address: string,
): Promise<boolean> => {
  await cryptoWaitReady();
  const publicKey = decodeAddress(address);
  const hexPublicKey = u8aToHex(publicKey);

  try {
    const result = await signatureVerify(
      stringToU8a(message),
      signature,
      hexPublicKey,
    );
    return result.isValid;
  } catch (error) {
    console.error("Verification error:", error);
    return false;
  }
};

export { verifySignature };
