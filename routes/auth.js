var express = require('express');
var router = express.Router();
let userController = require('../controllers/users')
let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken')
let { checkLogin } = require('../utils/authHandler')
let crypto = require('crypto')
let { sendMail } = require('../utils/mailHandler')


router.post('/register', async function (req, res, next) {
  let newUser = await userController.CreateAnUser(
    req.body.username,
    req.body.password,
    req.body.email,
    '69a4f929f8d941f2dd234b88'
  )
  res.send(newUser)
});
router.post('/login', async function (req, res, next) {
  let { username, password } = req.body;
  let getUser = await userController.FindByUsername(username);
  if (!getUser) {
    res.status(404).send({
      message: "username khong ton tai hoac thong tin dang nhap sai"
    })
    return;
  }
  let result = bcrypt.compareSync(password, getUser.password);
  if (result) {
    let token = jwt.sign({
      id: getUser._id,
      exp: Date.now() + 3600 * 1000
    }, "HUTECH")
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000
    });
    res.send(token)
  } else {
    res.status(404).send({
      message: "username khong ton tai hoac thong tin dang nhap sai"
    })
  }
});
//localhost:3000
router.get('/me', checkLogin, async function (req, res, next) {
  let user = await userController.FindByID(req.userId);
  res.send(user)
});
router.post('/logout', checkLogin, function (req, res, next) {
  res.cookie('token', null, {
    maxAge: 0,
    httpOnly: true
  })
  res.send("logout")
})
router.post('/changepassword', checkLogin, async function (req, res, next) {
  let { oldPassword, newPassword } = req.body;
  let user = await userController.FindByID(req.userId);
  if (bcrypt.compareSync(oldPassword, user.password)) {
    user.password = newPassword;
  }
  await user.save();
  res.send("da cap nhat password")
})
router.post('/forgotpassword', async function (req, res, next) {
  let email = req.body.email;
  let user = await userController.FindByEmail(email);
  if (user) {
    user.forgotPasswordToken = crypto.randomBytes(31).toString('hex');
    user.forgotPasswordTokenExp = new Date(Date.now() + 10 * 60 * 1000);
    console.log(user.forgotPasswordToken);
    await user.save();
    res.send("gui mail reset pass")

    await sendMail(user.email, "http://localhost:3000/auth/resetpassword/" + user.forgotPasswordToken)
    return;
  }
  res.send("email khong ton tai")
})
router.post('/resetpassword/:token', async function (req, res, next) {
  let token = req.params.token;
  let newPassword = req.body.password;
  let getUser = await userController.FindByToken(token);
  console.log(getUser);
  if (getUser) {
    getUser.password = newPassword;
    getUser.forgotPasswordToken = '';
    getUser.forgotPasswordTokenExp = null;
    await getUser.save()
    res.send(" da cap nhat")
  } else {
    res.send("loi token")
  }
})


module.exports = router;


//mongodb
