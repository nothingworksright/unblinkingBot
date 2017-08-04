#!/usr/bin/env node

'use strict'

/**
 * Message functions for the unblinkingBot.
 * @author jmg1138 {@link https://github.com/jmg1138 jmg1138}
 * @see {@link http://unblinkingbot.com/ unblinkingBot.com}
 */

/**
 * 3rd party modules that will be used.
 * @see {@link https://github.com/request/request request}
 */
const request = require('request')

/**
 * Local functions that will be used.
 */
const getValuesByKeyPrefix = require('./datastore.js').getValuesByKeyPrefix

/**
 * Inbox for new messages from the Slack RTM Client RTM_EVENTS.MESSAGE event.
 * Verify that the message includes text, and it was not posted from the bot's * own user ID, then see if the text includes any magic words.
 * @param {Object} bundle The main bundle of shared references.
 * @param {Object} message A message object from the Slack RTM_EVENTS.MESSAGE.
 */
function inbox (bundle, message) {
  return new Promise(resolve => {
    let botUser = bundle.rtm.activeUserId
    if (
      message.text !== undefined && // The message does have some text.
      message.user !== botUser // The message is not from this bot user.
    ) {
      findMagicWords(bundle, message)
    }
    resolve()
  })
}
exports.inbox = inbox

/**
 * Look for the magic word(s) in a message text, using the bot's ID, name, the
 * word 'bot', or the word 'get' as the magic words.
 */
function findMagicWords (bundle, message) {
  return new Promise(resolve => {
    let botId = bundle.rtm.activeUserId
    let botName = bundle.rtm.dataStore.getUserById(botId).name
    if (
      new RegExp(botId, 'g').test(message.text) ||
      new RegExp(botName, 'gi').test(message.text) ||
      new RegExp('bot', 'gi').test(message.text) ||
      new RegExp('get', 'gi').test(message.text)
    ) {
      findCommandWords(bundle, message)
    }
    resolve()
  })
}

/**
 *
 */
function findCommandWords (bundle, message) {
  return new Promise(resolve => {
    let botId = bundle.rtm.activeUserId
    let botName = bundle.rtm.dataStore.getUserById(botId).name
    if (
      /snapshot list/gi.test(message.text) ||
      /camera list/gi.test(message.text)
    ) { // Request for the snapshot list
      getSnapshotList(bundle, message)
    } else if (/snapshot/gi.test(message.text)) { // Request snapshot, not list
      getSnapshot(bundle, message)
    } else if (
      new RegExp(botId, 'g').test(message.text) ||
      new RegExp(botName, 'gi').test(message.text) ||
      new RegExp('bot', 'gi').test(message.text)
    ) { // Mentioned bot's name, but no known request was made.
      thatsMyName(bundle, message)
    }
    resolve()
  })
}

/**
 *
 */
function getSnapshotList (bundle, message) {
  return new Promise(resolve => {
    getValuesByKeyPrefix(bundle, 'motion::snapshot::')
      .then(snapshots => {
        let names = []
        names.push('Here are the snapshot names that you requested:')
        Object.keys(snapshots).forEach(key => {
          let name = snapshots[key].name
          names.push('• ' + name)
        })
        return names
      })
      .then(names => {
        return bundle.web.chat.postMessage(
          message.channel,
          names.join('\n'), {
            'as_user': true,
            'parse': 'full'
          }
        )
      })
      .then(res => {
        // console.log(`Got a response after giving the snapshot names list.`);
      })
    resolve()
  })
}

/**
 *
 */
function getSnapshot (bundle, message) {
  return new Promise(resolve => {
    getValuesByKeyPrefix(bundle, 'motion::snapshot::')
      .then(snapshots => {
        let names = {}
        Object.keys(snapshots).forEach(key => {
          names[key] = snapshots[key]
        })
        return names
      })
      .then(names => {
        let matchingNames = {}
        Object.keys(names).forEach(key => {
          if (new RegExp(names[key].name, 'gi').test(message.text)) {
            matchingNames[key] = names[key]
          }
        })
        return matchingNames
      })
      .then(matchingNames => {
        if (Object.keys(matchingNames).length === 0) { // No names were found :(
          bundle.web.chat.postMessage(
            message.channel,
            'Did you want a snapshot? If so, next time ask for one that exists. (hint: ask for the snapshot list)', {
              'as_user': true,
              'parse': 'full'
            }
          )
        } else { // Some names were found!
          Object.keys(matchingNames).forEach(key => {
            bundle.web.files.upload(`snapshot_${matchingNames[key].name}_${new Date().getTime()}.jpg`, {
              'file': request(matchingNames[key].url),
              'filename': `snapshot_${matchingNames[key].name}_${new Date().getTime()}.jpg`,
              'title': `Snapshot of ${matchingNames[key].name}`,
              'channels': message.channel,
              'initial_comment': `Here's that picture of the ${matchingNames[key].name} that you wanted.`
            })
              .then(res => {
                // console.log(`Got a res from the file upload to Slack`);
              })
              .catch(err => console.log(err.message))
          })
        }
      })
      .catch(err => console.log(err.message))
    resolve()
  })
}

/**
 *
 */
function thatsMyName (bundle, message) {
  return new Promise(resolve => {
    let user = bundle.rtm.dataStore.getUserById(message.user).name
    bundle.web.chat.postMessage(
      message.channel,
      `That's my name @${user}, don't wear it out!`, {
        'as_user': true,
        'parse': 'full'
      }
    )
    resolve()
  })
}
