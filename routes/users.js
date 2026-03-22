var express = require("express");
var router = express.Router();
let bcrypt = require('bcrypt')
let { userPostValidation, validateResult } =
  require('../utils/validationHandler')
let { checkLogin, checkRole } = require('../utils/authHandler')
let userModel = require('../schemas/users');
let cartModel = require('../schemas/carts')
let mongoose = require('mongoose')

let userController = require("../controllers/users");


router.get("/", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  let result = await userController.getAllUser();
  res.send(result)
});

router.get("/:id", checkLogin, checkRole("ADMIN", "MODERATOR"), async function (req, res, next) {
  try {
    let result = await userController.FindByID(req.params.id)
    if (result) {
      res.send(result);
    }
    else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/", userPostValidation, validateResult,
  async function (req, res, next) {
    let session = await mongoose.startSession();
    let transaction = session.startTransaction()
    try {
      let newItem = await userController.CreateAnUser(
        req.body.username,
        req.body.password,
        req.body.email,
        req.body.role,
        "", "",
        false,
        session
      )
      let newCart = new cartModel({
        user: newItem._id
      })
      newCart = await newCart.save({ session })
      await newCart.populate('user')
      session.commitTransaction()
      session.endSession()
      res.send(newCart)
    } catch (err) {
      session.abortTransaction();
      session.endSession()
      res.status(400).send({ message: err.message });
    }
  });

router.put("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findOne({ _id: id, isDeleted: false })
    if (!updatedItem) return res.status(404).send({ message: "id not found" });
    let keys = Object.keys(req.body);
    for (const key of keys) {
      updatedItem[key] = req.body[key];
    }
    await updatedItem.save();
    let populated = await userModel
      .findById(updatedItem._id)
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});
router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;