const PORT = process.env.jfPORT || 3005

const ejs = require('ejs')
const cors = require('cors')
const path = require('path').resolve()
const chalk = require('chalk')
const express = require('express')
const cheerio = require('cheerio')
const superagent = require('superagent')

const app = express()
app.use(cors())

app.get('/', (_req, res) => res.sendFile(path + '/proc/todayRedirect.html'))
app.get('/view/:year/:month/:date', (req, res) => {
  const { year, month, date } = req.params
  const requestDate = new Date()
  requestDate.setFullYear(year)
  requestDate.setMonth(month - 1)
  requestDate.setDate(date)
  const previousDate = new Date(requestDate)
  previousDate.setDate(previousDate.getDate() - 1)
  const nextDate = new Date(requestDate)
  nextDate.setDate(nextDate.getDate() + 1)
  const day = ['일', '월', '화', '수', '목', '금', '토'][requestDate.getDay()]

  crowl(year, month, date, (err, data) => {
    if (err) console.error(err)
    else {
      ejs.renderFile(path + '/view/view.ejs', { ...req.params, ...data, day, previousDate, nextDate }, (err, str) => {
        if (err) console.log(chalk.red(err))
        else res.send(str)
      })
    }
  })
})

app.get('/api/food/:year/:month/:date', (req, res) => {
  const { year, month, date } = req.params
  crowl(year, month, date, (err, data) => {
    if (err) console.error(err)
    else res.send(data)
  })
})

app.listen(PORT, () => {
  console.log(chalk.bgYellow.black('Janggok Foods Server is now running on http://localhost:') + chalk.bgYellow.black.bold(PORT))
})

function crowl (year, month, date, cb) {
  const obj = { query: { year, month, date }, result: {} }
  superagent.get('http://school.gyo6.net/janggok/food/' + [year, month, date].join('/') + '/lunch', (err, sres) => {
    if (err) {
      cb(err)
    } else {
      const $ = cheerio.load(sres.text)

      /*
        Rules of http://school.gyo6.net/janggok/food/.. (Discoverd by SWAG Team)

        There is a Table that has data of lunch
        location: html>body>form>div.tableTy2>table

        Content of 1st <td>: Year, Month, Date of Query
        Content of 2nd <td>: Total kcal of lunch menu, Syntax: nKcal
        Content of 3rd <td>: <div> tag that has menu split by <br>
        Content of 4th <td>: <div> tag that has wonsanzi of lunch menu split by <br>
        Content of 5th <td>: <a> tag that has <img> of lunch menu
      */
      const kcal = parseFloat($('td')[1].children[0].data.normalize().replace('Kcal', ''))
      const menu = []
      $('td')[2].children[1].children.forEach((e, i) => {
        if (e.type === 'text') {
          menu[menu.length] = e.data.normalize()
        }
      })

      const wonsanzi = {}
      $('td')[3].children[1].children.forEach((e, i) => {
        if (e.type === 'text') {
          const arr = e.data.normalize().split(' : ')
          wonsanzi[arr[0]] = arr[1]
        }
      })

      obj.result = { kcal, menu, wonsanzi }
      const sendData = JSON.stringify(obj)
        .split('\\n').join('')
        .split('\\t').join('')

      cb(null, JSON.parse(sendData))
    }
  })
}
