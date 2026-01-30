const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const { nanoid } = require("nanoid");
const cookie_parser = require("cookie-parser");

const app = express();
app.use(express.json());
app.use(cookie_parser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const { MongoClient, ObjectId } = require("mongodb");
const clientPromise = MongoClient.connect(process.env.DB_URI);
const router = express.Router();
router.use(async (req, res, next) => {
  try {
    const client = await clientPromise;
    req.db = client.db("users");
    next();
  } catch (err) {
    next(err);
  }
});

const getUserIdBySessionId = async (db, session_id) => {
  const session = await db.collection("sessions").findOne({ session_id });
  if (!session) {
    console.log("Сессия не найдена:", session_id);
    return null;
  }
  return session.user_id;
};
router.get("/profile", async (req, res) => {
  // 1. взяти куки с req
  // 2. получить user_id по куки
  // 2. select user (user_id) - инфа
  // кол-во заказов и общую сумму
  // 4.по user_id получить кол-во заказов в orders
  // 5. посчитать сумму (total_price)
  try {
    const session_id = req.cookies.session_id;
    if (!session_id) {
      res.status(401).send("Авторизуйтесь");
    }
    const user_id = await getUserIdBySessionId(req.db, session_id);
    const user = await req.db
      .collection("users")
      .findOne({ _id: new ObjectId(id) });
    if (!user) {
      res.status(401).send("Авторизуйтесь");
    }
    const orders = await req.db
      .collection("orders")
      .find({ _id: new ObjectId(user_id) })
      .toArray();
    let total = 0;
    let count = 0;
    for (const order of orders) {
      total += Number(order.total_price);
      count += 1;
    }
    res.status(200).json({
      "Имя пользователя": user.username,
      "Электронная почта": user.emai,
      "Количество заказов": count,
      "Общая сумма": total + " ₽",
    });
  } catch (e) {
    res.status(400).send(e.message);
  }
});
//findProductIdByName
router.post("/", async (req, res) => {
  try {
    const session_id = req.cookies.session_id;
    const user_id = await getUserIdBySessionId(req.db, session_id);
    console.log(user_id);
    if (!user_id) {
      res.status(401).send("Авторизуйтесь, чтобы сделать заказ");
      return;
    }
    let newOrder = {
      user_id: user_id,
      total_price: 0,
      status: "Created",
    };
    const order_res = await req.db.collection("orders").insertOne(newOrder);
    const order_id = order_res.insertedId;
    // получение id заказа
    // получение product_id, quantity
    const items = req.body.items;
    if (!Array.isArray(items) || items.length == 0) {
      res.status(400).send("Добавьте товары");
    }
    let total_price = 0;
    for (const item of items) {
      console.log(order_id);
      const { product_id, quantity } = item;
      const dataOrderItems = {
        order_id: order_id,
        product_id: product_id,
        quantity: quantity,
      };
      const product = await req.db
        .collection("products")
        .findOne({ _id: new ObjectId(product_id) });
      if (!product) {
        return res.status(404).json({ error: `Товар ${product_id} не найден` });
      }
      console.log("данные для вставки ", dataOrderItems);
      await req.db.collection("order_items").insertOne(dataOrderItems);
      total_price += product.price * quantity;
    }

    // update order with total_price
    await req.db
      .collection("orders")
      .updateOne({ _id: order_id }, { $set: { total_price } });
    res.status(200).json({
      message: "заказ создан",
    });
  } catch (e) {
    res.status(400).send(e.message);
  }
});
router.get("/my-orders", async (req, res) => {
  // 1. взять из куки session_id
  // 2. найти user_id из sessions
  // 3. select from orders where {user_id}
  try {
    const session_id = req.cookies.session_id;
    const user_id = await getUserIdBySessionId(req.db, session_id);
    if (!user_id) {
      res.status(401).send("Авторизуйтесь, чтобы посмотреть заказы");
    }
    const orders = await req.db.collection("orders").find({});
    res.status(200).json({
      message: "ваши заказы",
      orders: orders,
    });
  } catch (e) {
    res.status(400).send(e.message);
  }
});

module.exports = router;
