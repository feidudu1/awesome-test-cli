const chalk = require("chalk");
const EventEmitter = require("events");
const fs = require("fs-extra");

const generatePage = require("./utils/generatePage");

const {
  log,
  error,
  logWithSpinner,
  clearConsole,
  stopSpinner,
  exit,
} = require("../lib/utils/common");

module.exports = class PageCreator extends EventEmitter {
  constructor(name, pagePath) {
    super();

    this.name = name;
    this.pagePath = pagePath;
  }

  async create(cliOptions = {}) {
    const fileNameObj = this.getName();
    const { pagePath } = this;
    await clearConsole();
    log(
      chalk.blue.bold(`Awesome-test CLI v${require("../package.json").version}`)
    );
    logWithSpinner(`✨`, `正在创建页面...`);
    // 创建文件夹
    await fs.mkdir(pagePath, { recursive: true });
    this.emit("creation", { event: "creating" });

    stopSpinner();

    console.log(pagePath);
    await generatePage(pagePath, fileNameObj);
  }

  getName() {
    const originName = this.name;
    const tailName = originName.slice(1);
    const upperName = originName.charAt(0).toUpperCase() + tailName;
    const lowerName = originName.charAt(0).toLowerCase() + tailName;
    return {
      upperName,
      lowerName,
    };
  }
};
