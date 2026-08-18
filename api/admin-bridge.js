export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Append the master secret to the payload so UNA accepts it securely
        const bridgePayload = {
            ...req.body,
            secret: "K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC"
        };

        const response = await fetch('https://studio.selloutcrowds.com/bridge-connector.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bridgePayload)
        });

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error("Admin Bridge Error:", error);
        return res.status(500).json({ error: 'Failed to communicate with the UNA server' });
    }
}