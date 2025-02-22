import { Hono } from "@hono/hono";

const faucet = new Hono();

faucet.get("/portal", (c) => {
  return c.html(`
        <html>
            <body>
                <h1>Kollectyve Network Faucet</h1>
                <form id="faucetForm">
                    <label for="address">Enter your address:</label>
                    <input type="text" id="address" name="address" required>
                    <button type="submit">Get Tokens</button>
                </form>
                <script>
                    document.getElementById('faucetForm').addEventListener('submit', async (event) => {
                        event.preventDefault();
                        const address = document.getElementById('address').value;
                        const response = await fetch('https://test-kumulus-backend.deno.dev/faucet/give', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ address })
                        });
                        const result = await response.json();
                        console.log(result.message);
                    });
                </script>
            </body>
        </html>
    `);
});

faucet.post("/give", (c) => {
  //TODO: Handle token sending
  return c.json({ status: "success", message: "Token Sent!!!" });
});

export { faucet };
