const FEED_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";

export default async function handler(request, response) {
    if (request.method === "OPTIONS") {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
        response.status(204).end();
        return;
    }

    if (request.method !== "GET") {
        response.setHeader("Allow", "GET, OPTIONS");
        response.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const feed = await fetch(FEED_URL, {
            headers: {
                "User-Agent": "satellite-earth/1.0"
            }
        });

        if (!feed.ok) {
            throw new Error("CelesTrak returned HTTP " + feed.status);
        }

        const text = await feed.text();
        if (!/\n1\s+\d{5}/.test("\n" + text) || !/\n2\s+\d{5}/.test("\n" + text)) {
            throw new Error("CelesTrak response did not contain TLE records.");
        }

        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.status(200).send(text);
    } catch (error) {
        response.setHeader("Cache-Control", "no-store");
        response.status(502).json({
            error: "Unable to fetch active satellite TLE feed.",
            detail: error instanceof Error ? error.message : String(error)
        });
    }
}
