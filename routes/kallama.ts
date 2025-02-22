// deno-lint-ignore-file verbatim-module-syntax
import { Hono } from "@hono/hono";

const kallama = new Hono();

// Get a Kallama projects list
kallama.get("/projects", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

// Create a Kallama project
kallama.post("/project", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

// Update a Kallama project
kallama.put("/project", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

// Delete a Kallama project
kallama.delete("/project", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

export { kallama };
