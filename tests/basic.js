/**
 * @fileinfo This file checks a 'regular' game and makes sure the basic functions work
 */

const {Client:Host} = require("../index"),
  Client = require("kahoot.js-updated");

module.exports = function basicTest() {
  return new Promise((resolve, reject) => {
    console.log("[TEST] - Basic starting!");
    const host = new Host({
        autoPlay: true
      }),
      client = new Client;
    host.initialize("https://create.kahoot.it/details/space-exploration/f954d734-7b26-4519-ba99-4134b3416be1").then(() => {
      return host.start();
    }).then((pin) => {
      
    }).catch((error) => {
      reject(error);
    });
  });
};
