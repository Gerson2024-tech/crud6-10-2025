import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js"; // database connection

const app = express();
const port = 5555;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Handle Inventory Form (Add new product with quantity)
app.post("/", async (req, res) => {
   const { product, price, quantity } = req.body;

   if (!product || !price || !quantity) {
      return res.status(400).json({ error: "Product, price, and quantity are required." });
   }

   try {
      const query = "INSERT INTO products (product, price, quantity) VALUES ($1, $2, $3) RETURNING *";
      const values = [product, price, quantity];
      const result = await pool.query(query, values);
      res.status(201).json(result.rows[0]);
   } catch (error) {
      console.error("Database insert error:", error);
      res.status(500).json({ error: "Failed to add product." });
   }
});

// ✅ Get all products for inventory and POS
app.get("/products", async (req, res) => {
   try {
      const result = await pool.query("SELECT * FROM products ORDER BY id DESC");
      res.json(result.rows);
   } catch (error) {
      console.error("Database fetch error:", error);
      res.status(500).json({ error: "Failed to fetch products." });
   }
});


// ✅ Handle inventory deduction ig sell
app.post("/sell", async (req, res) => {
   const { product, quantity } = req.body;

   if (!product || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Invalid product or quantity." });
   }

   try {
      // Check current stock
      const checkQuery = "SELECT quantity FROM products WHERE product = $1";
      const checkResult = await pool.query(checkQuery, [product]);

      if (checkResult.rows.length === 0) {
         return res.status(404).json({ success: false, message: "Product not found." });
      }

      const currentQty = checkResult.rows[0].quantity;

      if (currentQty < quantity) {
         return res.status(400).json({ success: false, message: "Insufficient stock." });
      }

      // Deduct quantity
      const updateQuery = "UPDATE products SET quantity = quantity - $1 WHERE product = $2";
      await pool.query(updateQuery, [quantity, product]);

      res.json({ success: true, message: "Inventory updated." });
   } catch (error) {
      console.error("Inventory deduction error:", error);
      res.status(500).json({ success: false, message: "Server error during inventory update." });
   }
});

//DELETE EDIT START

// ✅ Delete a product
app.delete("/product/:product", async (req, res) => {
   const { product } = req.params;

   try {
      const result = await pool.query("DELETE FROM products WHERE product = $1", [product]);
      if (result.rowCount === 0) {
         return res.status(404).json({ success: false, message: "Product not found." });
      }
      res.json({ success: true, message: "Product deleted." });
   } catch (err) {
      console.error("Delete error:", err);
      res.status(500).json({ success: false, message: "Server error deleting product." });
   }
});

// ✅ Edit a product (price and quantity)
app.put("/product/:product", async (req, res) => {
   const { product } = req.params;
   const { price, quantity } = req.body;

   if (!price || !quantity || price <= 0 || quantity < 0) {
      return res.status(400).json({ success: false, message: "Invalid price or quantity." });
   }

   try {
      const result = await pool.query(
         "UPDATE products SET price = $1, quantity = $2 WHERE product = $3",
         [price, quantity, product]
      );

      if (result.rowCount === 0) {
         return res.status(404).json({ success: false, message: "Product not found." });
      }

      res.json({ success: true, message: "Product updated." });
   } catch (err) {
      console.error("Update error:", err);
      res.status(500).json({ success: false, message: "Server error updating product." });
   }
});


//DELETE EDIT END


// Serve static files (HTML, JS, CSS)
app.use(express.static(path.join(__dirname, "../public")));

// Start server
app.listen(port, () => {
   console.log(`Server running at http://localhost:${port}`);
});
