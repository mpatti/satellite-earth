const CAPABILITIES_URL = "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities";
const LAYER = "MODIS_Aqua_Cloud_Fraction_Day";

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
        const feed = await fetch(CAPABILITIES_URL);
        if (!feed.ok) throw new Error("NASA GIBS returned HTTP " + feed.status);

        const xml = await feed.text();
        const layerIndex = xml.indexOf("<ows:Identifier>" + LAYER + "</ows:Identifier>");
        if (layerIndex < 0) throw new Error("Cloud fraction layer was not listed by GIBS.");

        const layerStart = xml.lastIndexOf("<Layer>", layerIndex);
        const layerEnd = xml.indexOf("</Layer>", layerIndex);
        const layerXml = xml.slice(layerStart, layerEnd);
        const date = (layerXml.match(/<Default>(.*?)<\/Default>/) || [])[1];
        if (!date) throw new Error("Cloud fraction layer did not include a default date.");

        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
        response.status(200).json({
            source: "NASA GIBS MODIS Aqua cloud fraction",
            layer: LAYER,
            date,
            matrixSet: "2km",
            matrix: 3,
            rows: 5,
            cols: 10,
            tileSize: 512,
            template: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/" + LAYER + "/default/" + date + "/2km/3/{row}/{col}.png"
        });
    } catch (error) {
        response.setHeader("Cache-Control", "no-store");
        response.status(502).json({
            error: "Unable to load live cloud layer metadata.",
            detail: error instanceof Error ? error.message : String(error)
        });
    }
}
