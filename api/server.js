require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors()); //allowing site to call API


const pool = new Pool({
	host: process.env.PGHOST || 'localhost',
	port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
	database: process.env.PGDATABASE || 'aw_assets',
	user: process.env.PGUSER || 'postgres',
	password: process.env.PGPASSWORD
});


// health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// GET /api/assets?bbox=minLon,minLat,maxLon,maxLat
app.get('/api/assets', async (req, res) => {
	try {
		const bbox = (req.query.bbox || '').split(',').map(Number);
		if (bbox.length !== 4 || bbox.some(v => Number.isNaN(v))) {
			return res.status(400).json({ error: 'Invalid bbox. Use minLon,minLat,maxLon,maxLat' });
		}
		const [minLon, minLat, maxLon, maxLat] = bbox;

		// Geom is GEOGRAPHY(POINT,4326); cast to geography for bbox tests
		const sql = `
			WITH b AS (SELECT ST_MakeEnvelope($1,$2,$3,$4,4326)::geometry AS g)
			
			SELECT
			location_id,
			location_name,
			location_type,
			location_address,
			ST_AsGeoJSON(geom::geometry)::json AS geometry
			FROM asset_details, b
			WHERE ST_Intersects(geom::geometry, b.g)
			LIMIT 5000;
		`;
		
		const { rows } = await pool.query(sql, [minLon, minLat, maxLon, maxLat]);

		const fc = {
	        	type: "FeatureCollection",
			features: rows.map(r => ({
				type: "Feature",
				geometry: r.geometry,
				properties: {
					location_id: r.location_id,
					location_name: r.location_name,
					location_type: r.location_type,
					location_address: r.location_address || ''
				}
			}))
		};
		res.setHeader('Content-Type', 'application/json');
		res.json(fc);
	} catch (e) {
		console.error(e);
		res.status(500).json({ error: 'Server error' });
	}
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API listening on :${port}`));



