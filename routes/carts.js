var express = require("express");
var router = express.Router();
let { checkLogin } = require('../utils/authHandler')
let cartModel = require('../schemas/carts')
let inventoryModel = require('../schemas/inventories')
router.get('/get-cart', checkLogin, async function (req, res, next) {
    let itemCart = await cartModel.findOne({
        user: req.userId
    })
    res.send(itemCart.cartItems)
})
router.post('/add-cart', checkLogin, async function (req, res, next) {
    let currentCart = await cartModel.findOne({
        user: req.userId
    })
    let { product, quantity } = req.body;
    let getProduct = await inventoryModel.find({
        product: product
    })
    if (!getProduct) {
        res.status(404).send({
            message: "product khong ton tai"
        })
        return;
    }
    let result = currentCart.cartItems.filter(
        function (e) {
            return e.product == product
        }
    )
    if (result.length == 0) {
        currentCart.cartItems.push({
            product: product,
            quantity: quantity
        })
    } else {
        result[0].quantity += quantity
    }
    await currentCart.save();
    res.send(currentCart)
})
router.post('/add-one', checkLogin, async function (req, res, next) {
    let currentCart = await cartModel.findOne({
        user: req.userId
    })
    let { product } = req.body;
    let getProduct = await inventoryModel.find({
        product: product
    })
    if (!getProduct) {
        res.status(404).send({
            message: "product khong ton tai"
        })
        return;
    }
    let result = currentCart.cartItems.filter(
        function (e) {
            return e.product == product
        }
    )
    if (result.length == 0) {
        currentCart.cartItems.push({
            product: product,
            quantity: 1
        })
    } else {
        result[0].quantity += 1
    }
    await currentCart.save();
    res.send(currentCart)
})
router.post('/reduce', checkLogin, async function (req, res, next) {
    let currentCart = await cartModel.findOne({
        user: req.userId
    })
    let { product } = req.body;
    let getProduct = await inventoryModel.find({
        product: product
    })
    if (!getProduct) {
        res.status(404).send({
            message: "product khong ton tai"
        })
        return;
    }
    let index = currentCart.cartItems.findIndex(
        function (e) {
            return e.product == product
        }
    )
    if (index >= 0) {
        currentCart.cartItems[index].quantity -= 1
    }
    if (currentCart.cartItems[index].quantity == 0) {
        currentCart.cartItems.splice(index,1);
    }
    await currentCart.save();
    res.send(currentCart)
})
router.post('/remove', checkLogin, async function (req, res, next) {
    let currentCart = await cartModel.findOne({
        user: req.userId
    })
    let { product } = req.body;
    let getProduct = await inventoryModel.find({
        product: product
    })
    if (!getProduct) {
        res.status(404).send({
            message: "product khong ton tai"
        })
        return;
    }
    let index = currentCart.cartItems.findIndex(
        function (e) {
            return e.product == product
        }
    )
    if (index >= 0) {
        currentCart.cartItems.splice(index,1);
    }
    await currentCart.save();
    res.send(currentCart)
})


module.exports = router;