let { body, validationResult } = require('express-validator')
let util = require('util')
let options = {
    password: {
        minLength: 8,
        minLowercase: 1,
        minSymbols: 1,
        minUppercase: 1,
        minNumbers: 1
    }
}
module.exports = {
    userPostValidation: [
        body('email').notEmpty().withMessage("email khong duoc de trong")
        .bail().isEmail().withMessage("khong phai email"),
        body('password').notEmpty().withMessage("password khong duoc de trong")
        .bail().isStrongPassword(options.password)
            .withMessage(
                util.format(
                    "password phai co it nhat %d ki tu, trong do it nhat %d ki tu so",
                    options.password.minLength, options.password.minNumbers
                )
            ),
        body('avatarUrl').optional().isURL().withMessage("avatarUrl phai la URL")

    ],
    validateResult: function (req, res, next) {
        console.log("result");
        let result = validationResult(req);
        if (result.errors.length > 0) {
            res.status(400).send({ message: result.errors });
            return;
        }
        next();
    }
}