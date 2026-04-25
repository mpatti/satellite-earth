const LAYER = "BlueMarble_ShadedRelief";

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
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
        response.status(200).json({
            source: "NASA GIBS Blue Marble shaded relief",
            layer: LAYER,
            date: "static",
            matrixSet: "500m",
            matrix: 3,
            rows: 5,
            cols: 10,
            tileSize: 512,
            template: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/" + LAYER + "/default/default/500m/3/{row}/{col}.jpeg"
        });
    } catch (error) {
        response.setHeader("Cache-Control", "no-store");
        response.status(502).json({
            error: "Unable to load Blue Marble Earth metadata.",
            detail: error instanceof Error ? error.message : String(error)
        });
    }
}
