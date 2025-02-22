// deno-lint-ignore-file verbatim-module-syntax
import { Hono } from "@hono/hono";

const kleapai = new Hono();

// Get a kleapai projects list
kleapai.get("/projects", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

// Create a kleapai project
kleapai.post("/project", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

// Update a kleapai project
kleapai.put("/project", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

// Delete a kleapai project
kleapai.delete("/project", async (c) => {
  try {
    const { prop } = await c.req.json();
    //TODO
    return c.json("Response ok", 200);
  } catch (err) {
    console.error("Error ...:", err);
    return c.json({ message: "Failed to" }, 500);
  }
});

export { kleapai };
