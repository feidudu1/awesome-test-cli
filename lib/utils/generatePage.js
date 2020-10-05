const chalk = require("chalk");
const path = require("path");
const fs = require("fs-extra");
const nunjucks = require("nunjucks");

const tempPath = path.resolve(__dirname, "../../temp");
const pageTempPath = path.resolve(tempPath, "page.js");
const lessTempPath = path.resolve(tempPath, "page.less");
const ioTempPath = path.resolve(tempPath, "io.js");
const storeTempPath = path.resolve(tempPath, "store.js");

const { log, error, logWithSpinner, stopSpinner } = require("./common");

module.exports = (pagePath, nameObj) => {
  Promise.all([
    generateIo(pagePath, nameObj),
    generatePage(pagePath, nameObj),
    generateStore(pagePath, nameObj),
    generateLess(pagePath, nameObj),
  ]).catch((err) => {
    stopSpinner(false);
    error(err);
  });
};

async function generateIo(pagePath, { lowerName, upperName }) {
  logWithSpinner(`生成 ${chalk.yellow(`${upperName}/io.js`)}`);
  const ioTemp = await fs.readFile(ioTempPath);
  const ioContent = nunjucks.renderString(ioTemp.toString(), {
    lowerName,
    upperName,
  });
  await fs.writeFile(path.resolve(pagePath, `./io.js`), ioContent, {
    flag: "a",
  });
  stopSpinner();
}

async function generatePage(context, { lowerName, upperName }) {
  logWithSpinner(`生成 ${chalk.yellow(`${upperName}/${upperName}.js`)}`);
  const ioTemp = await fs.readFile(pageTempPath);
  const ioContent = nunjucks.renderString(ioTemp.toString(), {
    lowerName,
    upperName,
  });
  await fs.writeFile(path.resolve(context, `./${upperName}.js`), ioContent, {
    flag: "a",
  });
  stopSpinner();
}

async function generateStore(context, { lowerName, upperName }) {
  logWithSpinner(`生成 ${chalk.yellow(`${upperName}/store-${lowerName}.js`)}`);
  const ioTemp = await fs.readFile(storeTempPath);
  const ioContent = nunjucks.renderString(ioTemp.toString(), {
    lowerName,
    upperName,
  });
  await fs.writeFile(
    path.resolve(context, `./store-${lowerName}.js`),
    ioContent,
    { flag: "a" }
  );
  stopSpinner();
}

async function generateLess(context, { lowerName, upperName }) {
  logWithSpinner(`生成 ${chalk.yellow(`${upperName}/${upperName}.less`)}`);
  const ioTemp = await fs.readFile(lessTempPath);
  const ioContent = nunjucks.renderString(ioTemp.toString(), {
    lowerName,
    upperName,
  });
  await fs.writeFile(path.resolve(context, `./${upperName}.less`), ioContent, {
    flag: "a",
  });
  stopSpinner();
}
