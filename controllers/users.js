var express = require("express");
let userModel = require("../schemas/users");
module.exports = {
    CreateAnUser: async function (username, password,
        email, role, fullName, avatarUrl, status,session
    ) {
        let newItem = new userModel({
            username: username,
            password: password,
            email: email,
            role: role,
            fullName: fullName,
            avatarUrl: avatarUrl,
            status: status

        });
        await newItem.save({session});
        return newItem;
    },
    FindByID: async function (id) {
        return await userModel
            .findOne({
                _id: id,
                isDeleted: false
            }).populate({
                path: 'role', select: 'name'
            });
    },
    FindByUsername: async function (username) {
        return await userModel.findOne(
            {
                username: username,
                isDeleted: false
            }
        )
    }, FindByEmail: async function (email) {
        return await userModel.findOne(
            {
                email: email,
                isDeleted: false
            }
        )
    },
    FindByToken: async function (token) {
        let user = await userModel.findOne(
            {
                forgotPasswordToken: token,
                isDeleted: false
            }
        )
        if (user && user.forgotPasswordTokenExp > Date.now()) {
            return user;
        }
        return undefined
    },
    getAllUser: async function () {
        let users = await userModel
            .find({ isDeleted: false }).
            populate({ path: 'role', select: 'name' })
        return users;
    }
}