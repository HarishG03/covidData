const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const brcypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')
let db = null
const app = express()
app.use(express.json())
const initializeServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('SERVER RUNNING !!!')
    })
  } catch (e) {
    console.log(`Error Msg : '${e.message}'`)
    process.exit(-1)
  }
}
initializeServer()
const validate = async (request, response, next) => {
  const {username, password} = request.body
  console.log(username)
  const query1 = `
    SELECT * FROM user 
    WHERE username = '${username}';`
  const result1 = await db.get(query1)
  console.log(result1)
  if (result1 === undefined) {
    console.log(1)
    response.status(400)
    response.send('Invalid user')
  } else {
    console.log(password)
    console.log(result1.password)
    const passver = await brcypt.compare(password, result1.password)
    if (passver === false) {
      response.status(400)
      response.send('Invalid password')
    } else {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'HARISH')
      response.send({jwtToken: jwtToken})
      next()
    }
  }
}
//function to validate token
const check = (request, response, next) => {
  const authHeader = request.headers['authorization']
  const jwtToken = authHeader.split(' ')[1]
  jwt.verify(jwtToken, 'HARISH', async (error, payload) => {
    if (error) {
      console.log('Invalid User')
    } else {
      console.log(request.body)
      request.username = payload.username
      next()
    }
  })
}
//End//

app.post('/login/', validate, async (request, response) => {
  const {username, password} = request.body
  console.log(username)
  const query1 = `SELECT * FROM user WHERE username = '${username}';`
  const result1 = await db.get(query1)
  console.log(result1)
  response.send(result1)
})

module.exports = app

app.get('/states/', check, async (request, response) => {
  const query2 = `SELECT * FROM state`

  const result2 = await db.all(query2)
  response.send(result2)
})

app.get('/states/:stateId/', check, async (request, response) => {
  const {stateId} = request.params
  const query2 = `SELECT * FROM state WHERE state_id = ${stateId}`
  const result2 = await db.all(query2)
  response.send(result2)
})

app.post('/districts/', check, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const query4 = `INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
  VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`
  await db.run(query4)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', check, async (request, response) => {
  const {districtId} = request.params
  const query2 = `SELECT * FROM district WHERE district_id = ${districtId};`
  const result2 = await db.all(query2)
  response.send(result2)
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const query6 = `DELETE FROM district
                  WHERE district_id = ${districtId};`
  await db.run(query6)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  console.log(districtId)
  const query7 = `
  UPDATE district
  SET 
  district_name	= '${districtName}',
  state_id = ${stateId},
  cases = ${cases},
  cured = ${cured},
  active = ${active},
  deaths = ${deaths}
  WHERE district_id = ${districtId};`
  await db.run(query7)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  console.log(stateId)
  const query8 = `
  SELECT SUM(cases) AS totalCases,
  SUM(cured) AS totalCured,
  SUM(active) AS totalActive,
  SUM(deaths) AS totalDeaths
  FROM state INNER JOIN district ON state.state_id = district.state_id
  WHERE state.state_id = ${stateId};`
  const result8 = await db.get(query8)
  response.send(result8)
})

module.exports = app
