var express = require('express');
var router = express.Router();
let productModel = require('../schemas/products')
let InventoryModel = require('../schemas/inventories')
let { ConvertTitleToSlug } = require('../utils/titleHandler')
let { getMaxID } = require('../utils/IdHandler');
const { default: mongoose } = require('mongoose');

//getall
router.get('/', async function (req, res, next) {
  // let queries = req.query;
  // let titleQ = queries.title ? queries.title : '';
  // let minPrice = queries.minPrice ? queries.minPrice : 0;
  // let maxPrice = queries.maxPrice ? queries.maxPrice : 1E6;
  // let page = queries.page ? queries.page : 1;
  // let limit = queries.limit ? queries.limit : 10;
  // console.log(queries);
  // let result = data.filter(
  //   function (e) {
  //     return (!e.isDeleted) && e.title.includes(titleQ) &&
  //       e.price >= minPrice && e.price <= maxPrice
  //   }
  // );
  // result = result.splice(limit * (page - 1), limit)
  // res.send(result);
  let products = await productModel.find({});
  res.send(products)
});
//get by ID
router.get('/:id', async function (req, res, next) {
  try {
    let result = await productModel.find({ _id: req.params.id });
    if (result.length > 0) {
      res.send(result)
    } else {
      res.status(404).send({
        message: "id not found"
      })
    }
  } catch (error) {
    res.status(404).send({
      message: "id not found"
    })
  }
});


router.post('/', async function (req, res, next) {
  let session = await mongoose.startSession();
  let transaction = session.startTransaction()
  try {
    let newItem = new productModel({
      title: req.body.title,
      slug: ConvertTitleToSlug(req.body.title),
      price: req.body.price,
      description: req.body.description,
      category: req.body.category
    })
    //replica set
    let newProduct = await newItem.save({ session });
    console.log(newProduct);
    let newInventory = new InventoryModel({
      product: newProduct._id,
      stock: 1
    })
    newInventory = await newInventory.save({ session });
    await newInventory.populate('product')
    await session.commitTransaction()
    session.endSession()
    res.send(newInventory);
  } catch (error) {
    await session.abortTransaction();
    session.endSession()
    res.send(error.message);
  }
})
router.put('/:id', async function (req, res, next) {
  let id = req.params.id;
  let updatedItem = await productModel.findByIdAndUpdate(
    id, req.body, {
    new: true
  }
  )
  res.send(updatedItem)

})
router.delete('/:id', async function (req, res, next) {
  let id = req.params.id;
  let updatedItem = await productModel.findByIdAndUpdate(
    id, {
    isDeleted: true
  }, {
    new: true
  }
  )
  res.send(updatedItem)

})

module.exports = router;
