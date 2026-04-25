(() => {
    "use strict";

    const DIRECT_FEED_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";
    const VERCEL_FEED_URL = window.location.hostname.endsWith("vercel.app") ? "/api/tle" : "https://satellite-earth.vercel.app/api/tle";
    const EARTH_API_URL = window.location.hostname.endsWith("vercel.app") ? "/api/earth" : "https://satellite-earth.vercel.app/api/earth";
    const CLOUDS_API_URL = window.location.hostname.endsWith("vercel.app") ? "/api/clouds" : "https://satellite-earth.vercel.app/api/clouds";
    const AIRCRAFT_API_URL = window.location.hostname.endsWith("vercel.app") ? "/api/aircraft" : "https://satellite-earth.vercel.app/api/aircraft";
    const EARTH_RADIUS = 2.05;
    const EARTH_KM = 6371;
    const POSITION_UPDATE_MS = 1200;
    const FEED_REFRESH_MS = 30 * 60 * 1000;
    const AIRCRAFT_REFRESH_MS = 30 * 1000;

    const TEXTURES = {
        earth: "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
        normal: "https://threejs.org/examples/textures/planets/earth_normal_2048.jpg",
        specular: "https://threejs.org/examples/textures/planets/earth_specular_2048.jpg",
        clouds: "https://threejs.org/examples/textures/planets/earth_clouds_1024.png"
    };

    const ORBIT_COLORS = {
        LEO: "#5ee7ff",
        MEO: "#b8ff7a",
        GEO: "#ffce66",
        HEO: "#ff7ad9"
    };

    const NOTABLE = {
        "25544": {
            label: "ISS",
            fullName: "International Space Station",
            description: "Crewed low-Earth orbit laboratory with changing internal and external payloads.",
            match: ["ISS", "ZARYA"],
            instruments: ["Alpha Magnetic Spectrometer-02", "NICER X-ray telescope", "ECOSTRESS thermal radiometer", "GEDI lidar", "SAGE III atmospheric instrument", "External research payload racks vary by expedition"],
            liveData: ["Position, altitude, speed, and ground track are computed live from the active TLE.", "Crew and payload telemetry is not public in the CelesTrak feed.", "Public mission data: NASA ISS, ECOSTRESS, GEDI, and NICER portals."]
        },
        "20580": {
            label: "Hubble",
            fullName: "Hubble Space Telescope",
            description: "NASA/ESA optical and ultraviolet space telescope in low-Earth orbit.",
            match: ["HST", "HUBBLE"],
            instruments: ["Wide Field Camera 3", "Advanced Camera for Surveys", "Cosmic Origins Spectrograph", "Space Telescope Imaging Spectrograph", "Fine Guidance Sensors"],
            liveData: ["Live orbit is propagated from the current TLE.", "Science observation schedules and image products are distributed through the MAST archive."]
        },
        "25994": {
            label: "Terra",
            fullName: "Terra EOS AM-1",
            description: "NASA Earth-observing platform for land, ocean, atmosphere, and radiation measurements.",
            match: ["TERRA"],
            instruments: ["ASTER", "CERES", "MISR", "MODIS", "MOPITT"],
            liveData: ["Live orbital state is computed from TLE data.", "Near-real-time science products are available through NASA Earthdata and LANCE where supported."]
        },
        "27424": {
            label: "Aqua",
            fullName: "Aqua EOS PM-1",
            description: "NASA Earth-observing satellite focused on the water cycle and atmospheric sounding.",
            match: ["AQUA"],
            instruments: ["AIRS", "AMSU-A", "CERES", "MODIS", "HSB inactive", "AMSR-E inactive"],
            liveData: ["Live orbital state is computed from TLE data.", "Near-real-time MODIS and atmospheric products are available through NASA Earthdata and LANCE."]
        },
        "39084": {
            label: "Landsat 8",
            fullName: "Landsat 8",
            description: "USGS/NASA land imaging mission in a sun-synchronous orbit.",
            match: ["LANDSAT 8"],
            instruments: ["Operational Land Imager", "Thermal Infrared Sensor"],
            liveData: ["Live orbit is propagated from TLE data.", "Scene acquisitions and products are distributed through USGS EarthExplorer and LandsatLook."]
        },
        "49260": {
            label: "Landsat 9",
            fullName: "Landsat 9",
            description: "USGS/NASA land imaging mission continuing the Landsat record.",
            match: ["LANDSAT 9"],
            instruments: ["Operational Land Imager 2", "Thermal Infrared Sensor 2"],
            liveData: ["Live orbit is propagated from TLE data.", "Scene acquisitions and products are distributed through USGS EarthExplorer and LandsatLook."]
        },
        "43013": {
            label: "NOAA-20",
            fullName: "NOAA-20 / JPSS-1",
            description: "Polar-orbiting weather satellite supporting global environmental observations.",
            match: ["NOAA 20", "NOAA-20", "JPSS"],
            instruments: ["VIIRS", "CrIS", "ATMS", "OMPS", "CERES"],
            liveData: ["Live orbit is propagated from TLE data.", "Near-real-time weather products are available through NOAA CLASS and direct broadcast networks."]
        },
        "41866": {
            label: "GOES-16",
            fullName: "GOES-16 / GOES East",
            description: "NOAA geostationary weather satellite monitoring the Americas and Atlantic.",
            match: ["GOES 16", "GOES-16"],
            instruments: ["Advanced Baseline Imager", "Geostationary Lightning Mapper", "Solar Ultraviolet Imager", "EXIS", "SEISS", "Magnetometer"],
            liveData: ["Live geostationary position is propagated from TLE data.", "Real-time imagery and lightning products are distributed by NOAA GOES data services."]
        },
        "51850": {
            label: "GOES-18",
            fullName: "GOES-18 / GOES West",
            description: "NOAA geostationary weather satellite monitoring the Pacific and western Americas.",
            match: ["GOES 18", "GOES-18"],
            instruments: ["Advanced Baseline Imager", "Geostationary Lightning Mapper", "Solar Ultraviolet Imager", "EXIS", "SEISS", "Magnetometer"],
            liveData: ["Live geostationary position is propagated from TLE data.", "Real-time imagery and lightning products are distributed by NOAA GOES data services."]
        },
        "39634": {
            label: "Sentinel-1A",
            fullName: "Sentinel-1A",
            description: "ESA Copernicus radar imaging satellite.",
            match: ["SENTINEL-1A"],
            instruments: ["C-band Synthetic Aperture Radar"],
            liveData: ["Live orbit is propagated from TLE data.", "Acquisition plans and products are available through Copernicus data services."]
        },
        "40697": {
            label: "Sentinel-2A",
            fullName: "Sentinel-2A",
            description: "ESA Copernicus multispectral land imaging satellite.",
            match: ["SENTINEL-2A"],
            instruments: ["MultiSpectral Instrument"],
            liveData: ["Live orbit is propagated from TLE data.", "Acquisition plans and products are available through Copernicus data services."]
        },
        "43613": {
            label: "ICESat-2",
            fullName: "ICESat-2",
            description: "NASA laser altimetry mission measuring ice, land, vegetation, and ocean surfaces.",
            match: ["ICESAT-2"],
            instruments: ["Advanced Topographic Laser Altimeter System"],
            liveData: ["Live orbit is propagated from TLE data.", "Science products are distributed through NASA NSIDC and Earthdata."]
        },
        "43435": {
            label: "TESS",
            fullName: "Transiting Exoplanet Survey Satellite",
            description: "NASA exoplanet survey mission in a highly elliptical Earth orbit.",
            match: ["TESS"],
            instruments: ["Four wide-field CCD cameras"],
            liveData: ["Live orbital state is propagated from TLE data.", "Science light curves and image products are distributed through MAST."]
        }
    };

    const FALLBACK_TLES = `ISS (ZARYA)
1 25544U 98067A   24110.54237269  .00016717  00000+0  10270-3 0  9994
2 25544  51.6423  67.1234 0004935  54.3210  72.9351 15.50048318447664
HST
1 20580U 90037B   24110.46035185  .00005318  00000+0  23118-3 0  9995
2 20580  28.4693 141.9435 0002540  70.9205 289.1669 15.08821954597244
TERRA
1 25994U 99068A   24110.52584028  .00000713  00000+0  17401-3 0  9992
2 25994  98.1502 184.9963 0001437  92.3233 267.8136 14.57108026294235
AQUA
1 27424U 02022A   24110.51966346  .00000862  00000+0  20155-3 0  9993
2 27424  98.2476  53.9563 0001420  83.1519 276.9826 14.57110210166565
LANDSAT 8
1 39084U 13008A   24110.47149769  .00000675  00000+0  15335-3 0  9999
2 39084  98.2147 183.5125 0001197  89.7370 270.3975 14.57112172592186
LANDSAT 9
1 49260U 21088A   24110.48925161  .00000674  00000+0  15313-3 0  9990
2 49260  98.2170 183.4810 0001291  86.1844 273.9505 14.57110156135532
NOAA 20 (JPSS-1)
1 43013U 17073A   24110.49771064  .00000342  00000+0  18658-3 0  9992
2 43013  98.7441  45.3014 0001477  90.1298 269.9998 14.19551293333162
GOES 16
1 41866U 16071A   24110.28202474 -.00000277  00000+0  00000+0 0  9997
2 41866   0.0541  89.7612 0001282 230.1377 254.4609  1.00271572 26939
GOES 18
1 51850U 22021A   24110.28750000 -.00000270  00000+0  00000+0 0  9991
2 51850   0.0195  89.7451 0001690 216.5979 104.5039  1.00272100  7915
SENTINEL-1A
1 39634U 14016A   24110.53510654  .00000394  00000+0  99186-4 0  9998
2 39634  98.1815 119.8652 0001335  93.8137 266.3225 14.59199096535130
SENTINEL-2A
1 40697U 15028A   24110.49122733  .00000405  00000+0  10288-3 0  9996
2 40697  98.5671 181.9702 0001277  88.8019 271.3327 14.30814749459152
ICESAT-2
1 43613U 18070A   24110.52422733  .00000437  00000+0  12608-3 0  9994
2 43613  92.0012 179.7330 0008319  89.3709 270.8469 14.84443029302536
TESS
1 43435U 18038A   24110.12500000 -.00000314  00000+0  00000+0 0  9997
2 43435  28.4878 195.6504 5546000 186.4532 161.1408  0.07420637  1645`;

    const els = {
        globe: document.getElementById("globe"),
        labels: document.getElementById("labels"),
        satCount: document.getElementById("satCount"),
        feedSource: document.getElementById("feedSource"),
        updateTime: document.getElementById("updateTime"),
        feedStatus: document.getElementById("feedStatus"),
        refreshBtn: document.getElementById("refreshBtn"),
        resetViewBtn: document.getElementById("resetViewBtn"),
        aircraftViewBtn: document.getElementById("aircraftViewBtn"),
        satellitesToggle: document.getElementById("satellitesToggle"),
        labelsToggle: document.getElementById("labelsToggle"),
        cloudsToggle: document.getElementById("cloudsToggle"),
        aircraftToggle: document.getElementById("aircraftToggle"),
        densitySelect: document.getElementById("densitySelect"),
        cloudStatus: document.getElementById("cloudStatus"),
        aircraftStatus: document.getElementById("aircraftStatus"),
        searchForm: document.getElementById("searchForm"),
        searchInput: document.getElementById("searchInput"),
        notableChips: document.getElementById("notableChips"),
        selectedName: document.getElementById("selectedName"),
        selectedSummary: document.getElementById("selectedSummary"),
        selectedNorad: document.getElementById("selectedNorad"),
        selectedOrbit: document.getElementById("selectedOrbit"),
        selectedLat: document.getElementById("selectedLat"),
        selectedLon: document.getElementById("selectedLon"),
        selectedAlt: document.getElementById("selectedAlt"),
        selectedSpeed: document.getElementById("selectedSpeed"),
        selectedInclination: document.getElementById("selectedInclination"),
        selectedTleAge: document.getElementById("selectedTleAge"),
        instrumentList: document.getElementById("instrumentList"),
        liveDataList: document.getElementById("liveDataList")
    };

    if (!window.THREE || !window.THREE.OrbitControls || !window.satellite) {
        showFatal("Required libraries could not be loaded. Check the internet connection for Three.js and satellite.js CDN access, then reload this page.");
        return;
    }

    let scene;
    let camera;
    let renderer;
    let controls;
    let earth;
    let earthMaterial;
    let clouds;
    let cloudSource = "static cloud texture";
    let satellitePoints;
    let satelliteGeometry;
    let positionBuffer;
    let colorBuffer;
    let aircraftPoints;
    let aircraftGeometry;
    let aircraftPositionBuffer;
    let aircraftColorBuffer;
    let selectionRing;
    let textureLoader;
    let lastPositionUpdate = 0;
    let lastAircraftUpdate = 0;
    let selectedIndex = -1;
    let selectedAircraftIndex = -1;
    let selectedKind = "satellite";
    let isLoading = false;
    let isAircraftLoading = false;
    let feedRefreshTimer = 0;
    let pointerDown = null;

    const satellites = [];
    const aircraft = [];
    const labelEntries = [];
    const layers = {
        satellites: true,
        labels: true,
        clouds: true,
        aircraft: true,
        density: "all"
    };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const projected = new THREE.Vector3();
    const orbitColorObjects = Object.fromEntries(Object.entries(ORBIT_COLORS).map(([key, value]) => [key, new THREE.Color(value)]));

    init();

    function init() {
        setupScene();
        bindEvents();
        loadSatelliteFeed();
        loadLiveEarthLayer();
        loadLiveCloudLayer();
        loadAircraftFeed();
        feedRefreshTimer = window.setInterval(loadSatelliteFeed, FEED_REFRESH_MS);
        animate(0);
    }

    function setupScene() {
        textureLoader = new THREE.TextureLoader();
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x02040b, 0.025);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x02040b, 1);
        if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
        els.globe.appendChild(renderer.domElement);

        camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.08, 90);
        camera.position.set(0.55, 2.35, 8.1);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.rotateSpeed = 0.45;
        controls.zoomSpeed = 0.78;
        controls.minDistance = 5.4;
        controls.maxDistance = 22;
        controls.target.set(0, 0, 0);

        raycaster.params.Points.threshold = 0.13;

        scene.add(new THREE.AmbientLight(0x5f7390, 0.42));
        const sun = new THREE.DirectionalLight(0xffffff, 1.85);
        sun.position.set(-4.2, 1.5, 6.5);
        scene.add(sun);
        const rim = new THREE.DirectionalLight(0x73bdff, 0.55);
        rim.position.set(6, 4, -6);
        scene.add(rim);

        createStars();
        createEarth();
        createSelectionRing();
        window.addEventListener("resize", onResize);
    }

    function createStars() {
        const count = 1800;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i += 1) {
            const radius = 32 + Math.random() * 28;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);
            const o = i * 3;
            const tint = 0.62 + Math.random() * 0.38;
            positions[o] = x;
            positions[o + 1] = y;
            positions[o + 2] = z;
            colors[o] = tint * 0.82;
            colors[o + 1] = tint * 0.92;
            colors[o + 2] = tint;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        const material = new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false });
        scene.add(new THREE.Points(geometry, material));
    }

    function createEarth() {
        earthMaterial = new THREE.MeshPhongMaterial({
            map: createFallbackEarthTexture(),
            bumpScale: 0.035,
            specular: new THREE.Color(0x18375f),
            shininess: 18
        });
        earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 128, 128), earthMaterial);
        scene.add(earth);

        loadTexture(TEXTURES.earth, texture => {
            texture.encoding = THREE.sRGBEncoding;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            earthMaterial.map = texture;
            earthMaterial.needsUpdate = true;
        });
        loadTexture(TEXTURES.normal, texture => {
            earthMaterial.normalMap = texture;
            earthMaterial.normalScale = new THREE.Vector2(0.22, 0.22);
            earthMaterial.needsUpdate = true;
        });
        loadTexture(TEXTURES.specular, texture => {
            earthMaterial.specularMap = texture;
            earthMaterial.needsUpdate = true;
        });

        const cloudMaterial = new THREE.MeshBasicMaterial({
            map: createFallbackCloudTexture(),
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
            blending: THREE.NormalBlending
        });
        clouds = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.012, 96, 96), cloudMaterial);
        clouds.rotation.y = earth.rotation.y;
        scene.add(clouds);
        loadTexture(TEXTURES.clouds, texture => {
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            cloudMaterial.map = texture;
            cloudMaterial.needsUpdate = true;
        });

        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(EARTH_RADIUS * 1.06, 128, 128),
            new THREE.ShaderMaterial({
                vertexShader: "varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
                fragmentShader: "varying vec3 vNormal; void main() { float edge = max(0.0, 0.64 - dot(vNormal, vec3(0.0, 0.0, 1.0))); float intensity = pow(edge, 2.3); gl_FragColor = vec4(0.22, 0.58, 1.0, 1.0) * intensity; }",
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthWrite: false
            })
        );
        scene.add(atmosphere);
    }

    function createSelectionRing() {
        selectionRing = new THREE.Mesh(
            new THREE.RingGeometry(0.035, 0.048, 48),
            new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false })
        );
        selectionRing.visible = false;
        scene.add(selectionRing);
    }

    function bindEvents() {
        els.refreshBtn.addEventListener("click", () => loadSatelliteFeed(true));
        els.resetViewBtn.addEventListener("click", resetView);
        els.aircraftViewBtn.addEventListener("click", showAircraftView);
        els.satellitesToggle.addEventListener("change", () => {
            layers.satellites = els.satellitesToggle.checked;
            els.labelsToggle.disabled = !layers.satellites;
            if (!layers.satellites) layers.labels = false;
            else layers.labels = els.labelsToggle.checked;
            updateSatellitePositions(true);
            updateLabels();
            if (!layers.satellites && selectedKind === "satellite") clearSelection();
        });
        els.labelsToggle.addEventListener("change", () => {
            layers.labels = els.labelsToggle.checked;
            updateLabels();
        });
        els.cloudsToggle.addEventListener("change", () => {
            layers.clouds = els.cloudsToggle.checked;
            if (clouds) clouds.visible = layers.clouds;
            els.cloudStatus.textContent = layers.clouds ? "Clouds: " + cloudSource : "Clouds: hidden";
        });
        els.aircraftToggle.addEventListener("change", () => {
            layers.aircraft = els.aircraftToggle.checked;
            if (aircraftPoints) aircraftPoints.visible = layers.aircraft;
            if (layers.aircraft && !aircraft.length) loadAircraftFeed(true);
            if (!layers.aircraft && selectedKind === "aircraft") clearSelection();
            els.aircraftStatus.textContent = layers.aircraft ? aircraftStatusText() : "Aircraft: hidden";
        });
        els.densitySelect.addEventListener("change", () => {
            layers.density = els.densitySelect.value;
            updateSatellitePositions(true);
        });
        els.searchForm.addEventListener("submit", event => {
            event.preventDefault();
            selectFromSearch();
        });
        renderer.domElement.addEventListener("pointerdown", event => {
            pointerDown = { x: event.clientX, y: event.clientY };
        });
        renderer.domElement.addEventListener("pointerup", event => {
            if (!pointerDown) return;
            const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
            pointerDown = null;
            if (moved <= 6) pickSatellite(event);
        });
    }

    async function loadSatelliteFeed(manual = false) {
        if (isLoading) return;
        isLoading = true;
        const previousSelection = selectedIndex >= 0 && satellites[selectedIndex] ? satellites[selectedIndex].catalogId : "";
        els.refreshBtn.disabled = true;
        setFeedStatus(manual ? "Refreshing live active satellite catalog..." : "Loading active satellite catalog from CelesTrak...");

        let text;
        let sourceLabel = "CelesTrak active";
        let usedFallback = false;
        try {
            const liveFeed = await fetchLiveTle();
            text = liveFeed.text;
            sourceLabel = liveFeed.sourceLabel;
        } catch (error) {
            console.warn("Live satellite feed unavailable; using fallback TLE set.", error);
            text = FALLBACK_TLES;
            sourceLabel = "Fallback set";
            usedFallback = true;
        }

        const records = parseTles(text);
        satellites.length = 0;
        for (const record of records) {
            const sat = makeSatellite(record);
            if (sat) satellites.push(sat);
        }

        createSatellitePoints();
        updateSatellitePositions(true);
        buildLabels();
        buildNotableChips();
        updateMetrics(sourceLabel);
        setFeedStatus(usedFallback
            ? "Live feed was unavailable, so this view is using the bundled notable-satellite fallback set."
            : "Live CelesTrak active-object TLEs loaded. Positions are propagated locally in real time.");

        selectedIndex = previousSelection ? satellites.findIndex(sat => sat.catalogId === previousSelection) : -1;
        if (selectedIndex < 0) clearSelection();
        else updateSelectedDetails();

        els.refreshBtn.disabled = false;
        isLoading = false;
    }

    async function fetchLiveTle() {
        const errors = [];
        const candidates = [
            { url: VERCEL_FEED_URL, sourceLabel: "CelesTrak live" },
            { url: DIRECT_FEED_URL, sourceLabel: "CelesTrak direct" }
        ];

        for (const candidate of candidates) {
            try {
                return {
                    text: await fetchTle(candidate.url),
                    sourceLabel: candidate.sourceLabel
                };
            } catch (error) {
                errors.push(candidate.url + ": " + (error instanceof Error ? error.message : String(error)));
            }
        }

        throw new Error(errors.join("; "));
    }

    async function fetchTle(url) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 18000);
        try {
            const response = await fetch(url, { cache: "no-store", signal: controller.signal });
            if (!response.ok) throw new Error("HTTP " + response.status);
            const text = await response.text();
            if (!/\n1\s+\d{5}/.test("\n" + text) || !/\n2\s+\d{5}/.test("\n" + text)) {
                throw new Error("Response did not contain TLE records.");
            }
            return text;
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async function loadAircraftFeed(manual = false) {
        if (isAircraftLoading || !layers.aircraft) return;
        isAircraftLoading = true;
        const previousAircraft = selectedKind === "aircraft" && aircraft[selectedAircraftIndex] ? aircraft[selectedAircraftIndex].icao24 : "";
        els.aircraftStatus.textContent = manual ? "Aircraft: refreshing" : "Aircraft: loading";

        try {
            const response = await fetch(AIRCRAFT_API_URL, { cache: "no-store" });
            if (!response.ok) throw new Error("HTTP " + response.status);
            const data = await response.json();
            aircraft.length = 0;
            const airborne = (data.aircraft || []).filter(item => !item.onGround);
            for (const item of selectDisplayAircraft(airborne, 2600)) {
                if (!Number.isFinite(item.lat) || !Number.isFinite(item.lon)) continue;
                const altitudeMeters = Number.isFinite(item.geoAltitude) ? item.geoAltitude : item.baroAltitude;
                const position = new THREE.Vector3();
                writeLatLonVector(position, item.lat, item.lon, aircraftAltitudeToRadius(altitudeMeters));
                aircraft.push({ ...item, feedSource: data.source || "aircraft feed", position });
            }
            createAircraftPoints();
            if (previousAircraft) {
                selectedAircraftIndex = aircraft.findIndex(item => item.icao24 === previousAircraft);
                if (selectedAircraftIndex >= 0) updateSelectedDetails();
                else clearSelection();
            }
            els.aircraftStatus.textContent = aircraftStatusText(data.source);
        } catch (error) {
            console.warn("Aircraft feed unavailable.", error);
            els.aircraftStatus.textContent = "Aircraft: unavailable";
        } finally {
            isAircraftLoading = false;
        }
    }

    function selectDisplayAircraft(items, limit) {
        if (items.length <= limit) return items;
        const selected = [];
        const step = items.length / limit;
        for (let i = 0; i < limit; i += 1) {
            selected.push(items[Math.floor(i * step)]);
        }
        return selected;
    }

    function createAircraftPoints() {
        if (aircraftPoints) {
            scene.remove(aircraftPoints);
            aircraftGeometry.dispose();
            aircraftPoints.material.dispose();
        }

        aircraftPositionBuffer = new Float32Array(Math.max(1, aircraft.length) * 3);
        aircraftColorBuffer = new Float32Array(Math.max(1, aircraft.length) * 3);
        if (!aircraft.length) {
            aircraftPositionBuffer[0] = 999;
            aircraftPositionBuffer[1] = 999;
            aircraftPositionBuffer[2] = 999;
        }
        for (let i = 0; i < aircraft.length; i += 1) {
            const plane = aircraft[i];
            const o = i * 3;
            aircraftPositionBuffer[o] = plane.position.x;
            aircraftPositionBuffer[o + 1] = plane.position.y;
            aircraftPositionBuffer[o + 2] = plane.position.z;
            const color = plane.onGround ? new THREE.Color(0x7f8a96) : new THREE.Color(0xd9a762);
            aircraftColorBuffer[o] = color.r;
            aircraftColorBuffer[o + 1] = color.g;
            aircraftColorBuffer[o + 2] = color.b;
        }

        aircraftGeometry = new THREE.BufferGeometry();
        aircraftGeometry.setAttribute("position", new THREE.BufferAttribute(aircraftPositionBuffer, 3));
        aircraftGeometry.setAttribute("color", new THREE.BufferAttribute(aircraftColorBuffer, 3));
        aircraftGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), EARTH_RADIUS + 0.18);

        aircraftPoints = new THREE.Points(aircraftGeometry, new THREE.PointsMaterial({
            size: 0.07,
            map: createAircraftTexture(),
            transparent: true,
            opacity: 0.92,
            alphaTest: 0.02,
            depthWrite: false,
            sizeAttenuation: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        }));
        aircraftPoints.frustumCulled = false;
        aircraftPoints.visible = layers.aircraft;
        scene.add(aircraftPoints);
    }

    async function loadLiveCloudLayer() {
        if (!layers.clouds || !clouds) return;
        els.cloudStatus.textContent = "Clouds: loading";

        try {
            const response = await fetch(CLOUDS_API_URL, { cache: "no-store" });
            if (!response.ok) throw new Error("HTTP " + response.status);
            const metadata = await response.json();
            const texture = await createCloudTextureFromTiles(metadata);
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            clouds.material.map = texture;
            clouds.material.opacity = 0.78;
            clouds.material.needsUpdate = true;
            clouds.visible = layers.clouds;
            cloudSource = "NASA " + metadata.date;
            els.cloudStatus.textContent = "Clouds: " + metadata.date;
        } catch (error) {
            console.warn("Live cloud layer unavailable; keeping fallback clouds.", error);
            cloudSource = "fallback";
            els.cloudStatus.textContent = "Clouds: fallback";
        }
    }

    async function loadLiveEarthLayer() {
        if (!earthMaterial) return;

        try {
            const response = await fetch(EARTH_API_URL, { cache: "no-store" });
            if (!response.ok) throw new Error("HTTP " + response.status);
            const metadata = await response.json();
            const texture = await createTiledTexture(metadata, 4096, 2048);
            texture.encoding = THREE.sRGBEncoding;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            earthMaterial.map = texture;
            earthMaterial.needsUpdate = true;
            setFeedStatus("Live CelesTrak TLEs loaded. Earth base uses NASA Blue Marble; clouds update separately from NASA GIBS.");
        } catch (error) {
            console.warn("Blue Marble Earth layer unavailable; keeping fallback Earth texture.", error);
        }
    }

    async function createCloudTextureFromTiles(metadata) {
        const canvas = await createTiledCanvas(metadata, 4096, 2048);
        const ctx = canvas.getContext("2d");
        whitenCloudFractionCanvas(ctx, canvas.width, canvas.height);
        return new THREE.CanvasTexture(canvas);
    }

    async function createTiledTexture(metadata, width, height) {
        return new THREE.CanvasTexture(await createTiledCanvas(metadata, width, height));
    }

    async function createTiledCanvas(metadata, width, height) {
        const cols = metadata.cols || 10;
        const rows = metadata.rows || 5;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, width, height);
        const tileWidth = width / cols;
        const tileHeight = height / rows;

        const jobs = [];
        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                const url = metadata.template.replace("{row}", String(row)).replace("{col}", String(col));
                jobs.push(loadImage(url).then(image => {
                    ctx.drawImage(image, col * tileWidth, row * tileHeight, tileWidth + 1, tileHeight + 1);
                }).catch(() => false));
            }
        }

        await Promise.all(jobs);
        return canvas;
    }

    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = url;
        });
    }

    function whitenCloudFractionCanvas(ctx, width, height) {
        const image = ctx.getImageData(0, 0, width, height);
        const data = image.data;
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha < 8) continue;
            const strength = Math.max(data[i], data[i + 1], data[i + 2]) / 255;
            const opacity = strength > 0.06 ? Math.max(88, Math.min(255, Math.round(75 + strength * 245))) : 0;
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = opacity;
        }
        ctx.putImageData(image, 0, 0);
    }

    function parseTles(text) {
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const records = [];
        for (let i = 0; i < lines.length;) {
            if (lines[i] && lines[i].startsWith("1 ") && lines[i + 1] && lines[i + 1].startsWith("2 ")) {
                records.push({ name: "NORAD " + lines[i].slice(2, 7).trim(), line1: lines[i], line2: lines[i + 1] });
                i += 2;
                continue;
            }
            if (lines[i + 1] && lines[i + 1].startsWith("1 ") && lines[i + 2] && lines[i + 2].startsWith("2 ")) {
                records.push({ name: cleanName(lines[i]), line1: lines[i + 1], line2: lines[i + 2] });
                i += 3;
                continue;
            }
            i += 1;
        }
        return records;
    }

    function makeSatellite(record) {
        try {
            const satrec = satellite.twoline2satrec(record.line1, record.line2);
            const catalogId = record.line1.slice(2, 7).trim();
            const meta = NOTABLE[catalogId] || null;
            return {
                catalogId,
                name: record.name || (meta && meta.fullName) || "NORAD " + catalogId,
                line1: record.line1,
                line2: record.line2,
                satrec,
                meta,
                epochDate: parseTleEpoch(record.line1),
                inclination: numberFromTle(record.line2, 8, 16),
                meanMotion: numberFromTle(record.line2, 52, 63),
                position: new THREE.Vector3(999, 999, 999),
                lat: NaN,
                lon: NaN,
                alt: NaN,
                speed: NaN,
                orbitClass: "LEO",
                visible: false
            };
        } catch (error) {
            return null;
        }
    }

    function createSatellitePoints() {
        if (satellitePoints) {
            scene.remove(satellitePoints);
            satelliteGeometry.dispose();
            satellitePoints.material.dispose();
        }

        positionBuffer = new Float32Array(Math.max(1, satellites.length) * 3);
        colorBuffer = new Float32Array(Math.max(1, satellites.length) * 3);
        for (let i = 0; i < positionBuffer.length; i += 3) {
            positionBuffer[i] = 999;
            positionBuffer[i + 1] = 999;
            positionBuffer[i + 2] = 999;
            colorBuffer[i] = 1;
            colorBuffer[i + 1] = 1;
            colorBuffer[i + 2] = 1;
        }

        satelliteGeometry = new THREE.BufferGeometry();
        satelliteGeometry.setAttribute("position", new THREE.BufferAttribute(positionBuffer, 3));
        satelliteGeometry.setAttribute("color", new THREE.BufferAttribute(colorBuffer, 3));
        satelliteGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 14);

        const material = new THREE.PointsMaterial({
            size: 0.052,
            map: createPointTexture(),
            transparent: true,
            opacity: 0.68,
            alphaTest: 0.02,
            depthWrite: false,
            sizeAttenuation: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });
        satellitePoints = new THREE.Points(satelliteGeometry, material);
        satellitePoints.frustumCulled = false;
        scene.add(satellitePoints);
    }

    function updateSatellitePositions(force = false) {
        if (!satellites.length || !positionBuffer || !colorBuffer) return;
        const now = new Date();
        const gmst = satellite.gstime(now);
        let visibleCount = 0;

        for (let i = 0; i < satellites.length; i += 1) {
            const sat = satellites[i];
            const propagated = satellite.propagate(sat.satrec, now);
            if (!propagated || !propagated.position || !Number.isFinite(propagated.position.x)) {
                hideSatelliteAt(i, sat);
                continue;
            }

            const geodetic = satellite.eciToGeodetic(propagated.position, gmst);
            const lat = satellite.degreesLat(geodetic.latitude);
            const lon = satellite.degreesLong(geodetic.longitude);
            const alt = geodetic.height;
            const velocity = propagated.velocity;
            const speed = velocity ? Math.hypot(velocity.x, velocity.y, velocity.z) : NaN;
            const orbitClass = classifyOrbit(alt, sat.meanMotion);
            const visualRadius = altitudeToVisualRadius(alt);

            writeLatLonVector(sat.position, lat, lon, visualRadius);
            sat.lat = lat;
            sat.lon = lon;
            sat.alt = alt;
            sat.speed = speed;
            sat.orbitClass = orbitClass;
            sat.visible = shouldDisplaySatellite(sat, i);
            if (sat.visible) visibleCount += 1;

            const o = i * 3;
            positionBuffer[o] = sat.visible ? sat.position.x : 999;
            positionBuffer[o + 1] = sat.visible ? sat.position.y : 999;
            positionBuffer[o + 2] = sat.visible ? sat.position.z : 999;

            const color = orbitColorObjects[orbitClass] || orbitColorObjects.LEO;
            colorBuffer[o] = color.r;
            colorBuffer[o + 1] = color.g;
            colorBuffer[o + 2] = color.b;
        }

        satelliteGeometry.attributes.position.needsUpdate = true;
        satelliteGeometry.attributes.color.needsUpdate = true;
        if (force) satelliteGeometry.computeBoundingSphere();
        els.satCount.textContent = satellites.length ? satellites.length.toLocaleString() : visibleCount.toLocaleString();
        els.updateTime.textContent = formatClock(now);
        if (selectedKind === "satellite" && selectedIndex >= 0) updateSelectedDetails();
    }

    function shouldDisplaySatellite(sat, index) {
        if (!layers.satellites) return false;
        if (selectedKind === "satellite" && selectedIndex === index) return true;
        if (sat.meta) return true;
        if (layers.density === "notable") return false;
        if (layers.density === "focus") return index % 4 === 0;
        return true;
    }

    function hideSatelliteAt(index, sat) {
        const o = index * 3;
        positionBuffer[o] = 999;
        positionBuffer[o + 1] = 999;
        positionBuffer[o + 2] = 999;
        sat.visible = false;
    }

    function buildLabels() {
        els.labels.textContent = "";
        labelEntries.length = 0;
        const seen = new Set();
        satellites.forEach((sat, index) => {
            if (!sat.meta || seen.has(sat.meta.label)) return;
            seen.add(sat.meta.label);
            const label = document.createElement("div");
            label.className = "sat-label";
            label.textContent = sat.meta.label;
            label.title = sat.meta.fullName;
            label.setAttribute("role", "button");
            label.tabIndex = 0;
            label.addEventListener("click", event => {
                event.stopPropagation();
                selectSatellite(index, true);
            });
            label.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectSatellite(index, true);
                }
            });
            els.labels.appendChild(label);
            labelEntries.push({ label, index });
        });
    }

    function buildNotableChips() {
        els.notableChips.textContent = "";
        const notableIndexes = satellites
            .map((sat, index) => ({ sat, index }))
            .filter(item => item.sat.meta)
            .filter((item, index, list) => list.findIndex(candidate => candidate.sat.meta.label === item.sat.meta.label) === index)
            .sort((a, b) => a.sat.meta.label.localeCompare(b.sat.meta.label));

        if (!notableIndexes.length) {
            els.notableChips.textContent = "No labeled missions found in this feed.";
            return;
        }

        notableIndexes.forEach(({ sat, index }) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.textContent = sat.meta.label;
            chip.title = sat.meta.fullName;
            chip.addEventListener("click", () => selectSatellite(index, true));
            els.notableChips.appendChild(chip);
        });
    }

    function updateLabels() {
        if (!labelEntries.length) return;
        if (!layers.labels || !layers.satellites) {
            labelEntries.forEach(entry => {
                entry.label.style.opacity = "0";
                entry.label.style.pointerEvents = "none";
            });
            return;
        }
        const width = window.innerWidth;
        const height = window.innerHeight;
        for (const entry of labelEntries) {
            const sat = satellites[entry.index];
            if (!sat || !sat.visible || isOccludedByEarth(sat.position)) {
                entry.label.style.opacity = "0";
                entry.label.style.pointerEvents = "none";
                continue;
            }
            projected.copy(sat.position).project(camera);
            if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.08 || Math.abs(projected.y) > 1.08) {
                entry.label.style.opacity = "0";
                entry.label.style.pointerEvents = "none";
                continue;
            }
            entry.label.style.opacity = "1";
            entry.label.style.pointerEvents = "auto";
            entry.label.style.left = ((projected.x * 0.5 + 0.5) * width).toFixed(1) + "px";
            entry.label.style.top = ((-projected.y * 0.5 + 0.5) * height).toFixed(1) + "px";
        }
    }

    function pickSatellite(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = layers.satellites && satellitePoints ? raycaster.intersectObject(satellitePoints) : [];
        if (hits.length && Number.isInteger(hits[0].index)) {
            selectSatellite(hits[0].index, false);
            return;
        }

        const aircraftHits = layers.aircraft && aircraftPoints ? raycaster.intersectObject(aircraftPoints) : [];
        if (aircraftHits.length && Number.isInteger(aircraftHits[0].index)) {
            selectAircraft(aircraftHits[0].index, false);
        }
    }

    function selectSatellite(index, focus) {
        if (!satellites[index]) return;
        selectedKind = "satellite";
        selectedIndex = index;
        selectedAircraftIndex = -1;
        updateSatellitePositions(true);
        updateSelectedDetails();
        if (focus) focusSatellite(satellites[index]);
    }

    function selectAircraft(index, focus) {
        if (!aircraft[index]) return;
        selectedKind = "aircraft";
        selectedAircraftIndex = index;
        selectedIndex = -1;
        updateSelectedDetails();
        if (focus) focusPosition(aircraft[index].position);
    }

    function selectFromSearch() {
        const query = els.searchInput.value.trim().toLowerCase();
        if (!query) return;
        let index = satellites.findIndex(sat => sat.catalogId === query);
        if (index < 0) {
            index = satellites.findIndex(sat => sat.name.toLowerCase().includes(query) || (sat.meta && sat.meta.label.toLowerCase().includes(query)));
        }
        if (index < 0) {
            setFeedStatus("No satellite matched \"" + els.searchInput.value.trim() + "\". Try a NORAD ID like 25544 or a mission name like Hubble.");
            return;
        }
        selectSatellite(index, true);
    }

    function updateSelectedDetails() {
        if (selectedKind === "aircraft") {
            updateSelectedAircraftDetails();
            return;
        }

        const sat = satellites[selectedIndex];
        if (!sat) {
            clearSelection();
            return;
        }

        const meta = sat.meta;
        const displayName = meta ? meta.label + " / " + sat.name : sat.name;
        els.selectedName.textContent = displayName;
        els.selectedSummary.textContent = meta
            ? meta.description
            : "TLE-only object. The public active-satellite feed provides orbit data, but not an instrument manifest for this spacecraft.";
        els.selectedNorad.textContent = sat.catalogId;
        els.selectedOrbit.textContent = sat.orbitClass + " / " + formatPeriod(sat.meanMotion);
        els.selectedLat.textContent = Number.isFinite(sat.lat) ? formatLatitude(sat.lat) : "--";
        els.selectedLon.textContent = Number.isFinite(sat.lon) ? formatLongitude(sat.lon) : "--";
        els.selectedAlt.textContent = Number.isFinite(sat.alt) ? Math.round(sat.alt).toLocaleString() + " km" : "--";
        els.selectedSpeed.textContent = Number.isFinite(sat.speed) ? sat.speed.toFixed(2) + " km/s" : "--";
        els.selectedInclination.textContent = Number.isFinite(sat.inclination) ? sat.inclination.toFixed(2) + " deg" : "--";
        els.selectedTleAge.textContent = sat.epochDate ? formatTleAge(sat.epochDate) : "--";

        renderList(els.instrumentList, meta
            ? meta.instruments
            : ["No instrument manifest is included in CelesTrak TLE records for this object.", "Click a labeled mission for curated public instrument metadata."]);

        const liveItems = [
            "UTC now: " + new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
            Number.isFinite(sat.lat) && Number.isFinite(sat.lon) ? "Ground point: " + formatLatitude(sat.lat) + ", " + formatLongitude(sat.lon) : "Ground point: propagating...",
            Number.isFinite(sat.alt) ? "Current altitude: " + Math.round(sat.alt).toLocaleString() + " km" : "Current altitude: propagating...",
            "TLE epoch: " + (sat.epochDate ? sat.epochDate.toISOString().slice(0, 10) : "unknown")
        ];
        if (meta) liveItems.push(...meta.liveData);
        else liveItems.push("Real-time instrument telemetry is not public in the active TLE feed; this panel shows live orbital data only.");
        renderList(els.liveDataList, liveItems);
    }

    function updateSelectedAircraftDetails() {
        const plane = aircraft[selectedAircraftIndex];
        if (!plane) {
            clearSelection();
            return;
        }

        const altitudeMeters = Number.isFinite(plane.geoAltitude) ? plane.geoAltitude : plane.baroAltitude;
        els.selectedName.textContent = plane.callsign || plane.icao24.toUpperCase();
        const source = plane.feedSource || "live public aircraft traffic feed";
        els.selectedSummary.textContent = "Live airborne aircraft state from " + source + ". Coverage depends on public receiver availability and source rate limits.";
        els.selectedNorad.textContent = plane.icao24.toUpperCase();
        els.selectedOrbit.textContent = plane.onGround ? "On ground" : "Airborne";
        els.selectedLat.textContent = formatLatitude(plane.lat);
        els.selectedLon.textContent = formatLongitude(plane.lon);
        els.selectedAlt.textContent = Number.isFinite(altitudeMeters) ? Math.round(altitudeMeters).toLocaleString() + " m" : "--";
        els.selectedSpeed.textContent = Number.isFinite(plane.velocity) ? (plane.velocity * 3.6).toFixed(0) + " km/h" : "--";
        els.selectedInclination.textContent = Number.isFinite(plane.heading) ? plane.heading.toFixed(0) + " deg" : "--";
        els.selectedTleAge.textContent = plane.lastContact ? formatSecondsAgo(Date.now() / 1000 - plane.lastContact) : "--";
        renderList(els.instrumentList, ["Aircraft telemetry includes position, altitude, heading, velocity, and last contact where published by the active traffic source."]);
        renderList(els.liveDataList, [
            "Reported identity: " + plane.country,
            "Ground point: " + formatLatitude(plane.lat) + ", " + formatLongitude(plane.lon),
            Number.isFinite(altitudeMeters) ? "Current altitude: " + Math.round(altitudeMeters).toLocaleString() + " m" : "Current altitude: unknown",
            Number.isFinite(plane.verticalRate) ? "Vertical rate: " + plane.verticalRate.toFixed(1) + " m/s" : "Vertical rate: unknown",
            "Last contact: " + (plane.lastContact ? new Date(plane.lastContact * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "unknown")
        ]);
    }

    function clearSelection() {
        selectedKind = "satellite";
        selectedIndex = -1;
        selectedAircraftIndex = -1;
        if (selectionRing) selectionRing.visible = false;
        els.selectedName.textContent = "Click any object";
        els.selectedSummary.textContent = "Drag to rotate Earth, scroll to zoom, then click a satellite marker, labeled mission, or amber aircraft marker.";
        [els.selectedNorad, els.selectedOrbit, els.selectedLat, els.selectedLon, els.selectedAlt, els.selectedSpeed, els.selectedInclination, els.selectedTleAge].forEach(el => {
            el.textContent = "--";
        });
        renderList(els.instrumentList, ["Instrument manifests are shown for labeled missions when public metadata is available."]);
        renderList(els.liveDataList, ["Live satellite orbit, cloud, and aircraft layers update from public feeds."]);
    }

    function renderList(element, items) {
        element.textContent = "";
        items.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            element.appendChild(li);
        });
    }

    function updateMetrics(sourceLabel) {
        els.feedSource.textContent = sourceLabel;
        els.satCount.textContent = satellites.length ? satellites.length.toLocaleString() : "--";
        els.updateTime.textContent = formatClock(new Date());
    }

    function animate(time) {
        window.requestAnimationFrame(animate);
        controls.update();
        if (clouds && layers.clouds) clouds.rotation.y += 0.00005;
        if (time - lastPositionUpdate > POSITION_UPDATE_MS) {
            lastPositionUpdate = time;
            updateSatellitePositions();
        }
        if (layers.aircraft && time - lastAircraftUpdate > AIRCRAFT_REFRESH_MS) {
            lastAircraftUpdate = time;
            loadAircraftFeed();
        }
        updateSelectionRing(time);
        updateLabels();
        renderer.render(scene, camera);
    }

    function updateSelectionRing(time) {
        if (!selectionRing) return;
        if (selectedKind === "satellite" && selectedIndex < 0) return;
        if (selectedKind === "aircraft" && selectedAircraftIndex < 0) return;
        const target = selectedKind === "aircraft" ? aircraft[selectedAircraftIndex] : satellites[selectedIndex];
        if (!target || !target.position || (selectedKind === "satellite" && !target.visible)) {
            selectionRing.visible = false;
            return;
        }
        selectionRing.visible = true;
        selectionRing.position.copy(target.position);
        selectionRing.lookAt(camera.position);
        const distance = camera.position.distanceTo(target.position);
        const pulse = 1 + Math.sin(time * 0.006) * 0.06;
        selectionRing.scale.setScalar(Math.max(0.42, Math.min(0.95, distance * 0.045)) * pulse);
    }

    function focusSatellite(sat) {
        if (!sat || !sat.visible) return;
        focusPosition(sat.position);
    }

    function focusPosition(position) {
        if (!position) return;
        const direction = position.clone().normalize();
        const distance = Math.max(7.0, Math.min(15.5, position.length() + 5.0));
        camera.position.copy(direction.multiplyScalar(distance));
        controls.target.set(0, 0, 0);
        controls.update();
    }

    function resetView() {
        camera.position.set(0.55, 2.35, 8.1);
        controls.target.set(0, 0, 0);
        controls.update();
    }

    function showAircraftView() {
        layers.satellites = false;
        layers.labels = false;
        layers.clouds = true;
        layers.aircraft = true;
        els.satellitesToggle.checked = false;
        els.labelsToggle.checked = false;
        els.labelsToggle.disabled = true;
        els.cloudsToggle.checked = true;
        els.aircraftToggle.checked = true;
        if (clouds) clouds.visible = true;
        if (aircraftPoints) aircraftPoints.visible = true;
        if (!aircraft.length) loadAircraftFeed(true);
        updateSatellitePositions(true);
        updateLabels();
        clearSelection();
        camera.position.set(-0.8, 3.0, 7.7);
        controls.target.set(0, 0, 0);
        controls.update();
        els.cloudStatus.textContent = "Clouds: " + cloudSource;
        els.aircraftStatus.textContent = aircraftStatusText();
    }

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function loadTexture(url, onLoad) {
        textureLoader.load(url, onLoad, undefined, () => {
            console.warn("Texture failed to load:", url);
        });
    }

    function createFallbackEarthTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height);
        ocean.addColorStop(0, "#173d70");
        ocean.addColorStop(0.5, "#0b2b52");
        ocean.addColorStop(1, "#06182f");
        ctx.fillStyle = ocean;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawLand(ctx, [[-168, 69], [-140, 72], [-106, 61], [-73, 51], [-57, 27], [-82, 14], [-100, 19], [-117, 33], [-132, 48], [-160, 56]], "#285f3b");
        drawLand(ctx, [[-81, 13], [-66, 8], [-52, -5], [-45, -23], [-58, -52], [-72, -56], [-79, -36], [-86, -13]], "#25623b");
        drawLand(ctx, [[-18, 35], [9, 37], [34, 31], [51, 11], [44, -24], [28, -35], [10, -32], [-6, -10], [-15, 15]], "#2d6338");
        drawLand(ctx, [[-10, 58], [31, 66], [83, 58], [130, 46], [152, 23], [121, 8], [76, 18], [40, 28], [8, 44]], "#315f3a");
        drawLand(ctx, [[112, -12], [153, -17], [149, -37], [119, -43], [108, -28]], "#876d38");
        drawLand(ctx, [[-52, 78], [-22, 75], [-18, 62], [-45, 59]], "#e6eef4");
        drawLand(ctx, [[-180, -65], [-90, -72], [0, -68], [90, -73], [180, -66], [180, -90], [-180, -90]], "#edf5f8");

        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 160; i += 1) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const w = 18 + Math.random() * 70;
            const h = 3 + Math.random() * 12;
            ctx.beginPath();
            ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return texture;
    }

    function createFallbackCloudTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 260; i += 1) {
            const alpha = 0.07 + Math.random() * 0.1;
            ctx.fillStyle = "rgba(255,255,255," + alpha.toFixed(3) + ")";
            ctx.beginPath();
            ctx.ellipse(Math.random() * canvas.width, Math.random() * canvas.height, 25 + Math.random() * 85, 4 + Math.random() * 18, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return texture;
    }

    function createPointTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(0.35, "rgba(255,255,255,0.95)");
        gradient.addColorStop(0.7, "rgba(255,255,255,0.28)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }

    function createAircraftTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 96;
        canvas.height = 96;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, 96, 96);

        const glow = ctx.createRadialGradient(48, 48, 0, 48, 48, 42);
        glow.addColorStop(0, "rgba(255, 214, 128, 0.92)");
        glow.addColorStop(0.44, "rgba(255, 160, 64, 0.34)");
        glow.addColorStop(1, "rgba(255, 160, 64, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 96, 96);

        ctx.save();
        ctx.translate(48, 48);
        ctx.fillStyle = "rgba(255, 236, 177, 0.96)";
        ctx.strokeStyle = "rgba(255, 153, 49, 0.95)";
        ctx.lineWidth = 5;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(13, 6);
        ctx.lineTo(32, 18);
        ctx.lineTo(6, 20);
        ctx.lineTo(0, 34);
        ctx.lineTo(-6, 20);
        ctx.lineTo(-32, 18);
        ctx.lineTo(-13, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return texture;
    }

    function drawLand(ctx, coords, color) {
        ctx.beginPath();
        coords.forEach(([lon, lat], index) => {
            const x = ((lon + 180) / 360) * ctx.canvas.width;
            const y = ((90 - lat) / 180) * ctx.canvas.height;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    function writeLatLonVector(vector, latDeg, lonDeg, radius) {
        const lat = THREE.MathUtils.degToRad(latDeg);
        const lon = THREE.MathUtils.degToRad(lonDeg);
        const cosLat = Math.cos(lat);
        vector.set(
            radius * cosLat * Math.cos(lon),
            radius * Math.sin(lat),
            -radius * cosLat * Math.sin(lon)
        );
    }

    function altitudeToVisualRadius(altKm) {
        const safeAlt = Math.max(0, Math.min(65000, Number.isFinite(altKm) ? altKm : 0));
        return EARTH_RADIUS + 0.09 + EARTH_RADIUS * (safeAlt / EARTH_KM) * 0.38;
    }

    function aircraftAltitudeToRadius(altitudeMeters) {
        const safeAltitude = Math.max(0, Math.min(14000, Number.isFinite(altitudeMeters) ? altitudeMeters : 0));
        return EARTH_RADIUS + 0.035 + safeAltitude / 14000 * 0.085;
    }

    function classifyOrbit(altKm, meanMotion) {
        if (Number.isFinite(altKm)) {
            if (altKm < 2000) return "LEO";
            if (altKm < 32000) return "MEO";
            if (altKm < 43000) return "GEO";
            return "HEO";
        }
        if (Number.isFinite(meanMotion) && meanMotion < 2) return "GEO";
        return "LEO";
    }

    function isOccludedByEarth(target) {
        const toTarget = target.clone().sub(camera.position);
        const length = toTarget.length();
        if (length <= 0) return false;
        const direction = toTarget.multiplyScalar(1 / length);
        const closest = -camera.position.dot(direction);
        if (closest <= 0 || closest >= length) return false;
        const closestDistanceSq = camera.position.lengthSq() - closest * closest;
        return closestDistanceSq < Math.pow(EARTH_RADIUS * 1.01, 2);
    }

    function notableByName(name) {
        const upper = name.toUpperCase();
        return Object.values(NOTABLE).find(meta => meta.match.some(token => upper.includes(token))) || null;
    }

    function cleanName(name) {
        return name.replace(/^0\s+/, "").replace(/\s+/g, " ").trim();
    }

    function numberFromTle(line, start, end) {
        const value = Number(line.slice(start, end).trim());
        return Number.isFinite(value) ? value : NaN;
    }

    function parseTleEpoch(line1) {
        const year = Number(line1.slice(18, 20));
        const dayOfYear = Number(line1.slice(20, 32));
        if (!Number.isFinite(year) || !Number.isFinite(dayOfYear)) return null;
        const fullYear = year < 57 ? 2000 + year : 1900 + year;
        return new Date(Date.UTC(fullYear, 0, 1) + (dayOfYear - 1) * 86400000);
    }

    function formatClock(date) {
        return date.toISOString().slice(11, 19) + " UTC";
    }

    function formatLatitude(value) {
        return Math.abs(value).toFixed(2) + " " + (value >= 0 ? "N" : "S");
    }

    function formatLongitude(value) {
        return Math.abs(value).toFixed(2) + " " + (value >= 0 ? "E" : "W");
    }

    function formatPeriod(meanMotion) {
        if (!Number.isFinite(meanMotion) || meanMotion <= 0) return "period unknown";
        return (1440 / meanMotion).toFixed(meanMotion < 2 ? 1 : 0) + " min period";
    }

    function formatTleAge(epochDate) {
        const days = (Date.now() - epochDate.getTime()) / 86400000;
        if (!Number.isFinite(days)) return "--";
        if (Math.abs(days) < 1) return Math.abs(days * 24).toFixed(1) + " hours";
        return Math.abs(days).toFixed(1) + " days";
    }

    function formatSecondsAgo(seconds) {
        if (!Number.isFinite(seconds)) return "--";
        if (seconds < 60) return Math.max(0, Math.round(seconds)) + " sec";
        if (seconds < 3600) return Math.round(seconds / 60) + " min";
        return (seconds / 3600).toFixed(1) + " hr";
    }

    function aircraftStatusText(source) {
        if (!layers.aircraft) return "Aircraft: hidden";
        if (!aircraft.length) return "Aircraft: loading";
        const mode = source && source.toLowerCase().includes("sample") ? " sample" : source ? " live" : "";
        return "Aircraft: " + aircraft.length.toLocaleString() + mode;
    }

    function setFeedStatus(message) {
        els.feedStatus.textContent = message;
    }

    function showFatal(message) {
        const wrapper = document.createElement("div");
        wrapper.className = "fatal";
        const box = document.createElement("div");
        const title = document.createElement("h1");
        const text = document.createElement("p");
        title.textContent = "Satellite Earth could not start";
        text.textContent = message;
        box.append(title, text);
        wrapper.appendChild(box);
        document.body.appendChild(wrapper);
    }

    window.addEventListener("beforeunload", () => {
        if (feedRefreshTimer) window.clearInterval(feedRefreshTimer);
    });
})();
