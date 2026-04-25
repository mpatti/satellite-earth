const OPENSKY_URL = "https://opensky-network.org/api/states/all";
const ADSB_POINT_URL = "https://api.adsb.lol/v2/point/{lat}/{lon}/250";

const ADSB_SAMPLE_CENTERS = [
    [40.64, -73.78], [42.36, -71.01], [38.85, -77.04], [33.64, -84.43],
    [25.79, -80.29], [41.98, -87.90], [32.90, -97.04], [39.86, -104.67],
    [33.94, -118.40], [37.62, -122.38], [47.45, -122.31], [49.19, -123.18],
    [43.68, -79.63], [19.44, -99.07], [9.07, -79.38], [61.17, -150.00],
    [21.32, -157.92], [51.47, -0.45], [49.00, 2.55], [52.31, 4.76],
    [50.04, 8.56], [40.49, -3.57], [41.80, 12.25], [45.63, 8.72],
    [52.17, 20.97], [59.65, 17.92], [60.19, 11.10], [38.00, 23.95],
    [41.28, 28.75], [55.97, 37.41], [33.37, -7.59], [30.12, 31.41],
    [6.58, 3.32], [5.60, -0.17], [-1.32, 36.93], [8.98, 38.80],
    [-26.13, 28.24], [25.25, 55.36], [25.27, 51.61], [24.96, 46.70],
    [32.00, 34.89], [28.56, 77.10], [19.09, 72.87], [13.69, 100.75],
    [1.36, 103.99], [-6.13, 106.66], [14.51, 121.02], [22.31, 113.92],
    [25.08, 121.23], [37.46, 126.44], [35.55, 139.78], [34.79, 135.44],
    [31.14, 121.80], [40.08, 116.58], [23.39, 113.30], [-33.95, 151.18],
    [-37.67, 144.84], [-27.38, 153.12], [-36.99, 174.79], [4.70, -74.15],
    [-12.02, -77.11], [-23.43, -46.47], [-34.82, -58.54], [-33.39, -70.79],
    [50.0, -30.0], [40.0, -50.0], [35.0, -145.0], [13.5, 144.8]
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
        return fetch(url, { headers: { "User-Agent": "satellite-earth/1.0" }, signal: AbortSignal.timeout(5500) })
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

    if (!seen.size) throw new Error("ADSB.lol worldwide sample returned no aircraft.");

    return {
        source: "ADSB.lol worldwide public ADS-B sample",
        coverage: "worldwide sampled public receiver coverage",
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
