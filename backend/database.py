"""SQLite database setup, seed data, and CRUD operations for Inventory Sentinel.
Hardware & Power Equipment Catalog with expanded 20-product dataset in Indian Rupees (₹).
"""

import sqlite3
import os
import json
from datetime import datetime, timedelta
import random

DB_PATH = os.path.join(os.path.dirname(__file__), "inventory.db")


def get_connection():
    """Get a SQLite connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(force_reseed=False):
    """Initialize database tables and seed data for the expanded hardware/power catalog."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sku TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL,
            order_id TEXT NOT NULL DEFAULT '#7676',
            price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'In Stock'
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            reviewer TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
    """)

    # Check if columns exist
    cursor.execute("PRAGMA table_info(products)")
    columns = [col[1] for col in cursor.fetchall()]
    if "order_id" not in columns:
        cursor.execute("ALTER TABLE products ADD COLUMN order_id TEXT NOT NULL DEFAULT '#7676'")
    if "status" not in columns:
        cursor.execute("ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'In Stock'")

    cursor.execute("SELECT COUNT(*) FROM products")
    product_count = cursor.fetchone()[0]

    # Re-seed if forced or if dataset is less than 30 items
    if force_reseed or product_count < 30:
        cursor.execute("DELETE FROM reviews")
        cursor.execute("DELETE FROM products")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('products', 'reviews')")
        _seed_data(cursor)

    conn.commit()
    conn.close()


def _seed_data(cursor):
    """Seed database with an expansive 30-product hardware/power catalog and 150+ reviews in Rupees."""

    # 30 Industrial & Consumer Hardware/Power Products in Indian Rupees (₹)
    products = [
        ("Inverter", "PWR-INV-001", "cat1", "#7676", 24999.0, 45, "In Stock"),
        ("Battery", "PWR-BAT-002", "cat2", "#7677", 16499.0, 120, "Restock Halted"),
        ("Generator", "PWR-GEN-003", "cat2", "#7678", 52999.0, 28, "Order Surge"),
        ("Charger", "PWR-CHG-004", "cat3", "#7679", 4299.0, 310, "In Stock"),
        ("Power", "PWR-SUP-005", "cat4", "#7680", 8499.0, 215, "In Stock"),
        ("Solar Panel 540W", "PWR-SOL-006", "cat1", "#7681", 17500.0, 85, "Order Surge"),
        ("Voltage Stabilizer 5kVA", "PWR-STB-007", "cat4", "#7682", 7200.0, 140, "In Stock"),
        ("Online UPS 3kVA", "PWR-UPS-008", "cat1", "#7683", 38999.0, 35, "Restock Halted"),
        ("Hybrid Solar Inverter 5kW", "PWR-HYB-009", "cat1", "#7684", 58000.0, 60, "Order Surge"),
        ("Tubular Deep-Cycle Battery 220Ah", "PWR-TUB-010", "cat2", "#7685", 19200.0, 95, "In Stock"),
        ("Dual-Fuel Portable Generator 3.5kW", "PWR-PGEN-011", "cat2", "#7686", 46500.0, 40, "In Stock"),
        ("MPPT Charge Controller 60A", "PWR-MPPT-012", "cat3", "#7687", 9800.0, 175, "In Stock"),
        ("Industrial Surge Protector SPD", "PWR-SPD-013", "cat4", "#7688", 3450.0, 420, "In Stock"),
        ("Automatic Transfer Switch ATS 100A", "PWR-ATS-014", "cat5", "#7689", 13900.0, 55, "In Stock"),
        ("Isolation Transformer 10kVA", "PWR-TRF-015", "cat5", "#7690", 79000.0, 18, "Low Stock"),
        ("Smart Bi-Directional Energy Meter", "PWR-MTR-016", "cat5", "#7691", 5100.0, 260, "In Stock"),
        ("EV Wallbox Fast Charger 22kW", "PWR-EVW-017", "cat3", "#7692", 48500.0, 50, "Order Surge"),
        ("Rackmount Intelligent PDU", "PWR-PDU-018", "cat4", "#7693", 11200.0, 130, "In Stock"),
        ("Diesel Standby Generator 15kVA", "PWR-DGN-019", "cat2", "#7694", 138000.0, 12, "Low Stock"),
        ("LiFePO4 Lithium Battery Pack 48V", "PWR-LFP-020", "cat2", "#7695", 74500.0, 70, "Order Surge"),
        ("Wind Turbine Grid-Tie Inverter 10kW", "PWR-WND-021", "cat1", "#7696", 112000.0, 15, "In Stock"),
        ("Supercapacitor Pulse Storage 48V", "PWR-CAP-022", "cat2", "#7697", 34500.0, 50, "Order Surge"),
        ("Industrial Frequency Converter 50/60Hz", "PWR-FRQ-023", "cat5", "#7698", 87000.0, 22, "In Stock"),
        ("Solar Microinverter 800W Dual", "PWR-MIC-024", "cat1", "#7699", 14800.0, 110, "Order Surge"),
        ("Heavy-Duty Battery Switch 500A", "PWR-DSW-025", "cat4", "#7700", 2850.0, 380, "In Stock"),
        ("Active Harmonic Filter 25kVAR", "PWR-HFL-026", "cat5", "#7701", 64000.0, 19, "In Stock"),
        ("Solar DC Combiner Box 6-String", "PWR-CMB-027", "cat1", "#7702", 6900.0, 160, "In Stock"),
        ("Telecom Rectifier Module 48V/50A", "PWR-RCT-028", "cat3", "#7703", 21500.0, 75, "In Stock"),
        ("Lead-Carbon Deep Cycle Battery 200Ah", "PWR-LCB-029", "cat2", "#7704", 23900.0, 85, "In Stock"),
        ("Three-Phase Power Quality Analyzer", "PWR-PQA-030", "cat5", "#7705", 42000.0, 30, "Order Surge"),
    ]

    for p in products:
        cursor.execute(
            "INSERT INTO products (name, sku, category, order_id, price, stock, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            p,
        )

    reviewers = [
        "rajesh_tech", "amit_sharma", "vikram_powersystems", "sunita_eng", "deepak_solar",
        "arun_contractor", "kavita_electrical", "manoj_backup", "neha_industrial", "suresh_grid",
        "priya_consultant", "anand_facilities", "rohit_testing", "meera_greenenergy", "siddharth_m",
        "harish_engineer", "pooja_operations", "tarun_gridguard", "swati_logistics", "karan_energy",
    ]

    # Detailed review corpus for all 20 products
    all_reviews_map = {
        1: [  # Inverter (cat1)
            "Pure sine wave output is clean and runs our sensitive lab electronics without any line distortion.",
            "Very solid 3000W inverter. Powers our workshop tools smoothly with zero voltage drop.",
            "Cooling fan is a bit noisy when drawing over 2000W continuous, but temperature stays under 50C.",
            "Installed in our solar backup setup. Seamless power transition during municipal grid cuts.",
            "High efficiency conversion rate. Measured 94% efficiency under steady half-load testing.",
            "Solid aluminium casing dissipates heat effectively. The remote monitoring display is accurate.",
            "Good protection circuitry. The low-voltage cutoff saved our battery bank from over-discharging.",
            "Reliable inverter for off-grid operations. Does the job consistently day in and day out.",
        ],
        2: [  # Battery (cat2) - HALT RESTOCK (High negative)
            "Severe capacity degradation after only 35 cycles. Cells will not balance above 70% state of charge.",
            "BMS unit cuts out prematurely under moderate 40A load. Defective internal thermal sensors.",
            "Battery completely failed to hold charge overnight in mild 12C ambient temperatures. Unacceptable.",
            "Severe cell swelling observed after two months of standard trickle charging. Safety hazard.",
            "Discharge curve drops off a cliff past 50% capacity. Terrible build quality on this production run.",
            "Internal resistance measured dangerously high across two cells. Returning for full warranty refund.",
            "Does not meet rated amp-hour specifications. Lab test showed only 62Ah on a supposedly 100Ah unit.",
            "One module arrived dead on arrival with zero terminal voltage. Quality control is nonexistent.",
        ],
        3: [  # Generator (cat2) - INCREASE ORDER (High positive)
            "Incredible fuel efficiency. Ran continuously for 16 hours on a single tank under 50% load.",
            "Electric start fired up on the very first try even in freezing winter conditions. Superb engineering.",
            "Extremely quiet inverter generator. You can stand next to it and hold a normal conversation.",
            "Dual-fuel capability works flawlessly between gasoline and propane without sputtering.",
            "Clean THD under 2.5%, safely powering sensitive IT server racks during emergency outages.",
            "Heavy duty build quality, durable wheels, and comfortable folding pull handle. A masterclass.",
            "Best backup generator in its class. Worth every rupee for residential and commercial resilience.",
            "Low oil automatic shutdown prevented disaster when a hose loosened. Fantastic safety logic.",
        ],
        4: [  # Charger (cat3)
            "Multi-stage smart charging algorithm revived our depleted deep-cycle banks quickly.",
            "Compact footprint and stays pleasantly cool thanks to the internal active thermal vent.",
            "Clear digital status readout showing charging stage, current amperage, and terminal voltage.",
            "Solid charger for everyday workshop use. Reliable clamps with heavy-gauge insulation.",
            "Charges lead-acid and lithium chemistry profiles accurately. Mode selector is straightforward.",
            "Good value charger that delivers steady 25A current without thermal throttling.",
        ],
        5: [  # Power (cat4)
            "Clean isolated power supply that eliminated all ground loop hum in our testing setup.",
            "Heavy duty surge suppression clamped a municipal spike without damaging downstream units.",
            "Consistent voltage rails across all 12V and 24V terminal outputs. Exceptional regulation.",
            "Industrial grade chassis with DIN-rail mounting brackets included. Very convenient install.",
            "High MTBF rating shows in the component selection. Premium Japanese capacitors throughout.",
            "Tested under 100% continuous load for 72 hours. Case remained warm but well within safe tolerance.",
        ],
        6: [  # Solar Panel 540W
            "Outstanding mono-PERC cell efficiency. Generates peak 535W even on slightly hazy afternoons.",
            "Heavy duty tempered glass and reinforced aluminium frame resisted severe hailstorms easily.",
            "Pre-wired with MC4 connectors that clicked securely into place. Clean voltage curves.",
            "Best price-to-wattage ratio on the market right now. Highly recommended for rooftop installations.",
            "Bypass diodes function perfectly with minimal partial shading losses.",
        ],
        7: [  # Voltage Stabilizer 5kVA
            "Digital micro-controller provides instantaneous voltage step correction during brownouts.",
            "Saved our high-end dental equipment during extreme voltage fluctuations.",
            "Relay click is audible but switching response time is under 15 milliseconds.",
            "Sturdy metal enclosure with clear LED input/output voltage display.",
        ],
        8: [  # Online UPS 3kVA - HALT RESTOCK (defective inverter board)
            "Inverter board blew a capacitor after only three weeks of clean server room deployment.",
            "Cooling fan is excessively loud, measuring over 68dB in an enclosed office rack.",
            "Battery backup transfer failed twice during scheduled grid maintenance, shutting down servers.",
            "Firmware update bricked the LCD interface. Customer support refused timely replacement.",
            "High idle power consumption of over 110W even when load is completely off.",
        ],
        9: [  # Hybrid Solar Inverter 5kW - INCREASE ORDER
            "The smart net-metering export works flawlessly with our state utility discom.",
            "Mobile app connectivity provides real-time solar yield, battery SOC, and grid draw charts.",
            "Pure sine wave output with parallel stacking capability up to 30kW. Excellent architecture.",
            "Seamless zero-millisecond transfer switch. Desktop computers never reboot during power cuts.",
            "Super efficient MPPT tracking handles dual PV string arrays with differing angles effortlessly.",
        ],
        10: [  # Tubular Deep-Cycle Battery 220Ah
            "Extremely heavy duty tall tubular plates. Water level indicators make maintenance simple.",
            "Provides reliable 6.5 hours of backup under full home inverter load.",
            "Acid fumes are minimal thanks to ceramic vent plugs.",
            "Excellent lifespan history across our residential installations.",
        ],
        11: [  # Dual-Fuel Portable Generator 3.5kW
            "Propane mode runs so clean with virtually zero exhaust smell and easy carburetor storage.",
            "Weighs only 42kg and fits comfortably into an SUV trunk for field assignments.",
            "Eco-throttle mode automatically dials down RPM during light tool usage.",
        ],
        12: [  # MPPT Charge Controller 60A
            "Tracks the maximum power point within seconds under dynamic cloud cover.",
            "Comprehensive LCD panel shows accumulated kWh generation and battery temperature compensation.",
            "Heavy heatsink keeps temperature below 45C even at full 60A charging current.",
        ],
        13: [  # Industrial Surge Protector SPD
            "Type-2 SPD with visual fault flag indicator. Snapped onto standard DIN rail in 30 seconds.",
            "High surge discharge rating of 40kA per phase provides immense peace of mind.",
            "Essential line protection for industrial control panels.",
        ],
        14: [  # Automatic Transfer Switch ATS 100A
            "Motorized interlock mechanism prevents any dangerous cross-feed between mains and generator.",
            "Auxiliary generator start contacts triggered our standby genset within 4 seconds of power loss.",
            "Robust silver-alloy contact points designed for thousands of transfer cycles.",
        ],
        15: [  # Isolation Transformer 10kVA
            "Galvanic isolation completely eliminated electro-magnetic interference on our audio gear.",
            "Copper winding quality is top tier with vacuum pressure impregnation.",
            "High thermal capacity handles inrush current from heavy industrial motors easily.",
        ],
        16: [  # Smart Bi-Directional Energy Meter
            "RS-485 Modbus interface allowed direct integration into our SCADA monitoring system.",
            "Tamper-proof optical port and high Class 1.0 measurement accuracy.",
            "Accurate import/export active and reactive energy logging.",
        ],
        17: [  # EV Wallbox Fast Charger 22kW - INCREASE ORDER
            "Charges our fleet vehicles at full 22kW three-phase speed. Cut turnaround time in half.",
            "Integrated RFID card authorization prevents unauthorized public charging.",
            "IP65 weatherproof enclosure has weathered monsoon rain with zero ingress.",
            "Dynamic load balancing prevents blowing the main facility transformer.",
        ],
        18: [  # Rackmount Intelligent PDU
            "Per-outlet power measurement and remote reboot capability saved multiple site visits.",
            "C13 and C19 lockable sockets prevent accidental cord pull-outs.",
            "Built-in web server with SNMPv3 alerts for over-current conditions.",
        ],
        19: [  # Diesel Standby Generator 15kVA
            "Liquid-cooled four-cylinder diesel engine runs with rock-solid torque.",
            "Acoustic canopy reduces sound to under 65 dBA at 7 meters.",
            "Massive 65-liter base fuel tank allows 24-hour non-stop emergency operations.",
        ],
        20: [  # LiFePO4 Lithium Battery Pack 48V - INCREASE ORDER
            "6000+ cycle life rating with integrated CAN/RS485 communication to our hybrid inverters.",
            "Wall-mountable compact form factor replaced four huge lead-acid batteries and saved valuable floor space.",
            "Built-in active cell balancer ensures all 16 cells stay within 5mV deviation.",
            "Charges to 100% in under 2 hours without heating up. Phenomenal modern energy storage.",
            "Zero maintenance, built-in display shows state of health and cell voltages.",
        ],
        21: [  # Wind Turbine Grid-Tie Inverter 10kW
            "Seamless integration with our 10kW horizontal-axis wind turbine. Dump load controller works reliably.",
            "Handles variable gust frequency inputs smoothly. Maximum power extraction curve is highly accurate.",
            "Rugged outdoor IP65 casing holds up to strong coastal winds and salt spray without corrosion.",
            "Grid-tie synchronization takes less than 2 seconds after hitting wind cut-in speeds.",
        ],
        22: [  # Supercapacitor Pulse Storage 48V - INCREASE ORDER
            "Rapid pulse discharge is mind-blowing. Absorbs 200A peak regenerative braking current without heating up.",
            "Rated for 1 million cycles and shows zero signs of capacity loss during heavy industrial cycling tests.",
            "Integrated active balancing circuit keeps ultra-capacitors perfectly leveled across all cells.",
            "Ideal for crane lift stabilization and peak shaving in automated manufacturing cells.",
        ],
        23: [  # Industrial Frequency Converter 50/60Hz
            "Converts 50Hz Indian grid power to 60Hz cleanly for our imported precision CNC milling machines.",
            "Voltage regulation is tighter than 1%. THD is well below 2% even under heavy inductive motor loads.",
            "Solid-state PWM IGBT design is whisper-quiet and vastly superior to old rotary motor-generator sets.",
        ],
        24: [  # Solar Microinverter 800W Dual - INCREASE ORDER
            "Dual MPPT channels maximize harvest on partially shaded complex residential rooftop planes.",
            "Plug-and-play installation cut rooftop wiring time by 40%. Built-in PLC communication works flawlessly.",
            "Operates at 96.5% CEC weighted efficiency. Much safer than running high-voltage DC lines through the attic.",
            "Great cloud monitoring app with per-panel yield metrics updated automatically every 5 minutes.",
        ],
        25: [  # Heavy-Duty Battery Switch 500A
            "Solid rotary switch with positive detent lock. Zero contact resistance measured under 400A continuous draw.",
            "Lockout-tagout (LOTO) hole accommodates standard safety padlocks for complete safety compliance.",
            "Vapor-tight ignition-protected design is completely safe for enclosed marine battery compartments.",
        ],
        26: [  # Active Harmonic Filter 25kVAR
            "Dramatically reduced total harmonic distortion on our VFD motor bus from 18% down to 3.2%.",
            "Power factor improved from 0.82 to 0.98, completely eliminating monthly power factor utility penalties.",
            "Tough metal enclosure with thermostatic forced-air cooling that maintains optimal IGBT temperature.",
        ],
        27: [  # Solar DC Combiner Box 6-String
            "Includes 1000V DC fuses, lightning surge arrester, and positive disconnect switch pre-wired neatly.",
            "Waterproof IP66 enclosure with strain-relief cable glands included made field termination quick and tidy.",
            "Transparent inspection window allows quick visual checks of fuse status without opening the panel.",
        ],
        28: [  # Telecom Rectifier Module 48V/50A
            "Hot-swappable module slotted right into our telecom DC power distribution shelf with zero downtime.",
            "Ultra-high 96% conversion efficiency keeps cooling requirements low in small base station shelters.",
            "Operates continuously through ambient temperatures up to 65C without thermal derating.",
        ],
        29: [  # Lead-Carbon Deep Cycle Battery 200Ah
            "Partial State of Charge (PSoC) performance is vastly better than conventional AGM batteries.",
            "No sulfation buildup even when operated in daily partial charge cycles for months.",
            "Gives us dependable 7-hour backup for critical security and telecom repeater towers.",
        ],
        30: [  # Three-Phase Power Quality Analyzer - INCREASE ORDER
            "Class A accuracy according to IEC 61000-4-30 standard. Captured transient sags and swells instantly.",
            "Web dashboard and Modbus TCP export make compliance reporting and power auditing effortless.",
            "High-resolution color screen displays phasor diagrams, harmonics spectrum, and phase unbalance ratios.",
            "Indispensable tool for our electrical audit team. Caught three critical grounding anomalies on day one.",
        ],
    }

    base_date = datetime(2026, 2, 1)

    for product_id, review_list in all_reviews_map.items():
        for review_text in review_list:
            reviewer = reviewers[random.randint(0, len(reviewers) - 1)]
            timestamp = (base_date + timedelta(days=random.randint(0, 180), hours=random.randint(0, 23))).isoformat()
            cursor.execute(
                "INSERT INTO reviews (product_id, reviewer, text, timestamp) VALUES (?, ?, ?, ?)",
                (product_id, reviewer, review_text, timestamp),
            )


# ── CRUD Operations ──────────────────────────────────────────────────────────


def get_all_products():
    """Return all products."""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM products ORDER BY id").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_product(product_id: int):
    """Return a single product by ID."""
    conn = get_connection()
    row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_product_by_name(name: str):
    """Return a product by exact or case-insensitive name match."""
    conn = get_connection()
    row = conn.execute("SELECT * FROM products WHERE LOWER(name) = LOWER(?)", (name.strip(),)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_reviews_for_product(product_id: int):
    """Return all reviews for a product."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM reviews WHERE product_id = ? ORDER BY timestamp DESC",
        (product_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_reviews():
    """Return all reviews."""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM reviews ORDER BY timestamp DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_review(product_id: int, reviewer: str, text: str) -> dict:
    """Add a new review to the database."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO reviews (product_id, reviewer, text, timestamp) VALUES (?, ?, ?, ?)",
        (product_id, reviewer, text, now),
    )
    review_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {
        "id": review_id,
        "product_id": product_id,
        "reviewer": reviewer,
        "text": text,
        "timestamp": now,
    }


def upload_products_csv(rows: list[dict]) -> int:
    """Insert or replace products from a list of dicts."""
    conn = get_connection()
    cursor = conn.cursor()
    count = 0
    for row in rows:
        cursor.execute(
            """
            INSERT INTO products (name, sku, category, order_id, price, stock, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(sku) DO UPDATE SET
                name=excluded.name,
                category=excluded.category,
                order_id=excluded.order_id,
                price=excluded.price,
                stock=excluded.stock,
                status=excluded.status
            """,
            (
                row["name"],
                row["sku"],
                row.get("category", "General"),
                row.get("order_id", f"#{random.randint(7676, 7999)}"),
                float(row["price"]),
                int(row["stock"]),
                row.get("status", "In Stock"),
            ),
        )
        count += 1
    conn.commit()
    conn.close()
    return count


def upload_reviews_csv(rows: list[dict]) -> int:
    """Insert reviews from a list of dicts."""
    conn = get_connection()
    cursor = conn.cursor()
    count = 0
    now = datetime.now().isoformat()
    for row in rows:
        cursor.execute(
            """
            INSERT INTO reviews (product_id, reviewer, text, timestamp)
            VALUES (?, ?, ?, ?)
            """,
            (
                int(row["product_id"]),
                row.get("reviewer", "anonymous"),
                row["text"],
                row.get("timestamp", now),
            ),
        )
        count += 1
    conn.commit()
    conn.close()
    return count


def sync_vendor_dataset(products: list[dict], reviews: list[dict]) -> dict:
    """Sync live store dataset from simulated vendor API into SQLite database."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()

    # 1. Update/Insert products
    for p in products:
        cursor.execute(
            """
            INSERT INTO products (name, sku, category, order_id, price, stock, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(sku) DO UPDATE SET
                stock = excluded.stock,
                price = excluded.price,
                status = excluded.status,
                order_id = excluded.order_id
            """,
            (
                p["name"],
                p["sku"],
                p.get("category", "cat1"),
                p.get("order_id", "#7676"),
                float(p["price"]),
                int(p["stock"]),
                p.get("status", "In Stock"),
            ),
        )

    # 2. Get mapping of product name -> id
    p_map = {}
    rows = cursor.execute("SELECT id, name FROM products").fetchall()
    for r in rows:
        p_map[r["name"].strip().lower()] = r["id"]

    # 3. For the vendor products, clean old reviews and insert new reviews
    synced_product_ids = set()
    for r in reviews:
        p_name = r.get("product_name", "").strip().lower()
        if p_name in p_map:
            synced_product_ids.add(p_map[p_name])

    for pid in synced_product_ids:
        cursor.execute("DELETE FROM reviews WHERE product_id = ?", (pid,))

    review_count = 0
    for r in reviews:
        p_name = r.get("product_name", "").strip().lower()
        pid = p_map.get(p_name) or r.get("product_id")
        if pid:
            cursor.execute(
                "INSERT INTO reviews (product_id, reviewer, text, timestamp) VALUES (?, ?, ?, ?)",
                (
                    pid,
                    r.get("reviewer", "verified_buyer"),
                    r["text"],
                    r.get("timestamp", now),
                ),
            )
            review_count += 1

    conn.commit()
    conn.close()
    return {
        "products_synced": len(products),
        "reviews_synced": review_count,
        "synced_product_ids": list(synced_product_ids),
    }
