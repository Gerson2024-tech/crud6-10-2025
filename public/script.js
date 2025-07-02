const productForm = document.getElementById("productForm");
const productInput = document.getElementById("product");
const priceInput = document.getElementById("price");
const productList = document.getElementById("productList");
const posForm = document.getElementById("posForm");
const cashInput = document.getElementById("cash");
const addProductBtn = document.getElementById("addProductBtn");
const sellProductList = document.getElementById("sellProductList");
const posSellBtn = document.getElementById("posSellBtn");
const totalChange = document.getElementById("totalChange");
const totalPrice = document.getElementById("totalPrice");
const quantityInput = document.getElementById("quantity");
const inventoryQuantityInput = document.getElementById("inventoryProductQuantity");
const productSelect = document.getElementById("productSelect");

// Handle inventory form submission
productForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const product = productInput.value.trim();
    const price = parseFloat(priceInput.value);
    const quantity = parseFloat(inventoryQuantityInput.value);

    if (!product) return alert("Please enter product name.");
    if (isNaN(price) || price <= 0) return alert("Please enter a valid price.");
    if (isNaN(quantity) || quantity <= 0) return alert("Please enter a valid quantity (at least 1).");

    const response = await fetch("/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ product, price, quantity }),
    });

    if (response.ok) {
        productInput.value = "";
        priceInput.value = "";
        inventoryQuantityInput.value = "";
        loadProducts();
        posLoadProduct();
    }
});

// Load product list
async function loadProducts() {
    const response = await fetch("/products");
    const products = await response.json();

    productList.innerHTML = "";

    products.forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = `
        ${item.product} - ₱${item.price} - ${item.quantity}
        <button onclick="editProduct('${item.product}')">Edit</button>
        <button onclick="deleteProduct('${item.product}')">Delete</button>
        `;
        productList.appendChild(li);
    });
}
loadProducts();

// Load products into POS dropdown
async function posLoadProduct() {
    const response = await fetch("/products");
    const products = await response.json();

    productSelect.innerHTML = '<option value="">--SELECT PRODUCT--</option>';

    products.forEach(item => {
        const option = document.createElement("option");
        option.value = item.product;
        option.textContent = `${item.product} - ₱${item.price} - ${item.quantity}`;
        productSelect.appendChild(option);
    });
}
posLoadProduct();

//delete edit START

async function deleteProduct(productName) {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) return;

    try {
        const response = await fetch(`/product/${encodeURIComponent(productName)}`, {
            method: "DELETE"
        });

        const data = await response.json();
        if (response.ok && data.success) {
            alert("Product deleted!");
            loadProducts();
            posLoadProduct();
        } else {
            alert(data.message || "Failed to delete.");
        }
    } catch (err) {
        console.error(err);
        alert("Server error while deleting product.");
    }
}

function editProduct(productName) {
    const newPrice = prompt("Enter new price:");
    const newQty = prompt("Enter new quantity:");

    const price = parseFloat(newPrice);
    const quantity = parseInt(newQty);

    if (isNaN(price) || price <= 0 || isNaN(quantity) || quantity < 0) {
        return alert("Invalid price or quantity.");
    }

    fetch(`/product/${encodeURIComponent(productName)}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ price, quantity })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            alert("Product updated!");
            loadProducts();
            posLoadProduct();
        } else {
            alert(data.message || "Failed to update.");
        }
    }).catch(err => {
        console.error(err);
        alert("Server error during update.");
    });
}


//delete edit ENDS

let remainingCash = null;
let totalPurchase = 0;

// Add product to sell list and deduct inventory
addProductBtn.addEventListener("click", async () => {
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const selectedValue = selectedOption.value;
    const text = selectedOption.textContent;

    if (!selectedValue) return alert("Please select a product.");

    const price = parseFloat(text.split("₱")[1]);

    let quantity = parseInt(quantityInput.value);
    if (isNaN(quantity) || quantity < 1) return alert("Enter valid quantity (min 1).");

    const totalItemPrice = price * quantity;

    if (remainingCash === null) {
        const inputCash = parseFloat(cashInput.value);
        if (isNaN(inputCash) || inputCash <= 0) return alert("Please enter valid initial cash.");
        remainingCash = inputCash;
    }

    if (remainingCash < totalItemPrice) {
        return alert("Kulangan ang cash, bai!");
    }

    // 🔽 Deduct inventory from server
    try {
        const res = await fetch("/sell", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ product: selectedValue, quantity }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            return alert(data.message || "Error deducting inventory.");
        }
    } catch (err) {
        console.error("Inventory update failed:", err);
        return alert("Server error while updating inventory.");
    }

    // Proceed with transaction
    remainingCash -= totalItemPrice;
    totalPurchase += totalItemPrice;

    const li = document.createElement("li");
    li.textContent = `${selectedValue} x${quantity} - ₱${totalItemPrice.toFixed(2)} | Remaining Cash: ₱${remainingCash.toFixed(2)}`;
    sellProductList.appendChild(li);

    cashInput.value = remainingCash.toFixed(2);
    totalPrice.textContent = `₱${totalPurchase.toFixed(2)}`;
    totalChange.textContent = `₱${remainingCash.toFixed(2)}`;

    quantityInput.value = "";

    // Refresh UI
    loadProducts();
    posLoadProduct();
});

// POS form submit with receipt printing
posForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // ✅ Ignore all inputs - focus only on existing sell list
    if (sellProductList.children.length === 0) {
        return alert("Walay items nga gi-sell!");
    }

    // ✅ Build the receipt
    let receiptWindow = window.open("", "", "width=400,height=600");
    receiptWindow.document.write("<html><head><title>Receipt</title></head><body>");
    receiptWindow.document.write("<h2>🧾 Sales Receipt</h2>");
    receiptWindow.document.write("<hr><ul>");

    Array.from(sellProductList.children).forEach((item) => {
        receiptWindow.document.write(`<li>${item.textContent}</li>`);
    });

    receiptWindow.document.write("</ul>");
    receiptWindow.document.write("<hr>");
    receiptWindow.document.write(`<p><strong>Total:</strong> ${totalPrice.textContent}</p>`);
    receiptWindow.document.write(`<p><strong>Change:</strong> ${totalChange.textContent}</p>`);
    receiptWindow.document.write("<p><em>Salamat sa pagpalit, bai!</em></p>");
    receiptWindow.document.write("</body></html>");
    receiptWindow.document.close();

    receiptWindow.onload = () => {
        receiptWindow.print();
    };

    // ✅ Reset POS form and UI (does not affect inventory)
    remainingCash = null;
    totalPurchase = 0;

    // Clear inputs and UI fields
    productSelect.selectedIndex = 0;
    quantityInput.value = "";
    cashInput.value = "";
    sellProductList.innerHTML = "";
    totalPrice.textContent = "";
    totalChange.textContent = "";
});
