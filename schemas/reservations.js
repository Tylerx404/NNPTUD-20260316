let mongoose = require('mongoose')
let reservationItems = mongoose.Schema({
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
    },
    title: {
        type: String
    },
    price: {
        type: Number
    },
    subtotal: {
        type: Number
    }
})
let reservationSchema = mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: {
        type: [reservationItems],
        default: []
    },
    amount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["actived", "expired", "cancelled", "paid"],
        default: "actived"
    },
    expiredIn: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
})
module.exports = mongoose.model('reservation',reservationSchema)
