# Running eRTMAC-NWIS

NWIS is a Next.js frontend (`nwis/`) and a Node/Express backend (`backend/`) that use MySQL and Qdrant in Docker.
All data is a synthetic Upper Assam dataset: 40 offset wells, 2 live wells, about 140 recorded drilling problems.

## Prerequisites
- Node.js 20+
- Docker Desktop, running
- Internet on first run: the embedding model (~90 MB), fonts and map tiles are downloaded once

## 1. Databases
```bash
docker compose up -d
```
MySQL is exposed on **port 3307** (3306 is often taken by a local MySQL install) and Qdrant on 6333.

## 2. Backend
```bash
cd backend
npm install
cp .env.example .env        # then set JWT_SECRET, and GROQ_API_KEY if you have one
npm run setup               # schema → synthetic seed → local embeddings into Qdrant → sample PDFs
npm run dev                 # http://localhost:5000/api
```
`GROQ_API_KEY` is optional. Without it, report extraction uses the offline rules engine and
Knowledge shows matching records instead of a written answer. Get a key at https://console.groq.com/keys.

## 3. Frontend
```bash
cd nwis
npm install
npm run dev                 # http://localhost:3000
```
Set `NEXT_PUBLIC_API_URL` in `nwis/.env.local` if the backend is not on `http://localhost:5000`.

Sign in as **rahul.sharma@nwis.com / engineer1234** (engineer) or **admin@nwis.com / admin1234**.

## Demo script (about 5 minutes)
1. **Live well** (NHK-47): press **Start replay** at 240×. The depth track shows offset hazard zones ahead of the bit.
   A look-ahead alert fires about 120 m before the lower-Tipam loss zone, with the offset evidence and what worked before.
   Flow-out then drops and the pits fall, raising a live mud-loss alert. Carry on to the Barail Coal-Shale:
   there is another look-ahead, then torque climbs, overpull shows on connections, and a live stuck-pipe alert fires.
2. **Offset map**: change the radius; deviated wells are drawn along their real paths, with distance measured at the formation.
3. **Correlation**: pick offsets and switch to “Tipam → Barail” to see where the problems sit relative to the tops.
4. **Reports**: upload `backend/sample-reports/WCR_NHK-38_sample.pdf`, pick a well, then confirm the extracted events.
   They feed the hazard profile immediately.
5. **Knowledge**: ask “What cured losses in the lower Tipam near this well?”
6. **Insights**: the formation × problem heatmap and mitigation success rates.

Switch to **HGR-22** in the well switcher for the Kopili overpressure → kick scenario.

## Resetting between demos
```bash
cd backend
npm run demo:reset          # removes alerts, replay samples and uploaded reports; keeps the seeded history
```
Then restart the backend, or press **Reset** on the Live well page.
