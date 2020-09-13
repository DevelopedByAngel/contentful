
const { createClient } = require('contentful')

let deliveryClient = null
let previewClient = null
module.exports.initClients = (options) => {
  // console.log('ok',process.env.CONTENTFUL_SPACE_ID)
  const { version } = require('../package.json')
  const applicationName = `the-example-app.nodejs/${version}`
  const config = options || {
    spaceId: 'qyeqayt83y8d',
    deliveryToken: '56O9hr6m8OWunW8p07SSjvmOKpBdZL3ozMOUdK9dEgc',
    previewToken: '3jaeVVt_-50ViAaqOXFFnSA8omv0QqZ5CCnL6PsfoRY'
  }
  deliveryClient = createClient({
    application: applicationName,
    space: config.spaceId,
    accessToken: config.deliveryToken,
    removeUnresolved: true
  })
  previewClient = createClient({
    application: applicationName,
    space: config.spaceId,
    accessToken: config.previewToken,
    removeUnresolved: true
  })

}

module.exports.getSpace = throwOnEmptyResult('Space', (api = 'cda') => {
  return getClient(api).getSpace()
})


module.exports.getLocales = throwOnEmptyResult('Environment', (api = 'cda') => {
  return getClient(api).getLocales()
    .then((response) =>response.items)
})

module.exports.getEntry = throwOnEmptyResult('Entry', (entryId, contentType, api = 'cda') => {
  return getClient(api).getEntries({content_type: contentType, 'sys.id': entryId})
    .then((response) => console.log(response.items[0]))
})
module.exports.getCourses = throwOnEmptyResult('course', (locale = 'en-US', api = 'cda') => {
  return getClient(api).getEntries({
    content_type: 'course',
    locale,
    order: '-sys.createdAt',
    include: 1 
  })
    .then((response) => response.items)
})
module.exports.getLandingPage = (slug, locale = 'en-US', api = 'cda') => {
  return getClient(api).getEntries({
    content_type: 'layout',
    locale,
    'fields.slug': slug,
    include: 3
  })
    .then((response) => response.items[0])
}
module.exports.getCourse = throwOnEmptyResult('Course', (slug, locale = 'en-US', api = 'cda') => {
  return getClient(api).getEntries({
    content_type: 'course',
    'fields.slug': slug,
    locale,
    include: 2
  })
    .then((response) => response.items[0])
})

module.exports.getCategories = throwOnEmptyResult('Course', (locale = 'en-US', api = 'cda') => {
  return getClient(api).getEntries({content_type: 'category', locale})
    .then((response) => response.items)
})
module.exports.getCoursesByCategory = throwOnEmptyResult('Category', (category, locale = 'en-US', api = 'cda') => {
  return getClient(api).getEntries({
    content_type: 'course',
    'fields.categories.sys.id': category,
    locale,
    order: '-sys.createdAt',
    include: 1
  })
    .then((response) => response.items)
})
function getClient (api = 'cda') {
  return api === 'cda' ? deliveryClient : previewClient
}
function throwOnEmptyResult (context, fn) {
  return function (...params)
   {
    return fn(...params)
      .then((data) => {
        if (!data) {
          var err = new Error(`${context} Not Found`)
          err.status = 404
          throw err
        }
        return data
      })
  }
}
