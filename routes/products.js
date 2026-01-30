//GET    /api/products        → список товаров
//GET    /api/products/:id    → один товар
//POST   /api/products        → создать товар
const express = require("express");
require("dotenv").config();
const app = express();
app.use(express.json());
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const { MongoClient, ObjectId } = require("mongodb");
const clientPromise = MongoClient.connect(process.env.DB_URI);
const router = express.Router();
router.use(async (req, res, next) => {
  try {
    const client = await clientPromise;
    req.db = client.db("users"); // теперь у всех запросов в поле db - бд монго
    next();
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res) => {
  try {
    const products = await req.db.collection("products").find().toArray();
    res.json(products);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const product = await req.db
      .collection("products")
      .findOne({ _id: new ObjectId(id) });
    if (!product) {
      res.status(404).send("Пользователя с таким id не существует");
    }
    res.json(product);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.post("/", async (req, res) => {
  console.log("Тело запроса:", req.body);
  const { name, price, description } = req.body;
  console.log(name, price, description);
  try {
    const insertData = {};
    insertData.name = name.trim();
    insertData.price = parseFloat(price);
    insertData.description = description ? description.trim() : null;

    console.log("Данные для вставки:", insertData);
    await req.db.collection("products").insertOne(insertData);
    res.status(201).json({
      message: "Продукт успешно создан",
      product: { name, price, description },
    });
  } catch (e) {
    res.status(400).send(e.message);
  }
});

module.exports = router;
