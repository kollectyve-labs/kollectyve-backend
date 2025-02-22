// deno-lint-ignore-file verbatim-module-syntax
import { Hono } from "@hono/hono";


const kumulusdevs = new Hono();

kumulusdevs.post("/create-vm", (c) => {
  // TODO: Call Create VM
  // Pass specs of the VM the Dev want to create
  // Place the order
  return c.json({ message: "" }, 200);
});

kumulusdevs.post("/create-vm", (c) => {
  // TODO: Call Create VM
  // Pass specs of the VM the Dev want to create
  // Place the order
  return c.json({ message: "Created VM Command sent successfully" }, 200);
});

kumulusdevs.post("/stop-vm", (c) => {
  // TODO: Call Stop VM
  // Pass the VM ID the Dev want to stop
  return c.json({ message: "Stop VM Command VM successfully" }, 200);
});

kumulusdevs.post("/delete-vm", (c) => {
  // TODO: Call Stop VM
  // Pass the VM ID the Dev want to delete
  return c.json({ message: "Delte VM Command VM successfully" }, 200);
});

kumulusdevs.post("/create-decor-instance", (c) => {
  // TODO: Call Create VM
  // Pass the details of the decor Product
  // Place the order
  return c.json({ message: "" }, 200);
});

kumulusdevs.post("/stop-decor-instance", (c) => {
  // TODO: Stop the Decor Container Container 
  return c.json({ message: "" }, 200);
});

export { kumulusdevs };
