// deno-lint-ignore-file verbatim-module-syntax
import { Hono } from "@hono/hono";

const kumulusdevs = new Hono();

kumulusdevs.post("/create-vm", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

kumulusdevs.post("/create-vm", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

kumulusdevs.post("/stop-vm", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

kumulusdevs.post("/delete-vm", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

kumulusdevs.post("/create-decor-instance", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

kumulusdevs.post("/stop-decor-instance", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

export { kumulusdevs };
