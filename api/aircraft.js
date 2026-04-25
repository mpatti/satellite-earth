const OPENSKY_URL = "https://opensky-network.org/api/states/all";
const ADSB_POINT_URL = "https://api.adsb.lol/v2/point/{lat}/{lon}/250";

const ADSB_SAMPLE_CENTERS = [
    [40.64, -73.78], [33.94, -118.40], [41.98, -87.90], [32.90, -97.04],
    [25.79, -80.29], [47.45, -122.31], [51.47, -0.45], [49.00, 2.55],
    [52.31, 4.76], [50.04, 8.56], [41.80, 12.25], [25.25, 55.36],
    [1.36, 103.99], [35.55, 139.78], [22.31, 113.92], [-33.95, 151.18]
];

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
        const data = await fetchOpenSky().catch(() => fetchAdsbLolSample());
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=30");
        response.status(200).json(data);
    } catch (error) {
        response.setHeader("Cache-Control", "no-store");
        response.status(502).json({
            error: "Unable to fetch live aircraft states.",
            detail: error instanceof Error ? error.message : String(error)
        });
    }
}

async function fetchOpenSky() {
    const feed = await fetch(OPENSKY_URL, {
        headers: { "User-Agent": "satellite-earth/1.0" }
    });
    if (!feed.ok) throw new Error("OpenSky returned HTTP " + feed.status);

    const data = await feed.json();
    const states = Array.isArray(data.states) ? data.states : [];
    const aircraft = states
        .filter(state => Number.isFinite(state[5]) && Number.isFinite(state[6]))
        .map(state => ({
            icao24: state[0],
            callsign: typeof state[1] === "string" ? state[1].trim() : "",
            country: state[2] || "Unknown",
            lastContact: state[4] || state[3] || null,
            lon: state[5],
            lat: state[6],
            baroAltitude: state[7],
            onGround: Boolean(state[8]),
            velocity: state[9],
            heading: state[10],
            verticalRate: state[11],
            geoAltitude: state[13]
        }));

    return {
        source: "OpenSky Network public states",
        coverage: "global",
        time: data.time || Math.floor(Date.now() / 1000),
        count: aircraft.length,
        aircraft
    };
}

async function fetchAdsbLolSample() {
    const now = Math.floor(Date.now() / 1000);
    const seen = new Map();
    const requests = ADSB_SAMPLE_CENTERS.map(([lat, lon]) => {
        const url = ADSB_POINT_URL.replace("{lat}", String(lat)).replace("{lon}", String(lon));
        return fetch(url, { headers: { "User-Agent": "satellite-earth/1.0" } })
            .then(response => response.ok ? response.json() : null)
            .catch(() => null);
    });

    const results = await Promise.all(requests);
    for (const result of results) {
        const aircraft = result && Array.isArray(result.ac) ? result.ac : [];
        for (const item of aircraft) {
            if (!item.hex || !Number.isFinite(item.lat) || !Number.isFinite(item.lon)) continue;
            if (seen.has(item.hex)) continue;
            seen.set(item.hex, mapAdsbAircraft(item, now));
        }
    }

    if (!seen.size) throw new Error("ADSB.lol regional sample returned no aircraft.");

    return {
        source: "ADSB.lol regional live traffic sample",
        coverage: "regional sample",
        time: now,
        count: seen.size,
        aircraft: Array.from(seen.values())
    };
}

function mapAdsbAircraft(item, now) {
    const altitudeFeet = Number.isFinite(item.alt_geom) ? item.alt_geom : Number.isFinite(item.alt_baro) ? item.alt_baro : NaN;
    const seenSeconds = Number.isFinite(item.seen) ? item.seen : Number.isFinite(item.seen_pos) ? item.seen_pos : NaN;
    return {
        icao24: item.hex,
        callsign: typeof item.flight === "string" ? item.flight.trim() : "",
        country: item.r || item.t || "Unknown",
        lastContact: Number.isFinite(seenSeconds) ? Math.round(now - seenSeconds) : now,
        lon: item.lon,
        lat: item.lat,
        baroAltitude: Number.isFinite(altitudeFeet) ? altitudeFeet * 0.3048 : NaN,
        onGround: item.alt_baro === "ground",
        velocity: Number.isFinite(item.gs) ? item.gs * 0.514444 : NaN,
        heading: Number.isFinite(item.track) ? item.track : item.true_heading,
        verticalRate: Number.isFinite(item.baro_rate) ? item.baro_rate * 0.00508 : NaN,
        geoAltitude: Number.isFinite(item.alt_geom) ? item.alt_geom * 0.3048 : NaN
    };
}
