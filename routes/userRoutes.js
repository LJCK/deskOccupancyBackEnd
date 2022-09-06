const express = require('express')

const router = express.Router()

const { signupUser, loginUser } = require('../controllers/userController')

//signup
router.post('/login', loginUser)

//login
router.post('/signup', signupUser)

module.exports = router