var express = require('express');
var router = express.Router();
let mongoose = require('mongoose');
let reservationModel = require('../schemas/reservations');
let cartModel = require('../schemas/carts');
let inventoryModel = require('../schemas/inventories');
let { checkLogin } = require('../utils/authHandler');

const RESERVATION_EXPIRE_MS = 30 * 60 * 1000;

function normalizeRequestedItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('danh sach san pham khong hop le');
  }

  let groupedItems = new Map();

  for (let item of rawItems) {
    if (!item || !item.product) {
      throw new Error('thieu product');
    }

    let quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('quantity khong hop le');
    }

    let productId = item.product.toString();
    let currentQuantity = groupedItems.get(productId) || 0;
    groupedItems.set(productId, currentQuantity + quantity);
  }

  return Array.from(groupedItems.entries()).map(function ([product, quantity]) {
    return {
      product: product,
      quantity: quantity
    };
  });
}

async function buildReservationData(rawItems, session) {
  let normalizedItems = normalizeRequestedItems(rawItems);
  let productIds = normalizedItems.map(function (item) {
    return item.product;
  });

  let inventories = await inventoryModel
    .find({
      product: {
        $in: productIds
      }
    })
    .populate('product')
    .session(session);

  if (inventories.length !== productIds.length) {
    throw new Error('mot hoac nhieu san pham khong ton tai');
  }

  let inventoryMap = new Map(
    inventories.map(function (inventory) {
      return [inventory.product._id.toString(), inventory];
    })
  );

  let reservationItems = [];
  let amount = 0;

  for (let item of normalizedItems) {
    let inventory = inventoryMap.get(item.product);

    if (!inventory || !inventory.product || inventory.product.isDeleted) {
      throw new Error('san pham khong ton tai');
    }

    let availableStock = inventory.stock - inventory.reserved;
    if (availableStock < item.quantity) {
      throw new Error('san pham khong du so luong trong kho');
    }

    let subtotal = inventory.product.price * item.quantity;
    reservationItems.push({
      product: inventory.product._id,
      quantity: item.quantity,
      title: inventory.product.title,
      price: inventory.product.price,
      subtotal: subtotal
    });
    amount += subtotal;
  }

  return {
    reservationItems: reservationItems,
    amount: amount,
    inventories: inventories
  };
}

router.get('/', checkLogin, async function (req, res, next) {
  try {
    let reservations = await reservationModel
      .find({
        user: req.userId
      })
      .sort({ createdAt: -1 })
      .populate('items.product');

    res.send(reservations);
  } catch (error) {
    res.status(400).send({
      message: error.message
    });
  }
});

router.get('/:id', checkLogin, async function (req, res, next) {
  try {
    let reservation = await reservationModel
      .findOne({
        _id: req.params.id,
        user: req.userId
      })
      .populate('items.product');

    if (!reservation) {
      return res.status(404).send({
        message: 'reservation khong ton tai'
      });
    }

    res.send(reservation);
  } catch (error) {
    res.status(404).send({
      message: 'reservation khong ton tai'
    });
  }
});

router.post('/reserveACart', checkLogin, async function (req, res, next) {
  let session = await mongoose.startSession();
  try {
    session.startTransaction();
    let currentCart = await cartModel.findOne({
      user: req.userId
    }).session(session);

    if (!currentCart || currentCart.cartItems.length === 0) {
      throw new Error('gio hang trong');
    }

    let reservationData = await buildReservationData(currentCart.cartItems, session);

    for (let inventory of reservationData.inventories) {
      let reservedItem = reservationData.reservationItems.find(function (item) {
        return item.product.toString() === inventory.product._id.toString();
      });

      inventory.reserved += reservedItem.quantity;
      await inventory.save({ session: session });
    }

    let newReservation = new reservationModel({
      user: req.userId,
      items: reservationData.reservationItems,
      amount: reservationData.amount,
      expiredIn: new Date(Date.now() + RESERVATION_EXPIRE_MS)
    });

    await newReservation.save({ session: session });
    currentCart.cartItems = [];
    await currentCart.save({ session: session });

    await session.commitTransaction();

    let populatedReservation = await reservationModel
      .findById(newReservation._id)
      .populate('items.product');

    res.send(populatedReservation);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    res.status(400).send({
      message: error.message
    });
  } finally {
    session.endSession();
  }
});

router.post('/reserveItems', checkLogin, async function (req, res, next) {
  let session = await mongoose.startSession();
  try {
    session.startTransaction();
    let rawItems = req.body.items;
    if (!rawItems && Array.isArray(req.body)) {
      rawItems = req.body;
    }

    let reservationData = await buildReservationData(rawItems, session);

    for (let inventory of reservationData.inventories) {
      let reservedItem = reservationData.reservationItems.find(function (item) {
        return item.product.toString() === inventory.product._id.toString();
      });

      inventory.reserved += reservedItem.quantity;
      await inventory.save({ session: session });
    }

    let newReservation = new reservationModel({
      user: req.userId,
      items: reservationData.reservationItems,
      amount: reservationData.amount,
      expiredIn: new Date(Date.now() + RESERVATION_EXPIRE_MS)
    });

    await newReservation.save({ session: session });
    await session.commitTransaction();

    let populatedReservation = await reservationModel
      .findById(newReservation._id)
      .populate('items.product');

    res.send(populatedReservation);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    res.status(400).send({
      message: error.message
    });
  } finally {
    session.endSession();
  }
});

router.post('/cancelReserve/:id', checkLogin, async function (req, res, next) {
  try {
    let reservation = await reservationModel.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!reservation) {
      return res.status(404).send({
        message: 'reservation khong ton tai'
      });
    }

    if (reservation.status !== 'actived') {
      return res.status(400).send({
        message: 'reservation khong the huy'
      });
    }

    let productIds = reservation.items.map(function (item) {
      return item.product;
    });
    let inventories = await inventoryModel.find({
      product: {
        $in: productIds
      }
    });
    let inventoryMap = new Map(
      inventories.map(function (inventory) {
        return [inventory.product.toString(), inventory];
      })
    );

    for (let item of reservation.items) {
      let inventory = inventoryMap.get(item.product.toString());

      if (!inventory) {
        return res.status(400).send({
          message: 'khong tim thay ton kho de huy reservation'
        });
      }

      if (inventory.reserved < item.quantity) {
        return res.status(400).send({
          message: 'du lieu ton kho khong hop le'
        });
      }
    }

    for (let item of reservation.items) {
      let inventory = inventoryMap.get(item.product.toString());
      inventory.reserved -= item.quantity;
      await inventory.save();
    }

    reservation.status = 'cancelled';
    await reservation.save();

    let populatedReservation = await reservationModel
      .findById(reservation._id)
      .populate('items.product');

    res.send(populatedReservation);
  } catch (error) {
    res.status(400).send({
      message: error.message
    });
  }
});

module.exports = router;
