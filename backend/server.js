const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Configuração do banco Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Rota de teste
app.get('/api/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ message: 'Backend funcionando!', time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// MOVA TODAS AS ROTAS PARA AQUI (ANTES DO app.listen)
// Buscar postos próximos
app.get('/api/gas-stations', async (req, res) => {
    const { lat, lng, radius = 5 } = req.query;

    try {
        const query = `
      SELECT *, 
      (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * 
       cos(radians(longitude) - radians($2)) + sin(radians($1)) * 
       sin(radians(latitude)))) AS distance
      FROM gas_stations 
      WHERE (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * 
             cos(radians(longitude) - radians($2)) + sin(radians($1)) * 
             sin(radians(latitude)))) < $3
      ORDER BY distance;
    `;

        const result = await pool.query(query, [lat, lng, radius]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Adicionar novo posto
app.post('/api/gas-stations', async (req, res) => {
    const { name, address, latitude, longitude } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO gas_stations (name, address, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, address, latitude, longitude]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Buscar preços de um posto
app.get('/api/gas-stations/:id/prices', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM prices 
       WHERE gas_station_id = $1 
       ORDER BY reported_at DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Adicionar preço com validações
app.post('/api/prices', async (req, res) => {
    const { gas_station_id, fuel_type, price } = req.body;

    // Validações
    const errors = [];

    // Preço deve ser número positivo
    if (!price || isNaN(price) || price <= 0) {
        errors.push('Preço deve ser um número positivo');
    }

    // Faixas de preços válidos (em reais)
    const priceRanges = {
        'gasolina_comum': { min: 4.50, max: 8.00 },
        'gasolina_aditivada': { min: 4.80, max: 8.50 },
        'etanol': { min: 2.50, max: 6.00 },
        'diesel': { min: 4.00, max: 7.50 }
    };

    const range = priceRanges[fuel_type];
    if (range && (price < range.min || price > range.max)) {
        errors.push(`Preço para ${fuel_type} deve estar entre R$ ${range.min.toFixed(2)} e R$ ${range.max.toFixed(2)}`);
    }

    // Tipos de combustível válidos
    const validFuelTypes = ['gasolina_comum', 'gasolina_aditivada', 'etanol', 'diesel'];
    if (!validFuelTypes.includes(fuel_type)) {
        errors.push('Tipo de combustível inválido');
    }

    // Se houver erros, retornar
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    try {
        const result = await pool.query(
            'INSERT INTO prices (gas_station_id, fuel_type, price) VALUES ($1, $2, $3) RETURNING *',
            [gas_station_id, fuel_type, price]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro SQL:', err);
        res.status(500).json({ error: err.message });
    }
});

// Buscar últimos preços de um posto
app.get('/api/gas-stations/:id/latest-prices', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT DISTINCT ON (fuel_type) fuel_type, price, reported_at
       FROM prices 
       WHERE gas_station_id = $1 
       ORDER BY fuel_type, reported_at DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ESTE DEVE SER O ÚLTIMO
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});