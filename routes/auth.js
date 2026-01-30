const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const { nanoid } = require("nanoid");
const cookie_parser = require("cookie-parser");
const bcrypt = require("bcrypt");
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
    req.db = client.db("users"); // теперь у всех запросов в поле db - бд монго
    next();
  } catch (err) {
    next(err);
  }
});

const checkHash = async (inputPassword, storedHash) => {
  try {
    // Сравниваем введенный пароль с хешем из БД
    const isValid = await bcrypt.compare(inputPassword, storedHash);
    return isValid;
  } catch (error) {
    console.error("Ошибка при проверке пароля:", error);
    return false;
  }
};
const createHashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

router.post("/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const insertData = {};
    if (!username) {
      res.status(400).send("поле Имя должно быть заполнено");
    }
    if (!password) {
      res.status(400).send("поле Пароль должно быть заполнено");
    }
    if (!email) {
      res.status(400).send("поле Почта должно быть заполнено");
    }
    const hashPassword = await createHashPassword(password);
    insertData.username = username.trim();
    insertData.password = hashPassword;
    insertData.email = email.trim();
    await req.db.collection("users").insertOne(insertData);
    res.status(201).redirect("/?success=true");
  } catch (e) {
    res.status(400).send(e.message);
  }
});
const getIDByName = async (db, username, password) => {
  const user = await db.collection("users").findOne({ username });
  console.log("user", user);
  console.log("user password", user.password);
  const res = await checkHash(password, user.password);
  if (res) {
    console.log("пароли совпадают");
    return user._id;
  } else {
    console.log("неправильный пароль");
  }
};
const createSessionById = async (db, user_id) => {
  const session_id = nanoid();
  const insertData = {
    session_id,
    user_id,
  };
  console.log("дата для вставки: ", insertData);
  try {
    await db.collection("sessions").insertOne(insertData);
    console.log("сессия создана");
  } catch (e) {
    console.error(e);
  }
  return session_id;
};

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user_id = await getIDByName(req.db, username, password);
    const session_id = await createSessionById(req.db, user_id);
    res
      .cookie("session_id", session_id, {
        httpOnly: true,
        maxAge: 1000000,
      })
      .status(200)
      .redirect("/?success=true");
  } catch (e) {
    res.status(400).send(e.message);
  }
});

router.post("/logout", async (req, res) => {
  try {
    const session_id = req.cookies.session_id;
    console.log(session_id);
    await req.db.collection("sessions").deleteOne({ session_id });
    // очищаем куки пользователя
    res.clearCookie("session_id", {
      httpOnly: true,
      path: "/",
    });
    res.status(200).redirect("/?success=true");
  } catch (e) {
    res.status(400).send(e.message);
  }
});

module.exports = router;
