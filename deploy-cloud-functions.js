/**
 * 云函数部署脚本
 *
 * 使用方法：
 * 1. 确保微信开发者工具已打开并登录
 * 2. 运行：node deploy-cloud-functions.js
 *
 * 注意：此脚本使用 HTTP API 与微信开发者工具通信
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const IDE_PORT = 16792;
const PROJECT_PATH = '/Users/xu/Documents/SRC_wechat';
const CLOUD_FUNCTIONS = ['test-user', 'test-data'];

async function uploadCloudFunction(name) {
  const funcPath = path.join(PROJECT_PATH, 'cloudfunctions', name);

  console.log(`\n📦 准备上传云函数：${name}`);

  // 检查云函数目录是否存在
  if (!fs.existsSync(funcPath)) {
    console.error(`❌ 云函数目录不存在：${funcPath}`);
    return false;
  }

  // 读取必要的文件
  const packageJson = JSON.parse(fs.readFileSync(path.join(funcPath, 'package.json'), 'utf-8'));
  const projectConfig = JSON.parse(fs.readFileSync(path.join(funcPath, 'project.config.json'), 'utf-8'));

  console.log(`   云函数名称：${name}`);
  console.log(`   云环境：${projectConfig.cloud.env}`);

  // 构造上传请求
  const requestData = {
    method: 'POST',
    hostname: '127.0.0.1',
    port: IDE_PORT,
    path: '/upload',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve) => {
    const req = http.request(requestData, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0) {
            console.log(`✅ 上传成功：${name}`);
            resolve(true);
          } else {
            console.error(`❌ 上传失败：${result.message}`);
            resolve(false);
          }
        } catch (e) {
          console.error(`❌ 解析响应失败：${e.message}`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ 请求失败：${e.message}`);
      console.error(`\n💡 请确保:`);
      console.error(`   1. 微信开发者工具已打开`);
      console.error(`   2. 已登录微信开发者账号`);
      console.error(`   3. 已在开发者工具中选择了云环境`);
      resolve(false);
    });

    req.write(JSON.stringify({
      project: PROJECT_PATH,
      version: '1.0.0',
      desc: `${name} cloud function`,
      path: `cloudfunctions/${name}`,
    }));

    req.end();
  });
}

async function main() {
  console.log('🚀 云函数部署脚本');
  console.log('================');

  // 检查 IDE 是否运行
  const checkIde = () => {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${IDE_PORT}/heartbeat`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(2000);
    });
  };

  console.log('检查微信开发者工具...');
  const ideRunning = await checkIde();

  if (!ideRunning) {
    console.error('❌ 微信开发者工具未运行或未启动 HTTP 服务');
    console.error('\n💡 请先:');
    console.error('   1. 打开微信开发者工具');
    console.error('   2. 加载本项目');
    console.error('   3. 在工具栏选择云环境：cloud1-2gyhe7s5efa4155f');
    process.exit(1);
  }

  console.log('✅ 微信开发者工具已运行');

  // 上传所有云函数
  for (const name of CLOUD_FUNCTIONS) {
    const success = await uploadCloudFunction(name);
    if (!success) {
      console.error(`\n⚠️  云函数 ${name} 上传失败，继续下一个...`);
    }
  }

  console.log('\n================');
  console.log('📝 部署完成！');
  console.log('\n💡 如果上传失败，请在微信开发者工具中手动上传:');
  console.log('   1. 在左侧文件树展开 cloudfunctions 目录');
  console.log('   2. 右键点击云函数文件夹');
  console.log('   3. 选择 "上传并部署：云端安装依赖"');
}

main();
