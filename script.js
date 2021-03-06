const { exec } = require('child_process');
const util = require('util');
const execpromis = util.promisify(exec);

async function start() {
  try {
    await execpromis('rm -rf ./lib');
    console.log(`lib文件夹删除成功`);
    console.log(`ts 开始打包`);
    await execpromis('tsc -m commonjs');
    await execpromis('mv ./lib/src ./lib/common');
    await execpromis('tsc -m esnext');
    await execpromis('mv ./lib/src ./lib/esm');
    console.log(`ts 打包成功`);
  } catch (error) {
    console.error(`electron启动失败: ${error}`);
  }
}
start();
