const User = require('../models/user')
const jwt = require('jsonwebtoken')

const createToken = (_id) => {
    return jwt.sign({_id}, process.env.SECRET, { expiresIn: '1h'})
}

//signup
const signupUser = async (req, res) => {
    const {email,password} = req.body

    try {
        const user = await User.signup(email, password)

        //create a token
        const token = createToken(user._id)

        res.status(200).json({email, token})
    } catch (err) {
        res.status(400).json({error: err.message})
    }
}

//login
const loginUser = async (req, res) => {
    const {email,password} = req.body

    try {
        const user = await User.login(email, password)

        //create a token
        const token = createToken(user._id)
        const wow = jwt.verify(token, process.env.SECRET)
        console.log(wow)

        res.status(200).json({email, token})
    } catch (err) {
        res.status(400).json({error: err.message})
    }
}

module.exports = {signupUser, loginUser}