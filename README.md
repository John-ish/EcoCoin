# EcoCoin: Smart College Waste-Management Platform
### Powered by Computer Vision (Ultralytics YOLO) & Campus Digital Twin

EcoCoin is an enterprise-grade campus sustainability and waste-management web application. The platform rewards college students with digital points (**EcoCoins**) for correctly depositing recyclable materials into designated smart campus bins.

EcoCoins can be redeemed across campus for dining vouchers, library print credits, university bookstore coupons, and sustainable merchandise.

---

## 🌟 Key Features

1. **Tamper-Proof EcoCoin Ledger**:
   - Students cannot directly modify their balances.
   - All balance changes are executed atomically through PostgreSQL Row Level Security (RLS) and stored procedures (`award_deposit_coins` and `redeem_reward_voucher`).
   - Every coin movement generates an immutable, double-entry audit record in the `transactions` ledger with reference IDs and resulting balance snapshots.

2. **Computer Vision Waste Classification (FastAPI + YOLO)**:
   - Evaluates uploaded images and camera captures of waste items.
   - Detects materials across campus streams: **plastic, paper, metal, glass, organic, general waste**.
   - Generates annotated bounding-box visual overlays and confidence scores.
   - **Proof-of-Deposit Policy**: Scanning a bin QR code alone confirms location and capability, but does not award points. Coins are only credited upon Computer Vision validation or staff manual review.
   - **Quarantine Protocol**: Low-confidence predictions ($< 80\%$) or stream mismatches (e.g., plastic bottle dropped in paper bin) enter a `NEEDS_STAFF_REVIEW` quarantine state. Zero coins are awarded until staff approval.

3. **Campus Digital Twin (2D GIS & 3D Isometric)**:
   - **2D GIS Map (Leaflet)**: Live geolocation of campus bins across zones (North Quad, Central Quad, Student Life, Science Quad, Residential Village, Athletics).
   - **3D Isometric Campus (Three.js)**: 3D topographical campus visualization with rotatable camera, campus architecture, and real-time fill beacon columns scaling and color-shifting dynamically.
   - **IoT Telemetry Simulation**: Real-time simulation of ultrasonic fill sensors, battery levels, maintenance status, and collection flushes.

4. **Campus Rewards & Voucher Store**:
   - Redeem EcoCoins for verified campus vouchers (50% off espresso, 50 free printing pages, 20% bookstore vouchers, reusable insulated bottles, campus e-bike passes).
   - Generates unique voucher codes (`ECO-XXXX-XXXX`) with 30-day expirations and stock control.

5. **Student & Department Clash Leaderboard**:
   - Individual recycler podiums (1st, 2nd, 3rd) with active streak tracking.
   - Inter-departmental clash ranking (Computer Science vs Mechanical Eng vs Environmental Sciences vs Biotech).

6. **Staff & Administrator Portal**:
   - Verification review queue with side-by-side photo inspection, AI bounding box preview, and approve/reject controls.
   - Smart bin fleet manager and fill alert monitor.
   - Incentive reward policy matrix configurator.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on v22.18)
- **Python**: 3.10+ (tested on 3.13)
- **Supabase Account**: (Optional for live DB; built-in mock mode works 100% out of the box)

---

### Step 1: Start the Frontend (React + Vite + Tailwind CSS)

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at: **http://localhost:5173**

> **Note on Data Mode**: Out of the box, EcoCoin operates in **Mock Mode** with rich, reactive sample data stored locally in your browser. All transactions, deposits, bin fill updates, and voucher redemptions work immediately without needing an active database connection.

---

### Step 2: Start the Computer Vision & Telemetry Backend (FastAPI)

In a separate terminal:

```bash
cd backend
python -m pip install -r requirements.txt
python main.py
```

The FastAPI service will run at: **http://127.0.0.1:8000**
- Interactive Swagger API docs: **http://127.0.0.1:8000/docs**
- Automated Test Suite:
  ```bash
  python test_cv.py
  ```

---

### Step 3: Connect Supabase (Optional for Production)

EcoCoin is pre-configured with a PostgreSQL DDL schema and Row Level Security policies:

1. Create a free project on [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Run the schema script located at:
   - `database/schema.sql` (Creates tables, RLS policies, indexes, and stored procedures)
   - `database/seed.sql` (Inserts campus departments, initial bins, and voucher rewards)
4. Create a `.env` file in `frontend/`:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   ```
5. Restart `npm run dev`. EcoCoin will detect the credentials and switch from Mock Mode to **Supabase Live Mode**.

---

## 🔒 Security Architecture

| Vector | Safeguard |
| :--- | :--- |
| **Balance Tampering** | RLS prevents clients from updating `profiles.balance`. Updates occur exclusively via stored procedures (`award_deposit_coins`, `redeem_reward_voucher`). |
| **Secret Leaks** | Only `anon` public key is exposed on the frontend. `service_role` keys are strictly restricted to backend services. |
| **Spoofed Deposits** | QR scanning confirms bin coordinates but never awards coins. Submissions require Computer Vision image validation. |
| **Contamination / Errors** | Submissions with confidence $< 80\%$ or stream mismatches are held in `NEEDS_STAFF_REVIEW` queue. |
| **Financial Auditability** | Every coin earned or spent creates an auditable record in `transactions` with `balance_after` snapshots. |

---

## 📁 Repository Structure

```
codeclash2/
├── backend/
│   ├── main.py              # FastAPI application & endpoints
│   ├── vision.py            # Ultralytics YOLO & Hybrid Vision Classifier
│   ├── verification.py      # Verification rules & reward matrix engine
│   ├── test_cv.py           # Vision & verification test suite
│   └── requirements.txt     # Python dependencies
├── database/
│   ├── schema.sql           # PostgreSQL DDL with RLS & Stored Procedures
│   └── seed.sql             # Campus departments, smart bins, and reward catalog
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx              # Top navigation & persona switcher
│   │   │   ├── DashboardView.tsx       # Student dashboard & impact stats
│   │   │   ├── DepositView.tsx         # QR scanning & waste photo CV pipeline
│   │   │   ├── DigitalTwinView.tsx     # 2D GIS Leaflet map & bin manager
│   │   │   ├── ThreeCampusTwin.tsx     # 3D Three.js isometric campus twin
│   │   │   ├── LedgerView.tsx          # Auditable transaction ledger & CSV export
│   │   │   ├── RewardsView.tsx         # Campus vouchers catalog & redemptions
│   │   │   ├── LeaderboardView.tsx     # Student & department rankings
│   │   │   ├── AdminDashboardView.tsx  # Staff review queue & bin fleet manager
│   │   │   └── SupabaseGuideModal.tsx  # In-app setup modal
│   │   ├── services/
│   │   │   ├── api.ts                  # Unified repository service
│   │   │   ├── mockData.ts             # Comprehensive seed store
│   │   │   └── supabaseClient.ts       # Supabase client adapter
│   │   ├── types/index.ts              # TypeScript domain types
│   │   ├── App.tsx                     # Main application container
│   │   └── main.tsx                    # React DOM entry point
│   ├── package.json
│   └── vite.config.ts
└── docs/
    └── PROJECT_PLAN.md      # System architecture & database specification
```
