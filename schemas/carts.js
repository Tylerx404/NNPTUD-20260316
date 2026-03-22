let mongoose = require('mongoose')
let cartItemSchema = mongoose.Schema({
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'product',
        required: true,
        unique: true
    },
    quantity: {
        type: Number,
        min: 1,
        default: 1
    }
}, { _id: false })

let cartSchema = mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true,
        unique: true
    },
    cartItems: {
        type: [cartItemSchema],
        default: []
    }
}, { timestamps: true })
module.exports = new mongoose.model('cart', cartSchema)