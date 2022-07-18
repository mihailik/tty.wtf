// @ts-check

module.exports = handleRequest;

/** @typedef {{
 *  log(...args: any[]): void;
 * }} Context
 */

/** @typedef {{
 *  query: {
 *    name: string;
 *  }
 *  body: any;
 * }} Request
 */

/** @typedef {{
 *  body: string | Buffer;
 * }} Response
 */

/**
 * @param {Context} context
 * @param {Request} req
 * @returns {Promise<Response>}
 */
async function handleRequest(context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');

  const name = (req.query.name || (req.body && req.body.name));
  const responseMessage = name
    ? "Hello, " + name + ". This HTTP triggered function executed successfully."
    : "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.";

  return {
    // status: 200, /* Defaults to 200 */
    body: responseMessage
  };
}

