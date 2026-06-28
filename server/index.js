import dotenv from 'dotenv'
import app from './app.js'

dotenv.config({ path: '.env.server' })

const port = Number(process.env.API_PORT || 8787)

app.listen(port, () => {
  console.log(`API local: http://localhost:${port}`)
})
