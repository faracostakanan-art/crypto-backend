const express = require("express")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

// Route test
app.get("/", (req, res) => {
  res.send("Backend is running")
})

// Webhook Ethereum
app.post("/webhook/eth", (req, res) => {
  console.log("Webhook received:")
  console.log(JSON.stringify(req.body, null, 2))

  res.status(200).json({ status: "received" })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("Server running on port " + PORT)
})
