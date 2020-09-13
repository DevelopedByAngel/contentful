const path = require('path')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const express = require('express')
const logger = require('morgan')
const querystring = require('querystring')
const helmet = require('helmet')
require('dotenv').config({ path: 'variables.env' })
const helpers = require('./helpers')
const { translate, initializeTranslations, setFallbackLocale } = require('./i18n/i18n')
const breadcrumb = require('./lib/breadcrumb')
const { updateCookie } = require('./lib/cookies')
const settings = require('./lib/settings')
const routes = require('./routes/index')
const { getSpace, getLocales } = require('./services/contentful')
const { catchErrors } = require('./handlers/errorHandlers')
const SETTINGS_NAME = 'theExampleAppSettings'
const app = express()
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')
app.use(helmet())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser('ok'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(function (req, res, next) {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    const secureUrl = 'https://' + req.hostname + req.originalUrl
    res.redirect(302, secureUrl)
  }
  next()
})
app.use(settings)
app.use(catchErrors(async function (req, res, next) {
  res.locals.baseUrl = `${req.protocol}://${req.headers.host}`
  res.locals.locales = [{code: 'en-US', name: 'U.S. English'}]
  res.locals.currentLocale = res.locals.locales[0]
  res.locals.helpers = helpers
  const cleanQuery = helpers.cleanupQueryParameters(req.query)
  const qs = querystring.stringify(cleanQuery)
  res.locals.queryString = qs ? `?${qs}` : ''
  res.locals.queryStringSettings = res.locals.queryString
  res.locals.query = req.query
  res.locals.currentPath = req.path
  initializeTranslations()
  res.locals.translate = translate
  const apis = [
    {
      id: 'cda',
      label: translate('contentDeliveryApiLabel', res.locals.currentLocale.code)
    },
    {
      id: 'cpa',
      label: translate('contentPreviewApiLabel', res.locals.currentLocale.code)
    }
  ]
  res.locals.currentApi = apis
    .find((api) => api.id === (req.query.api || 'cda'))
  if (!res.locals.currentApi) {
    res.locals.currentApi = apis.find((api) => api.id === 'cda')
  }
  next()
}))
app.use(catchErrors(async function (req, res, next) {
  try {
    const space = await getSpace()
    const locales = await getLocales()
    // Update credentials in cookie when space connection is successful
    updateCookie(res, SETTINGS_NAME, res.locals.settings)

    // Get available locales from space
    res.locals.locales = locales
    const defaultLocale = res.locals.locales
      .find((locale) => locale.default)

    if (req.query.locale) {
      res.locals.currentLocale = space.locales
        .find((locale) => locale.code === req.query.locale)
    }

    if (!res.locals.currentLocale) {
      res.locals.currentLocale = defaultLocale
    }

    if (res.locals.currentLocale.fallbackCode) {
      setFallbackLocale(res.locals.currentLocale.fallbackCode)
    }
    helpers.updateSettingsQuery(req, res, res.locals.settings)
  } catch (error) {
    if ([401, 404].includes(error.res.status)) {
      // If we can't connect to the space, force the settings page to be shown.
      res.locals.forceSettingsRoute = true
    } else {
      throw error
    }
  }
  next()
}))

app.use(breadcrumb())
app.use('/', routes)
app.use(function (req, res, next) {
  const err = new Error(translate('errorMessage404Route', res.locals.currentLocale.code))
  err.status = 404
  next(err)
})
app.use(function (err, req, res, next) {
  res.locals.error = err
  res.locals.error.status = err.status || 500
  if (req.app.get('env') !== 'development') {
    delete err.stack
  }
  res.locals.title = 'Error'
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
