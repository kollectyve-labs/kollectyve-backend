import {
    decodeAddress,
    signatureVerify,
    u8aToHex,
} from "https://deno.land/x/polkadot@0.2.45/util-crypto/mod.ts";
import { Hono } from "jsr:@hono/hono";

export const api = new Hono();

const verifySignature = async (
    message: string,
    signature: string,
    address: string,
): Promise<boolean> => {
    await cryptoWaitReady();
    const publicKey = decodeAddress(address);
    const hexPublicKey = u8aToHex(publicKey);

    const result = await signatureVerify(message, signature, hexPublicKey);

    return result.isValid;
};

// Providers Healthcheck submission endpoint
api.post("/", async (c) => {
    const { message, signature, address } = await c.req.json();

    try {
        const isValid = await verifySignature(message, signature, address);

        if (isValid) {
            console.log("Signature is valid. Performing actions...");

            //TODO: Store in the conductor database

            return c.status(200).body({
                status: "success",
                message: "Signature verified successfully",
            });
        } else {
            return c.status(401).body({
                status: "error",
                message: "Invalid signature",
            });
        }
    } catch (error) {
        console.error("Error verifying signature:", error);
        return c.status(500).body({
            status: "error",
            message: "An error occurred while verifying the signature",
        });
    }
});
