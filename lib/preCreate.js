// 主要是完成创建前的准备工作-------
const chalk = require("chalk");
const fs = require("fs-extra");
const path = require("path");
const validatePackageName = require("validate-npm-package-name");
const inquirer = require("inquirer");
const { stopSpinner, exit, clearConsole, error } = require("./utils/common");

const Creator = require("./Creator");

async function create(projectName, options) {
  // console.log(888, path);
  const cwd = options.cwd || process.cwd();
  // 是否在当前目录
  // console.log(2222, projectName);
  const inCurrent = projectName === ".";
  const name = inCurrent ? path.relative("../", cwd) : projectName;
  const targetDir = path.resolve(cwd, projectName || ".");

  // 检测文件名是否合法，如果所输入的不是合法npm包名，则退出
  const result = validatePackageName(name);
  if (!result.validForNewPackages) {
    console.error(chalk.red(`不合法的项目名: "${name}"`));
    result.errors &&
      result.errors.forEach((err) => {
        console.error(chalk.red.dim("❌ " + err));
      });
    result.warnings &&
      result.warnings.forEach((warn) => {
        console.error(chalk.red.dim("⚠️ " + warn));
      });
    exit(1);
  }

  // 检查文件夹是否存在
  if (fs.existsSync(targetDir)) {
    if (options.force) {
      await fs.remove(targetDir);
    } else {
      await clearConsole();
      if (inCurrent) {
        const { ok } = await inquirer.prompt([
          {
            name: "ok",
            type: "confirm",
            message: `Generate project in current directory?`,
          },
        ]);
        if (!ok) {
          return;
        }
      } else {
        const { action } = await inquirer.prompt([
          {
            name: "action",
            type: "list",
            message: `目标文件夹 ${chalk.cyan(targetDir)} 已经存在，请选择：`,
            choices: [
              { name: "覆盖", value: "overwrite" },
              { name: "取消", value: false },
            ],
          },
        ]);
        if (!action) {
          return;
        } else if (action === "overwrite") {
          console.log(`\nRemoving ${chalk.cyan(targetDir)}...`);
          await fs.remove(targetDir);
        }
      }
    }
  }
  await clearConsole();

  // 前面完成准备工作，正式开始创建项目
  const creator = new Creator(name, targetDir);
  await creator.create(options);
}

module.exports = (...args) => {
  return create(...args).catch((err) => {
    stopSpinner(false);
    error(err);
  });
};
