const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();

//midleWare
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ydmxw3q.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const userCollection = client.db("bistroDB").collection("users");
    const menuCollection = client.db("bistroDB").collection("menu");
    const reviewsCollection = client.db("bistroDB").collection("reviews");
    const cartCollection = client.db("bistroDB").collection("cart");
    // await client.connect();

    //NOTE - MidleWare
    const verifyToken = (req, res, next) => {
      console.log(req.headers);
      console.log(req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "FORBIDDEN" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRECT, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "FORBIDDEN" });
        }
        req.decoded = decoded;
        next();
      });
      // next();
    };

    //NOTE - JWT related API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRECT, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //NOTE -  User API

    app.get("/api/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Unauthorized" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/api/users", async (req, res) => {
      const user = req.body;
      //NOTE -  insert email if user doesn't exists
      //NOTE -  you can do this many ways (1. email unique, 2. upsert , 3. simple checking)
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      // console.log(existingUser);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/api/allUsers", verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //NOTE - User API DashBord
    app.patch("/api/makeAdminuser/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //NOTE - Menu Related API
    app.delete("/api/deleteUser/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // card collection
    app.post("/api/addTocarts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });
    app.get("/api/allCartsItem", async (req, res) => {
      const emailQuery = req.query.email;
      const query = { email: emailQuery };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/api/cartsDelete/:id", async (req, res) => {
      const idQuery = req.params.id;
      const query = { _id: new ObjectId(idQuery) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Boss IS Running");
});
app.listen(port, () => {
  console.log(`server is Running on ${port}`);
});
