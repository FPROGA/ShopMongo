const express = require("express");
const nunjucks = require("nunjucks");
require("dotenv").config();
const cookie_parser = require("cookie-parser");
const bodyParser = require("body-parser");
const { nanoid } = require("nanoid");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookie_parser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const { MongoClient, ObjectId } = require("mongodb");
const clientPromise = MongoClient.connect(process.env.DB_URI);
app.use(async (req, res, next) => {
  try {
    const client = await clientPromise;
    req.db = client.db("users");
    next();
  } catch (err) {
    next(err);
  }
});
nunjucks.configure("views", { express: app });
app.set("view engine", "njk");

// Подключи твои роуты
app.use("/api/orders", require("./routes/orders"));
app.use("/api/products", require("./routes/products"));
app.use("/api/users", require("./routes/auth"));

const getUserIdBySessionId = async (db, session_id) => {
  const session = await db.collection("sessions").findOne({ session_id });
  if (!session) {
    console.log("Сессия не найдена:", session_id);
    return null;
  }
  return session.user_id;
};
const requireAuth =
  (required = true) =>
  async (req, res, next) => {
    const session_id = req.cookies.session_id;
    if (!session_id && required) {
      return res.redirect("/?authError=true");
    }
    if (session_id) {
      const user_id = await getUserIdBySessionId(req.db, session_id);
      if (user_id) {
        const user = await req.db.collection("users").findOne({ _id: user_id });
        req.user = user;
      }
    }
    next();
  };

// 🔥 HTML РОУТЫ (добавь эти!)
app.get("/", requireAuth(false), async (req, res) => {
  const products = await req.db.collection("products").find().toArray();
  res.render("index", {
    products, // ← Данные для {{ product.name }}
    user: req.user, // ← Данные для {% if user %}
    authError: req.query.authError === "true",
    success: req.query.success === "true",
  });
});

app.get("/catalog", requireAuth(false), async (req, res) => {
  const products = await req.db.collection("products").find().toArray();
  res.render("catalog", { products, user: req.user });
});

app.get("/profile", requireAuth(true), async (req, res) => {
  const session_id = req.cookies.session_id;
  const user_id = await getUserIdBySessionId(req.db, session_id);
  const user = await req.db
    .collection("users")
    .findOne({ _id: new ObjectId(user_id) });
  const orders = await req.db.collection("orders").find({ user_id }).toArray();
  if (!orders) {
    console.log("заказов пока нет");
  }
  res.render("profile", { user, orders });
});
app.get("/login", (req, res) => {
  res.render("login", {
    authError: req.query.authError === "true",
  });
});
app.get("/register", (req, res) => {
  res.render("register", {
    authError: req.query.authError === "true",
  });
});
// Запуск
app.listen(3000, () => console.log("🚀 http://localhost:3000/"));
