//Server
const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cartsRoutes = require('./routes/carts');
const productsRoutes = require('./routes/products');
const Product = require('./models/productModel');
const Cart = require('./models/cartModel'); 
const connectToMongo = require('./config/mongo');
const helpers = require('handlebars-helpers')();

const app = express();
const PORT = 8080;

// Configuro Handlebars
app.engine('handlebars', engine({
    defaultLayout: 'main',
    helpers: helpers,
    extname: '.handlebars',
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Carpeta pública para archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Middleware para analizar datos JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta para carritos
app.use('/carts', cartsRoutes);

// Ruta de productos
app.use('/products', productsRoutes);

// Ruta para ver productos en tiempo real
app.get('/realtimeproducts', (req, res) => {
    res.render('realTimeProducts');
});

// Configuro el servidor HTTP y Socket.IO
const server = http.createServer(app);
const io = socketIo(server);

// Cargar productos y emitir a los clientes
async function loadProducts() {
    try {
        const products = await Product.find();
        io.emit('updateProducts', products);
    } catch (error) {
        console.error('Error al obtener productos:', error);
    }
}

// Manejo de conexión de Socket.IO
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');

    // para enviar los productos actuales al nuevo cliente
    loadProducts();

    // para manejar la adición de productos
    socket.on('addProduct', async (productData) => {
        try {
            const newProduct = new Product(productData);
            await newProduct.save();
            loadProducts();
        } catch (error) {
            console.error('Error al agregar producto:', error);
        }
    });

    // para manejar la eliminación de productos
    socket.on('deleteProduct', async (productId) => {
        try {
            await Product.findByIdAndDelete(productId);
            loadProducts();
        } catch (error) {
            console.error('Error al eliminar producto:', error);
        }
    });
});

// para iniciar el servidor
server.listen(8080, () => {
    console.log('Servidor en funcionamiento en http://localhost:8080');
});
