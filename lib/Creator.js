// 拉取远程模版
// 询问项目创建相关配置：项目名、项目版本、操作人等
// 将拉取的模版文件拷贝到创建项目文件夹中，生成readme文档
// 安装项目所需依赖
// 创建git仓库，完成项目创建
const EventEmitter = require("events");
const chalk = require("chalk");
const execa = require("execa");
const inquirer = require("inquirer");
const loadRemotePreset = require("../lib/utils/loadRemotePreset");
const writeFileTree = require("../lib/utils/writeFileTree");
const copyFile = require("../lib/utils/copyFile");
const generateReadme = require("../lib/utils/generateReadme");
const { installDeps } = require("../lib/utils/installDeps");

const { defaults } = require("../lib/options");
const {
  error,
  logWithSpinner,
  stopSpinner,
  exit,
  clearConsole,
  log,
  hasYarn,
  hasPnpm3OrLater,
  hasGit,
  hasProjectGit,
} = require("../lib/utils/common");

module.exports = class Creator extends EventEmitter {
  constructor(name, targetDir) {
    super();

    this.name = name;
    this.targetDir = targetDir;

    this.run = this.run.bind(this);
  }

  /**
   * 入口函数
   *
   * @param {*} [cliOptions={}]
   * @param {*} [preset=null]
   */
  async create(cliOptions = {}, preset = null) {
    const { run, name, targetDir } = this;
    // 拉取远程模版preset的------------------
    if (cliOptions.preset) {
      // awesome-test create foo --preset mobx
      preset = await this.resolvePreset(cliOptions.preset, cliOptions.clone);
    } else {
      preset = await this.resolvePreset(
        defaults.presets.default,
        cliOptions.clone
      );
    }
    await clearConsole(); // 不会真的clear掉，只是起始位置变了，跟clear控制台的效果一样
    log(
      chalk.blue.bold(`Awesome-test CLI v${require("../package.json").version}`)
    );
    logWithSpinner(`✨`, `正在创建项目 ${chalk.yellow(targetDir)}.`);
    this.emit("creation", { event: "creating" });
    stopSpinner();

    // 设置文件名，版本号等---------------------------
    const { pkgVers, pkgDes } = await inquirer.prompt([
      {
        name: "pkgVers",
        message: `请输入项目版本号`,
        default: "1.0.0",
      },
      {
        name: "pkgDes",
        message: `请输入项目简介`,
        default: "project created by awesome-test-cli",
      },
    ]);

    // 将下载的临时文件（其实是整个仓库）拷贝到项目中，同时更改package.json配置---------------------------
    const pkgJson = await copyFile(preset.tmpdir, preset.targetDir);
    const pkg = Object.assign(pkgJson, {
      version: pkgVers,
      description: pkgDes,
    });
    // write package.json
    logWithSpinner("📄", `生成 ${chalk.yellow("package.json")} 等模板文件`);
    await writeFileTree(targetDir, {
      "package.json": JSON.stringify(pkg, null, 2),
    });

    // 包管理---------------------------
    const packageManager =
      (hasYarn() ? "yarn" : null) || (hasPnpm3OrLater() ? "pnpm" : "npm");
    await writeFileTree(targetDir, {
      "README.md": generateReadme(pkg, packageManager),
    });
    // git管理---------------------------
    const shouldInitGit = this.shouldInitGit(cliOptions);
    if (shouldInitGit) {
      logWithSpinner(`🗃`, `初始化Git仓库`);
      this.emit("creation", { event: "git-init" });
      await run("git init");
    }
    stopSpinner();
    log(); // 虽然没有打印东西，但是出现会空一行的现象

    // 安装依赖---------------------------
    logWithSpinner(`⚙`, `安装依赖`);
    await installDeps(targetDir, packageManager, cliOptions.registry);

    // commit initial state---------------------------
    let gitCommitFailed = false;
    if (shouldInitGit) {
      await run("git add -A");
      const msg = typeof cliOptions.git === "string" ? cliOptions.git : "init";
      try {
        await run("git", ["commit", "-m", msg]);
      } catch (e) {
        gitCommitFailed = true;
      }
    }
    stopSpinner();
    log();
    log(`🎉  项目创建成功 ${chalk.yellow(name)}.`);

    // log instructions---------------------------
    if (!cliOptions.skipGetStarted) {
      log(
        `👉  请按如下命令，开始愉快开发吧！\n\n` +
          (this.context === process.cwd()
            ? ``
            : chalk.cyan(` ${chalk.gray("$")} cd ${name}\n`)) +
          chalk.cyan(
            ` ${chalk.gray("$")} ${
              packageManager === "yarn"
                ? "yarn start"
                : packageManager === "pnpm"
                ? "pnpm run start"
                : "npm start"
            }`
          )
      );
    }
    log();
    this.emit("creation", { event: "done" });
    if (gitCommitFailed) {
      warn(
        `因您的git username或email配置不正确，无法为您初始化git commit，\n` +
          `请稍后自行git commit。\n`
      );
    }
  }

  /**
   * 执行命令
   *
   * @param {*} command
   * @param {*} args
   * @return {*}
   */
  run(command, args) {
    if (!args) {
      [command, ...args] = command.split(/\s+/);
    }
    return execa(command, args, { cwd: this.targetDir });
  }

  /**
   *
   * 拉取远程模版 preset 如默认mobx
   * @param {*} name
   * @param {*} clone
   * @return {*}
   */
  async resolvePreset(name, clone) {
    let preset;
    logWithSpinner(`Fetching remote preset ${chalk.cyan(name)}...`);
    this.emit("creation", { event: "fetch-remote-preset" });
    try {
      preset = await loadRemotePreset(name, this.targetDir, clone);
      stopSpinner();
    } catch (e) {
      stopSpinner();
      error(`Failed fetching remote preset ${chalk.cyan(name)}:`);
      throw e;
    }

    // 默认使用default参数
    if (name === "default" && !preset) {
      preset = defaults.presets.default;
    }
    if (!preset) {
      error(`preset "${name}" not found.`);
      exit(1);
    }
    return preset;
  }

  /**
   * 是否有git
   *
   * @param {*} cliOptions
   * @return {*}
   */
  shouldInitGit(cliOptions) {
    if (!hasGit()) {
      return false;
    }
    // --git
    if (cliOptions.forceGit) {
      return true;
    }
    // --no-git
    if (cliOptions.git === false || cliOptions.git === "false") {
      return false;
    }
    // default: true unless already in a git repo
    return !hasProjectGit(this.targetDir);
  }
};
