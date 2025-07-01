// db.js
import pkg from 'pg';
const { Pool } = pkg;

// PostgreSQL connection config
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'product_db',
  password: '123gerson456',
  port: 5432, // default PostgreSQL port
});

export { pool }; // 



//sql


CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    product TEXT NOT NULL,
    price NUMERIC NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0
);
